"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BACKGROUNDS, COLORS, POSITIONS, SIZES, type SubtitleStyle } from "./subtitleStyle";

export type Quality = { index: number; height: number };
export type AudioTrack = { id: number; label: string };

type Props = {
  qualities: Quality[];
  /** -1 for automatic. */
  quality: number;
  onQuality: (index: number) => void;
  audioTracks: AudioTrack[];
  audioTrack: number;
  onAudioTrack: (id: number) => void;
  style: SubtitleStyle;
  onStyle: (style: SubtitleStyle) => void;
  hasSubtitles: boolean;
};

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

const selectClass = "min-w-32 rounded-ui border border-line bg-black/60 px-2 py-1.5 text-fg";

export function SettingsMenu(props: Props) {
  const t = useTranslations("player.settings");
  const { style, onStyle } = props;
  const set = <K extends keyof SubtitleStyle>(key: K, value: SubtitleStyle[K]) => onStyle({ ...style, [key]: value });

  return (
    <div
      role="group"
      aria-label={t("title")}
      className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-ui border border-line bg-surface/95 p-4 shadow-lg"
    >
      {props.qualities.length > 1 && (
        <Choice label={t("quality")}>
          <select value={props.quality} onChange={(e) => props.onQuality(Number(e.target.value))} className={selectClass}>
            <option value={-1}>{t("auto")}</option>
            {props.qualities.map((q) => (
              <option key={q.index} value={q.index}>
                {t("height", { height: q.height })}
              </option>
            ))}
          </select>
        </Choice>
      )}
      {props.audioTracks.length > 1 && (
        <Choice label={t("audioTrack")}>
          <select
            value={props.audioTrack}
            onChange={(e) => props.onAudioTrack(Number(e.target.value))}
            className={selectClass}
          >
            {props.audioTracks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Choice>
      )}
      {props.hasSubtitles && (
        <>
          <p className="pt-1 text-xs font-bold uppercase tracking-wide text-muted">{t("subtitleStyle")}</p>
          <Choice label={t("size")}>
            <select
              value={style.subtitle_size}
              onChange={(e) => set("subtitle_size", e.target.value as SubtitleStyle["subtitle_size"])}
              className={selectClass}
            >
              {SIZES.map((v) => (
                <option key={v} value={v}>
                  {t(`sizes.${v}`)}
                </option>
              ))}
            </select>
          </Choice>
          <Choice label={t("color")}>
            <select
              value={style.subtitle_color}
              onChange={(e) => set("subtitle_color", e.target.value as SubtitleStyle["subtitle_color"])}
              className={selectClass}
            >
              {COLORS.map((v) => (
                <option key={v} value={v}>
                  {t(`colors.${v}`)}
                </option>
              ))}
            </select>
          </Choice>
          <Choice label={t("background")}>
            <select
              value={style.subtitle_background}
              onChange={(e) => set("subtitle_background", e.target.value as SubtitleStyle["subtitle_background"])}
              className={selectClass}
            >
              {BACKGROUNDS.map((v) => (
                <option key={v} value={v}>
                  {t(`backgrounds.${v}`)}
                </option>
              ))}
            </select>
          </Choice>
          <Choice label={t("position")}>
            <select
              value={style.subtitle_position}
              onChange={(e) => set("subtitle_position", e.target.value as SubtitleStyle["subtitle_position"])}
              className={selectClass}
            >
              {POSITIONS.map((v) => (
                <option key={v} value={v}>
                  {t(`positions.${v}`)}
                </option>
              ))}
            </select>
          </Choice>
        </>
      )}
    </div>
  );
}
