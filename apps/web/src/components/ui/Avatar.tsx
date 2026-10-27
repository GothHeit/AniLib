import { avatarSrc, initialHue, type AvatarInfo } from "@/lib/avatar";

type Props = {
  userId: string;
  username: string;
  avatar: AvatarInfo;
  /** Side length in pixels. */
  size?: number;
  className?: string;
};

/** The user's picture, or their initial on a colour of their own when they have none. */
export function Avatar({ userId, username, avatar, size = 32, className = "" }: Props) {
  const src = avatarSrc(userId, avatar);
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny user-provided image, already sized
    return <img src={src} alt="" width={size} height={size} style={style} className={`shrink-0 rounded-ui object-cover ${className}`} referrerPolicy="no-referrer" />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, backgroundColor: `hsl(${initialHue(username)} 45% 32%)`, fontSize: size * 0.45 }}
      className={`flex shrink-0 items-center justify-center rounded-ui font-bold uppercase ${className}`}
    >
      {username.charAt(0)}
    </span>
  );
}
