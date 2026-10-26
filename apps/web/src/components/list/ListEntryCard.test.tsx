import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import common from "../../../messages/en/common.json";
import list from "../../../messages/en/list.json";
import type { ListEntry } from "@/lib/catalog";

const refresh = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
  useRouter: () => ({ refresh }),
}));
vi.mock("@/lib/api", () => ({ api: { PATCH: (...a: unknown[]) => patch(...a), DELETE: (...a: unknown[]) => del(...a) } }));

import { ListEntryCard } from "./ListEntryCard";

const entry: ListEntry = {
  node: { id: 7, title: "Frieren", genres: [], num_episodes: 28 },
  list_status: { status: "watching", num_episodes_watched: 5 },
};

function Wrap({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={{ ...common, ...list }}>
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ListEntryCard", () => {
  it("shows watched progress", () => {
    render(<ListEntryCard entry={entry} />, { wrapper: Wrap });
    expect(screen.getByText("5 of 28 episodes")).toBeInTheDocument();
  });

  it("moves the entry to another status and refreshes", async () => {
    patch.mockResolvedValue({ response: { ok: true } });
    render(<ListEntryCard entry={entry} />, { wrapper: Wrap });
    await userEvent.click(screen.getByRole("button", { name: "Options for Frieren" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Move to Completed" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(patch).toHaveBeenCalledWith("/me/animelist/{anime_id}", {
      params: { path: { anime_id: 7 } },
      body: { status: "completed" },
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps the page as is when the API refuses", async () => {
    del.mockResolvedValue({ response: { ok: false }, error: { error: { code: "mal_update_failed" } } });
    render(<ListEntryCard entry={entry} />, { wrapper: Wrap });
    await userEvent.click(screen.getByRole("button", { name: "Options for Frieren" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Remove from list" }));
    await waitFor(() => expect(del).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
  });
});
