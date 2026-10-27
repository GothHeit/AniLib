import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import notificationMessages from "../../../messages/en/notifications.json";

import { NotificationBell } from "./NotificationBell";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, onClick, ...rest }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const none = { kind: "none", version: 0 } as const;
const base = { read: false, created_at: new Date().toISOString(), anime_id: null, episode: null, title: null, room_code: null, room_active: null, actor: null };
const friend = { ...base, id: "n1", kind: "friend_request", actor: { id: "u2", username: "ana", avatar: none } };
const room = { ...base, id: "n2", kind: "room_invite", room_code: "ABC123", title: "One Piece", episode: 3, room_active: true, actor: { id: "u3", username: "bob", avatar: none } };
const episode = { ...base, id: "n3", kind: "new_episode", anime_id: 5, episode: 4, title: "Airing Show" };

afterEach(() => {
  cleanup();
  for (const fn of Object.values(client)) fn.mockReset();
});

function renderBell() {
  return render(
    <NextIntlClientProvider locale="en" messages={notificationMessages}>
      <NotificationBell />
    </NextIntlClientProvider>,
  );
}

describe("NotificationBell", () => {
  it("shows the unread count and lists what happened", async () => {
    client.GET.mockResolvedValue({ data: { items: [friend, room, episode], unread: 3 } });
    renderBell();
    const button = await screen.findByRole("button", { name: "Notifications, 3 unread" });
    fireEvent.click(button);
    expect(await screen.findByText("ana wants to be your friend")).toBeInTheDocument();
    expect(screen.getByText("bob invited you to watch together")).toBeInTheDocument();
    expect(screen.getByText("One Piece, episode 3")).toBeInTheDocument();
    expect(screen.getByText("New episode of Airing Show")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bob invited you/ })).toHaveAttribute("href", "/room/ABC123");
    expect(screen.getByRole("link", { name: /Airing Show/ })).toHaveAttribute("href", "/anime/5");
  });

  it("marks an entry read when it is opened and everything read on request", async () => {
    client.GET.mockResolvedValue({ data: { items: [friend, episode], unread: 2 } });
    client.POST.mockResolvedValue({ response: { ok: true } });
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
    fireEvent.click(await screen.findByRole("link", { name: /ana wants/ }));
    expect(client.POST).toHaveBeenCalledWith("/notifications/{notification_id}/read", { params: { path: { notification_id: "n1" } } });
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(client.POST).toHaveBeenCalledWith("/notifications/read");
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
  });

  it("dismisses an entry and says when a room has closed", async () => {
    client.GET.mockResolvedValue({ data: { items: [{ ...room, room_active: false }, friend], unread: 2 } });
    client.DELETE.mockResolvedValue({ response: { ok: true } });
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
    expect(await screen.findByText("This room has closed.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /bob invited you/ })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);
    await waitFor(() => expect(screen.queryByText("bob invited you to watch together")).toBeNull());
    expect(client.DELETE).toHaveBeenCalledWith("/notifications/{notification_id}", { params: { path: { notification_id: "n2" } } });
  });

  it("says so when there is nothing", async () => {
    client.GET.mockResolvedValue({ data: { items: [], unread: 0 } });
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });
});
