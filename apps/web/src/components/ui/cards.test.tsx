import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test/intl";

import { gradientFor, PosterCard } from "./PosterCard";
import { WideCard } from "./WideCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

describe("gradientFor", () => {
  it("is stable for the same seed and always a poster gradient", () => {
    expect(gradientFor("Frieren")).toBe(gradientFor("Frieren"));
    expect(gradientFor(-3)).toMatch(/^bg-poster-[1-6]$/);
  });
});

describe("cards", () => {
  it("links the poster to its page", () => {
    renderIntl(<PosterCard href="/anime/1" title="Frieren" caption="2023" />);
    expect(screen.getByRole("link", { name: /Frieren/ })).toHaveAttribute("href", "/anime/1");
  });

  it("clamps the progress bar to 0-100%", () => {
    renderIntl(<WideCard href="/watch" title="Frieren" progress={1.7} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
