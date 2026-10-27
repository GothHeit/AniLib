"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Link, usePathname } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { components } from "@app/api-client";

type Invite = components["schemas"]["RoomInviteOut"];

const POLL_MS = 20_000;

/** Cards for rooms friends invited you to, checked every 20 seconds while the tab is visible. */
export function RoomInvites() {
  const t = useTranslations("room.invite");
  const pathname = usePathname();
  const [invites, setInvites] = useState<Invite[]>([]);

  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const { data } = await api.GET("/watch/rooms/invites").catch(() => ({ data: undefined }));
    if (data) setInvites(data);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);

  async function dismiss(code: string) {
    setInvites((all) => all.filter((i) => i.code !== code));
    await api.DELETE("/watch/rooms/invites/{code}", { params: { path: { code } } }).catch(() => undefined);
  }

  // Someone already in the room doesn't need to be told about it.
  const shown = invites.filter((i) => !pathname.startsWith(`/room/${i.code}`));
  if (shown.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex w-[min(22rem,calc(100%-2rem))] flex-col gap-2 md:bottom-6">
      {shown.map((invite) => (
        <div key={invite.code} role="status" className="flex items-center gap-3 rounded-ui border border-line bg-surface p-3 shadow-xl">
          <Avatar userId={invite.inviter.id} username={invite.inviter.username} avatar={invite.inviter.avatar} size={40} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{t("from", { name: invite.inviter.username })}</p>
            <p className="truncate text-muted">{t("what", { title: invite.title, episode: invite.episode })}</p>
          </div>
          <Link
            href={`/room/${invite.code}`}
            onClick={() => void dismiss(invite.code)}
            className="rounded-ui bg-accent px-3 py-1.5 text-xs font-bold text-on-accent"
          >
            {t("join")}
          </Link>
          <button type="button" onClick={() => void dismiss(invite.code)} aria-label={t("dismiss")} className="rounded-ui px-2 py-1 text-muted hover:bg-line">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
