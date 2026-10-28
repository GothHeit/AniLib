"""The converted local library: how `python -m app.library ingest` lays it out on disk, and
how the `local` video source reads it back.

    <root>/<mal id>/<sub|dub>/title.json            name shown in the source menu
    <root>/<mal id>/<sub|dub>/fonts/                 fonts embedded in the original files
    <root>/<mal id>/<sub|dub>/fonts.json             font name (lower case) -> file in fonts/
    <root>/<mal id>/<sub|dub>/<episode>/master.m3u8  HLS master, one variant per folder
    <root>/<mal id>/<sub|dub>/<episode>/episode.json subtitles, skips; written last

An episode folder only counts once its episode.json exists, so a conversion that was cut off
never shows up as playable.
"""

import json
from pathlib import Path
from typing import Any

TITLE_META = "title.json"
EPISODE_META = "episode.json"
MASTER = "master.m3u8"
FONTS_DIR = "fonts"
FONT_INDEX = "fonts.json"
THUMBNAIL = "thumb.jpg"


def title_dir(root: Path, mal_id: int, lang: str) -> Path:
    return root / str(mal_id) / lang


def read_json(path: Path) -> Any:
    """The parsed file, or None when it is missing or unreadable."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
