import asyncio
import io
import uuid
from pathlib import Path
from typing import Literal

from PIL import Image, ImageOps
from pydantic import BaseModel

from app.errors import ApiError
from app.models import User

# The preset artwork ships with the web app, which maps each key to a file.
PRESETS = tuple(f"moon-{n}" for n in range(1, 9))

MAX_BYTES = 2 * 1024 * 1024
# Refuses decompression bombs before the pixels are decoded.
MAX_PIXELS = 12_000_000
SIZE = 256
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


def _encode(data: bytes) -> bytes:
    try:
        opened = Image.open(io.BytesIO(data))
        if opened.format not in ALLOWED_FORMATS:
            raise ApiError(415, "avatar_type", "Use a PNG, JPEG or WebP image")
        if opened.width * opened.height > MAX_PIXELS:
            raise ApiError(413, "avatar_dimensions", "The image is too large")
        opened.load()
    except ApiError:
        raise
    except Exception as exc:  # Pillow raises many kinds of errors for corrupt files
        raise ApiError(415, "avatar_type", "Use a PNG, JPEG or WebP image") from exc
    try:
        image = ImageOps.exif_transpose(opened)
        image = ImageOps.fit(image.convert("RGBA"), (SIZE, SIZE), Image.Resampling.LANCZOS)
        # Re-encoding drops metadata and anything that is not pixels.
        out = io.BytesIO()
        image.save(out, "WEBP", quality=85)
    except Exception as exc:
        raise ApiError(415, "avatar_type", "Use a PNG, JPEG or WebP image") from exc
    return out.getvalue()


async def encode_avatar(data: bytes) -> bytes:
    return await asyncio.to_thread(_encode, data)


def avatar_path(directory: str, user_id: uuid.UUID) -> Path:
    return Path(directory) / f"{user_id}.webp"


def save_avatar(directory: str, user_id: uuid.UUID, data: bytes) -> None:
    path = avatar_path(directory, user_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f"{path.stem}.{uuid.uuid4().hex}.tmp")
    temp.write_bytes(data)
    temp.replace(path)  # readers never see a half-written file


def delete_avatar(directory: str, user_id: uuid.UUID) -> None:
    avatar_path(directory, user_id).unlink(missing_ok=True)


class AvatarOut(BaseModel):
    # "upload" is served by GET /users/{id}/avatar?v={version}; "preset" is web artwork named by
    # `preset`; "mal" is `url`; "none" means show the user's initial.
    kind: Literal["upload", "preset", "mal", "none"]
    preset: str | None = None
    version: int = 0
    url: str | None = None


def avatar_out(user: User, mal_picture: str | None = None) -> AvatarOut:
    if user.avatar_uploaded:
        return AvatarOut(kind="upload", version=user.avatar_version)
    if user.avatar_preset:
        return AvatarOut(kind="preset", preset=user.avatar_preset)
    if mal_picture:
        return AvatarOut(kind="mal", url=mal_picture)
    return AvatarOut(kind="none")
