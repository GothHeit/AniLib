import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderAccount } from "@/test/account-intl";

import { PasswordForm } from "./PasswordForm";
import { SessionsPanel, type LoginSession } from "./SessionsPanel";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => "/settings",
}));

const client = vi.hoisted(() => ({ GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn(), DELETE: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: client }));

const postAuth = vi.hoisted(() => vi.fn(async () => null));
vi.mock("@/lib/bff", () => ({ postAuth }));

const ok = { response: { ok: true, status: 204 } };

afterEach(() => {
  for (const fn of Object.values(client)) fn.mockReset();
  postAuth.mockClear();
  replace.mockClear();
  refresh.mockClear();
});

const sessions: LoginSession[] = [
  {
    id: "a",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    ip: "10.0.0.1",
    started_at: "2026-10-20T10:00:00Z",
    last_active_at: new Date().toISOString(),
    current: true,
  },
  {
    id: "b",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Safari/604.1",
    ip: null,
    started_at: "2026-10-21T10:00:00Z",
    last_active_at: "2026-10-22T10:00:00Z",
    current: false,
  },
];

describe("SessionsPanel", () => {
  it("lists devices, marks this one and only offers sign-out for the others", () => {
    renderAccount(<SessionsPanel sessions={sessions} />);
    expect(screen.getByText("Firefox on Linux")).toBeInTheDocument();
    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(1);
  });

  it("signs out one device and refreshes the list", async () => {
    client.DELETE.mockResolvedValue(ok);
    renderAccount(<SessionsPanel sessions={sessions} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(client.DELETE).toHaveBeenCalledWith("/me/sessions/{session_id}", { params: { path: { session_id: "b" } } });
  });

  it("signs out everywhere after confirming, then leaves for the login page", async () => {
    client.DELETE.mockResolvedValue(ok);
    renderAccount(<SessionsPanel sessions={sessions} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Sign out everywhere" }).at(-1)!);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(client.DELETE).toHaveBeenCalledWith("/me/sessions");
    expect(postAuth).toHaveBeenCalledWith("logout", {});
  });

  it("keeps the user signed in and says so when revoking fails", async () => {
    client.DELETE.mockResolvedValue({ response: { ok: false, status: 500 }, error: { error: { code: "unknown" } } });
    renderAccount(<SessionsPanel sessions={sessions} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Something went wrong. Try again.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("PasswordForm", () => {
  function fill(current: string, next: string, again: string) {
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: current } });
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: next } });
    fireEvent.change(screen.getByLabelText("Repeat the new password"), { target: { value: again } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
  }

  it("sends the change and clears the fields", async () => {
    client.POST.mockResolvedValue(ok);
    renderAccount(<PasswordForm />);
    fill("password123", "a-brand-new-one", "a-brand-new-one");
    await waitFor(() =>
      expect(client.POST).toHaveBeenCalledWith("/me/password", {
        body: { current_password: "password123", new_password: "a-brand-new-one" },
      }),
    );
    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("checks length and confirmation before calling the API", () => {
    renderAccount(<PasswordForm />);
    fill("password123", "short", "short");
    expect(screen.getByRole("alert")).toHaveTextContent("at least 8 characters");
    fill("password123", "a-brand-new-one", "something-else");
    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(client.POST).not.toHaveBeenCalled();
  });

  it("shows the API's reason when the current password is wrong", async () => {
    client.POST.mockResolvedValue({
      response: { ok: false, status: 403 },
      error: { error: { code: "wrong_password", message: "x" } },
    });
    renderAccount(<PasswordForm />);
    fill("nope", "a-brand-new-one", "a-brand-new-one");
    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is wrong.");
  });
});
