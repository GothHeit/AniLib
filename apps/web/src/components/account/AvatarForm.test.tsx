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

  it("sends the chosen file as the raw body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    const file = new File(["x"], "me.png", { type: "image/png" });
    pick(file);
    fireEvent.click(await screen.findByRole("button", { name: "Save picture" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/me/avatar",
      expect.objectContaining({ method: "PUT", body: file, headers: { "Content-Type": "image/png" } }),
    );
  });

  it("refuses a file of the wrong type without calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAccount(<AvatarForm userId="u1" username="kafka" avatar={none} />);
    pick(new File(["x"], "me.gif", { type: "image/gif" }));
    expect(await screen.findByText("Use a PNG, JPEG or WebP image.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save picture" })).toBeNull();
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
