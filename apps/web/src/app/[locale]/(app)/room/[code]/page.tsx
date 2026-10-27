import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DEFAULT_STYLE } from "@/components/player/subtitleStyle";
import { RoomClient } from "@/components/room/RoomClient";
import { APP_NAME } from "@/lib/brand";
import { serverApi, unwrap } from "@/lib/server-api";

export const metadata: Metadata = { title: `${APP_NAME}` };

export default async function RoomPage({ params }: PageProps<"/[locale]/room/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("room");
  const api = await serverApi();

  const [{ data: room, response }, me] = await Promise.all([
    api.GET("/watch/rooms/{code}", { params: { path: { code } } }),
    unwrap(api.GET("/me"), locale),
  ]);
  if (response.status === 409) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-6 text-center text-fg">
        <p role="alert" className="max-w-md text-lg font-medium">
          {t("closed.room_full")}
        </p>
      </div>
    );
  }
  if (!room) notFound();

  const [episodes, preferences] = await Promise.all([
    // Without the list the episode picker stays hidden; the player reports real errors itself.
    api
      .GET("/watch/{source}/{anime_id}/episodes", {
        params: { path: { source: room.source, anime_id: room.anime_id }, query: { lang: room.lang } },
      })
      .catch(() => undefined),
    api.GET("/watch/preferences").catch(() => undefined),
  ]);

  return (
    <RoomClient
      initial={room}
      meId={me.id}
      episodes={[...(episodes?.data?.episodes ?? [])].sort((a, b) => a - b)}
      subtitleLang={me.subtitle_lang}
      subtitleStyle={preferences?.data ?? DEFAULT_STYLE}
    />
  );
}
