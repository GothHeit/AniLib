"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Switch } from "@/components/account/Switch";

import type { ChatMessage, RoomState } from "./useRoom";
import { votesNeeded } from "./sync";

export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

type Props = {
  room: RoomState;
  meId: string;
  messages: ChatMessage[];
  episodes: number[];
  onSay: (text: string) => void;
  onReact: (emoji: string) => void;
  onVote: (episode: number) => void;
  onWithdraw: () => void;
  onLock: (locked: boolean) => void;
};

export function RoomPanel({ room, meId, messages, episodes, onSay, onReact, onVote, onWithdraw, onLock }: Props) {
  const t = useTranslations("room");
  const [text, setText] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const log = useRef<HTMLUListElement>(null);
  const isHost = room.host_id === meId;
  const needed = votesNeeded(room.members.length);
  const myVote = room.votes[meId];
  const wanted = pick ?? episodes.find((e) => e !== room.episode) ?? room.episode;

  const tally = new Map<number, number>();
  for (const episode of Object.values(room.votes)) tally.set(episode, (tally.get(episode) ?? 0) + 1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSay(value);
    setText("");
    // Keep the newest message in view once it arrives.
    requestAnimationFrame(() => log.current?.scrollTo({ top: log.current.scrollHeight }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen to read out.
    }
  }

  const button = "rounded-ui border border-line px-3 py-1.5 text-xs font-bold hover:bg-line";

  return (
    <aside
      aria-label={t("panel")}
      className="flex max-h-full w-full flex-col gap-4 overflow-y-auto rounded-ui border border-line bg-surface/95 p-4 text-sm shadow-xl backdrop-blur"
    >
      <section>
        <p className="text-xs uppercase tracking-wide text-muted">{t("code")}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-widest" data-testid="room-code">
            {room.code}
          </span>
          <button type="button" onClick={() => void copy()} className={button}>
            {copied ? t("copied") : t("copyLink")}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-bold">{t("members", { count: room.members.length })}</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {room.members.map((m) => (
            <li key={m.id} className="rounded-ui bg-line px-2 py-1 text-xs">
              {m.username}
              {m.id === room.host_id && <span className="ml-1 text-accent">· {t("host")}</span>}
            </li>
          ))}
        </ul>
        {isHost && (
          <label className="mt-3 flex items-center justify-between gap-3">
            <span>{t("lockControls")}</span>
            <Switch checked={room.locked} onChange={onLock} label={t("lockControls")} />
          </label>
        )}
        {!isHost && room.locked && <p className="mt-3 text-muted">{t("lockedByHost")}</p>}
      </section>

      <section>
        <h2 className="font-bold">{t("episode", { episode: room.episode })}</h2>
        {episodes.length > 1 && (
          <div className="mt-2 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">{t("pickEpisode")}</span>
              <select
                value={wanted}
                onChange={(e) => setPick(Number(e.target.value))}
                className="w-full rounded-ui border border-line bg-black/60 px-2 py-1.5"
              >
                {episodes.map((e) => (
                  <option key={e} value={e}>
                    {t("episode", { episode: e })}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={wanted === room.episode}
              onClick={() => onVote(wanted)}
              className="rounded-ui bg-accent px-3 py-1.5 text-xs font-bold text-on-accent disabled:opacity-50"
            >
              {isHost ? t("switchNow") : t("propose")}
            </button>
          </div>
        )}
        {[...tally].map(([episode, count]) => (
          <div key={episode} className="mt-2 flex items-center justify-between gap-2" aria-live="polite">
            <span>{t("votes", { episode, count, needed })}</span>
            {myVote === episode ? (
              <button type="button" onClick={onWithdraw} className={button}>
                {t("withdraw")}
              </button>
            ) : (
              <button type="button" onClick={() => onVote(episode)} className={button}>
                {t("voteFor")}
              </button>
            )}
          </div>
        ))}
        {!isHost && <p className="mt-2 text-xs text-muted">{t("voteHint")}</p>}
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="font-bold">{t("chat")}</h2>
        <ul ref={log} className="mt-2 flex max-h-48 min-h-16 flex-col gap-1 overflow-y-auto" aria-live="polite">
          {messages.length === 0 && <li className="text-muted">{t("noMessages")}</li>}
          {messages.map((m) => (
            <li key={m.id} className="break-words">
              <span className={`font-bold ${m.user_id === meId ? "text-accent" : ""}`}>{m.username}</span>{" "}
              <span>{m.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-1" role="group" aria-label={t("reactions")}>
          {REACTIONS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => onReact(emoji)} className="rounded-ui px-2 py-1 hover:bg-line">
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            aria-label={t("message")}
            placeholder={t("message")}
            className="min-w-0 flex-1 rounded-ui border border-line bg-black/60 px-3 py-1.5"
          />
          <button type="submit" className="rounded-ui bg-accent px-3 py-1.5 text-xs font-bold text-on-accent">
            {t("send")}
          </button>
        </form>
      </section>
    </aside>
  );
}
