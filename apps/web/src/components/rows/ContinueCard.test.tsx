import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderAccount } from "@/test/account-intl";

import { ContinueCard } from "./ContinueCard";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const client = vi.hoisted(() => ({ DELETE: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const card = { animeId: 21, href: "/watch/21/3", title: "One Piece", progress: 0.4 };

afterEach(() => {
  client.DELETE.mockReset();
  refresh.mockClear();
});

describe("ContinueCard", () => {
  it("removes the card and refreshes the page", async () => {
    client.DELETE.mockResolvedValue({ response: { ok: true } });
    renderAccount(<ContinueCard {...card} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove One Piece/ }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(client.DELETE).toHaveBeenCalledWith("/me/progress/{anime_id}/continue", { params: { path: { anime_id: 21 } } });
    expect(screen.queryByText("One Piece")).toBeNull();
  });

  it("puts the card back when the request fails", async () => {
    client.DELETE.mockResolvedValue({ response: { ok: false } });
    renderAccount(<ContinueCard {...card} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove One Piece/ }));
    await waitFor(() => expect(screen.getByText("One Piece")).toBeTruthy());
    expect(refresh).not.toHaveBeenCalled();
  });
});
