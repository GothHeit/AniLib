"use client";

import { errorCode } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";

import { AvatarCropper } from "@/components/account/AvatarCropper";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { AVATAR_SOURCE_MAX_BYTES, AVATAR_TYPES, PRESET_AVATARS, type AvatarInfo } from "@/lib/avatar";

type Props = { userId: string; username: string; avatar: AvatarInfo };

/** Pick an uploaded picture or a preset. Changes apply right away, like the other settings. */
export function AvatarForm({ userId, username, avatar }: Props) {
  const t = useTranslations("account.avatar");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function clearFile() {
    setFile(null);
    if (input.current) input.current.value = "";
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!AVATAR_TYPES.includes(picked.type)) {
      toast(tErr("avatar_type"), "error");
      return clearFile();
    }
    if (picked.size > AVATAR_SOURCE_MAX_BYTES) {
      toast(tErr("avatar_too_large"), "error");
      return clearFile();
    }
    setFile(picked);
  }

  async function run(request: () => Promise<Response>) {
    setBusy(true);
    try {
      const response = await request();
      if (!response.ok) {
        const code = errorCode(await response.json().catch(() => undefined));
        toast(tErr.has(code) ? tErr(code) : tErr("unknown"), "error");
        return;
      }
      toast(t("saved"), "success");
      clearFile();
      router.refresh();
    } catch {
      toast(tErr("network"), "error");
    } finally {
      setBusy(false);
    }
  }

  const upload = (blob: Blob) =>
    run(() => fetch("/api/proxy/me/avatar", { method: "PUT", headers: { "Content-Type": blob.type }, body: blob }));
  const choose = (preset: string) =>
    run(async () => (await api.PUT("/me/avatar/preset", { body: { preset } })).response);
  const remove = () => run(async () => (await api.DELETE("/me/avatar")).response);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar userId={userId} username={username} avatar={avatar} size={80} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            onChange={onPick}
            className="sr-only"
            id="avatar-file"
            aria-label={t("choose")}
          />
          <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
            {t("choose")}
          </Button>
          {(avatar.kind === "upload" || avatar.kind === "preset") && (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              {t("remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
      <AvatarCropper file={file} busy={busy} onCancel={clearFile} onSave={upload} />

      <div>
        <p className="mb-2 text-sm text-muted">{t("presets")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_AVATARS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={busy}
              aria-pressed={avatar.kind === "preset" && avatar.preset === preset}
              aria-label={t("presetLabel", { number: preset.split("-")[1] })}
              onClick={() => choose(preset)}
              className="rounded-ui border-2 border-transparent p-0.5 transition-colors hover:border-accent/60 aria-pressed:border-accent disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static artwork */}
              <img src={`/avatars/${preset}.svg`} alt="" width={48} height={48} className="h-12 w-12 rounded-ui" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
