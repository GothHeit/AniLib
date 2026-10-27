import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import common from "../../../messages/en/common.json";
import friendsMessages from "../../../messages/en/friends.json";
import { ToastProvider } from "@/components/ui/Toast";

import { FriendsPanel } from "./FriendsPanel";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const none = { kind: "none", version: 0 } as const;
const person = (id: string, username: string) => ({ id, username, avatar: none });
const empty = { incoming: [], outgoing: [] };

afterEach(() => {
  cleanup();
  for (const fn of Object.values(client)) fn.mockReset();
  refresh.mockClear();
});

function renderPanel(props: Partial<React.ComponentProps<typeof FriendsPanel>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ ...common, ...friendsMessages }}>
      <ToastProvider>
        <FriendsPanel friends={[]} requests={empty} {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
}

describe("FriendsPanel", () => {
  it("shows who you found before sending the request", async () => {
    client.GET.mockResolvedValue({ data: { user: person("u2", "ana"), relation: "none" } });
    client.POST.mockResolvedValue({ data: { user: person("u2", "ana"), relation: "outgoing" } });
    renderPanel();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: " ana " } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByText("ana")).toBeInTheDocument();
    expect(client.GET).toHaveBeenCalledWith("/users/lookup", { params: { query: { username: "ana" } } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(client.POST).toHaveBeenCalledWith("/friends/requests", { body: { username: "ana" } });
  });

  it("offers no request for someone who is already a friend", async () => {
    client.GET.mockResolvedValue({ data: { user: person("u2", "ana"), relation: "friends" } });
    renderPanel();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByText("Already friends")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
  });

  it("tells when nobody has that username", async () => {
    client.GET.mockResolvedValue({ error: { error: { code: "user_not_found", message: "x" } } });
    renderPanel();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "ghost" } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByText("No one with that name.")).toBeInTheDocument();
  });

  it("accepts and declines incoming requests", async () => {
    client.POST.mockResolvedValue({ data: {} });
    client.DELETE.mockResolvedValue({ response: { ok: true } });
    renderPanel({ requests: { incoming: [{ user: person("u2", "ana"), sent_at: "2026-10-27T00:00:00Z" }], outgoing: [] } });
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(client.POST).toHaveBeenCalledWith("/friends/requests/{user_id}/accept", { params: { path: { user_id: "u2" } } }));
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(client.DELETE).toHaveBeenCalledWith("/friends/requests/{user_id}", { params: { path: { user_id: "u2" } } }));
  });

  it("asks before removing a friend", async () => {
    client.DELETE.mockResolvedValue({ response: { ok: true } });
    renderPanel({ friends: [{ user: person("u2", "ana"), since: "2026-10-27T00:00:00Z" }] });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(client.DELETE).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove friend" }));
    await waitFor(() => expect(client.DELETE).toHaveBeenCalledWith("/friends/{user_id}", { params: { path: { user_id: "u2" } } }));
  });
});
