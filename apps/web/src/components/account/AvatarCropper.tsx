"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { centered, clampCrop, MAX_ZOOM, panBy, placement, sourceRect, type Crop } from "@/lib/crop";

const FRAME = 280;
const OUTPUT = 512;
const KEY_STEP = 12;

type Props = {
  file: File | null;
  busy: boolean;
  onCancel: () => void;
  /** Called with the cropped square image. */
  onSave: (blob: Blob) => void;
};

/** Drag to move and slide to zoom; what is inside the frame is what gets uploaded. */
export function AvatarCropper({ file, busy, onCancel, onSave }: Props) {
  const t = useTranslations("account.avatar");
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<Crop>(centered);
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => (src ? URL.revokeObjectURL(src) : undefined), [src]);

  // A new file starts from the middle again. Adjusting state while rendering is React's pattern for this.
  const [seen, setSeen] = useState(file);
  if (seen !== file) {
    setSeen(file);
    setSize(null);
    setCrop(centered);
    setFailed(false);
  }

  const update = (change: (c: Crop) => Crop) =>
    size && setCrop((c) => clampCrop(change(c), size.width, size.height, FRAME));

  function onPointerDown(e: PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag.current || !size) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setCrop((c) => panBy(c, dx, dy, size.width, size.height, FRAME));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      return update((c) => ({ ...c, zoom: c.zoom * (e.key === "-" ? 1 / 1.1 : 1.1) }));
    }
    const step = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] }[e.key];
    if (!step || !size) return;
    e.preventDefault();
    setCrop((c) => panBy(c, step[0], step[1], size.width, size.height, FRAME));
  }

  function onWheel(e: WheelEvent) {
    update((c) => ({ ...c, zoom: c.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));
  }

  function save() {
    const el = image.current;
    if (!el || !size) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUTPUT;
    const r = sourceRect(crop, size.width, size.height, FRAME);
    canvas.getContext("2d")?.drawImage(el, r.x, r.y, r.size, r.size, 0, 0, OUTPUT, OUTPUT);
    // Safari can't encode WebP and answers with PNG, which is much bigger for a photo: ask for JPEG then.
    const encode = (type: string, done: (blob: Blob | null) => void) => canvas.toBlob(done, type, 0.92);
    encode("image/webp", (blob) => {
      if (blob && blob.type === "image/webp") return onSave(blob);
      encode("image/jpeg", (jpeg) => (jpeg ? onSave(jpeg) : setFailed(true)));
    });
  }

  const place = size ? placement(crop, size.width, size.height, FRAME) : null;

  return (
    <Modal open={file !== null} onClose={() => !busy && onCancel()} title={t("cropTitle")}>
      <div className="flex flex-col items-center gap-4">
        <div
          role="group"
          tabIndex={0}
          aria-label={t("cropFrame")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          onWheel={onWheel}
          style={{ width: FRAME, height: FRAME, touchAction: "none" }}
          className="relative cursor-grab select-none overflow-hidden rounded-ui bg-bg outline-offset-2 active:cursor-grabbing"
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element -- local file being cropped
            <img
              ref={image}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              onError={() => setFailed(true)}
              style={
                place
                  ? { position: "absolute", left: place.left, top: place.top, width: place.width, height: place.height, maxWidth: "none" }
                  : { visibility: "hidden" }
              }
            />
          )}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-ui ring-2 ring-inset ring-accent/70" />
        </div>
        <label className="flex w-full max-w-[280px] items-center gap-3 text-sm text-muted">
          {t("zoom")}
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => update((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="flex-1 accent-accent"
          />
        </label>
        <p className="text-center text-xs text-muted">{failed ? t("cropFailed") : t("cropHint")}</p>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy || !size}>
            {busy ? t("saving") : t("save")}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
