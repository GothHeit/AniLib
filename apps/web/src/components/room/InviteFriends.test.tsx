import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import common from "../../../messages/en/common.json";
import room from "../../../messages/en/room.json";

import { InviteFriends } from "./InviteFriends";

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const none = { kind: "none", version: 0 } as const;
const friend = (id: string, username: string) => ({ user: { id, username, avatar: none }, since: "2026-10-27T00:00:00Z" });

afterEach(() => {
  cleanup();
  client.GET.mockReset();
  client.POST.mockReset();
});

function renderInvite(memberIds: string[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ ...common, ...room }}>
      <InviteFriends code="ABC234" memberIds={memberIds} />
    </NextIntlClientProvider>,
  );
}

describe("InviteFriends", () => {
  it("lists friends who are not in the room and invites one", async () => {
    client.GET.mockResolvedValue({ data: [friend("u2", "ana"), friend("u3", "bob")] });
    client.POST.mockResolvedValue({ response: { ok: true } });
    renderInvite(["u3"]);
    fireEvent.click(screen.getByRole("button", { name: "Invite a friend" }));
    expect(await screen.findByText("ana")).toBeInTheDocument();
    expect(screen.queryByText("bob")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Invited" })).toBeDisabled());
    expect(client.POST).toHaveBeenCalledWith("/watch/rooms/{code}/invite", {
      params: { path: { code: "ABC234" } },
      body: { user_id: "u2" },
    });
  });

  it("says so when there is nobody to invite", async () => {
    client.GET.mockResolvedValue({ data: [] });
    renderInvite();
    fireEvent.click(screen.getByRole("button", { name: "Invite a friend" }));
    expect(await screen.findByText("No friends to invite.")).toBeInTheDocument();
  });
});
