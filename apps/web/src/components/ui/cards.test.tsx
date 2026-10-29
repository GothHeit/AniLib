import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test/intl";

import { placeholderFor, PosterCard } from "./PosterCard";
import { WideCard } from "./WideCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

describe("placeholderFor", () => {
  it("is stable for the same seed and always a poster placeholder", () => {
    expect(placeholderFor("Frieren")).toBe(placeholderFor("Frieren"));
    expect(placeholderFor(-3)).toMatch(/^bg-poster-[1-4]$/);
  });
});

describe("cards", () => {
  it("links the poster to its page", () => {
    renderIntl(<PosterCard href="/anime/1" title="Frieren" caption="2023" />);
    expect(screen.getByRole("link", { name: /Frieren/ })).toHaveAttribute("href", "/anime/1");
  });

  it("loads poster images lazily and off the main thread", () => {
    const { container } = renderIntl(<PosterCard href="/anime/1" title="Frieren" image="/p.jpg" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("clamps the progress bar to 0-100%", () => {
    renderIntl(<WideCard href="/watch" title="Frieren" progress={1.7} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
