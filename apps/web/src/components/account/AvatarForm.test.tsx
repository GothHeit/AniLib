import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderAccount } from "@/test/account-intl";

import { AvatarForm } from "./AvatarForm";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));

const client = vi.hoisted(() => ({ PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const none = { kind: "none", version: 0 } as const;

afterEach(() => {
  for (const fn of Object.values(client)) fn.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  refresh.mockClear();
});

function pick(file: File) {
  const input = document.getElementById("avatar-file") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AvatarForm", () => {
  it("chooses a preset and refreshes", async () => {
    client.PUT.mockResolvedValue({ response: { ok: true } });
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    fireEvent.click(screen.getByRole("button", { name: "Avatar 3" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(client.PUT).toHaveBeenCalledWith("/me/avatar/preset", { body: { preset: "moon-3" } });
  });

  it("opens the cropper and uploads the cropped picture", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    const drawImage = vi.fn();
    const cropped = new Blob(["c"], { type: "image/webp" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(cropped));
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);

    pick(new File(["x"], "me.png", { type: "image/png" }));
    const frame = await screen.findByRole("group", { name: /Picture frame/ });
    const img = frame.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 800 });
    Object.defineProperty(img, "naturalHeight", { value: 400 });
    fireEvent.load(img);

    fireEvent.click(screen.getByRole("button", { name: "Save picture" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    // The middle square of a landscape picture, at zoom 1.
    expect(drawImage).toHaveBeenCalledWith(img, 200, 0, 400, 400, 0, 0, 512, 512);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/me/avatar",
      expect.objectContaining({ method: "PUT", body: cropped, headers: { "Content-Type": "image/webp" } }),
    );
  });

  it("falls back to JPEG when the browser can't encode WebP", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb, type) =>
      cb(new Blob(["c"], { type: type === "image/webp" ? "image/png" : (type as string) })),
    );
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    pick(new File(["x"], "me.png", { type: "image/png" }));
    const img = (await screen.findByRole("group", { name: /Picture frame/ })).querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 100 });
    Object.defineProperty(img, "naturalHeight", { value: 100 });
    fireEvent.load(img);
    fireEvent.click(screen.getByRole("button", { name: "Save picture" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "image/jpeg" });
  });

  it("refuses a file of the wrong type without calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    pick(new File(["x"], "me.gif", { type: "image/gif" }));
    expect(await screen.findByText("Use a PNG, JPEG or WebP image.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Picture frame/ })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers Remove only when a picture was set", () => {
    const { unmount } = renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    unmount();
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={{ kind: "preset", preset: "moon-1", version: 0 }} />);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
