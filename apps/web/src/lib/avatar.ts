import type { components } from "@app/api-client";

export type AvatarInfo = components["schemas"]["AvatarOut"];

export const PRESET_AVATARS = Array.from({ length: 8 }, (_, i) => `moon-${i + 1}`);
/** The picture you pick may be big: it is cropped and shrunk in the browser before it is sent. */
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** The image to show, or null when the user's initial should be drawn instead. */
export function avatarSrc(userId: string, avatar: AvatarInfo): string | null {
  switch (avatar.kind) {
    case "upload":
      return `/api/proxy/users/${userId}/avatar?v=${avatar.version}`;
    case "preset":
      return avatar.preset && PRESET_AVATARS.includes(avatar.preset) ? `/avatars/${avatar.preset}.svg` : null;
    case "mal":
      return avatar.url ?? null;
    default:
      return null;
  }
}

/** A stable background colour per name, so initials of different people look different. */
export function initialHue(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}
