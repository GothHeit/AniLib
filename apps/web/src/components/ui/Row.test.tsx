import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test/intl";

import { Row } from "./Row";

const scrollBy = vi.fn();
beforeEach(() => {
  scrollBy.mockClear();
  Element.prototype.scrollBy = scrollBy;
});

function setup() {
  renderIntl(
    <Row title="Top rated">
      <span>A</span>
      <span>B</span>
    </Row>,
  );
}

// Hidden arrows have no accessible name, so find them by their label attribute.
const arrow = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

describe("Row", () => {
  it("renders every item in the list", () => {
    setup();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("takes an arrow out of the tab order while it is hidden at an end of the row", () => {
    setup();
    // jsdom has no layout, so the row sits at both ends at once.
    const left = arrow("Scroll left");
    expect(left).toHaveAttribute("aria-hidden", "true");
    expect(left).toHaveAttribute("tabindex", "-1");
  });

  it("scrolls with the arrow buttons", () => {
    setup();
    // Hidden from the accessibility tree at the ends (jsdom has no layout), but still clickable.
    fireEvent.click(arrow("Scroll right"));
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: expect.any(Number) }));
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThanOrEqual(0);
    fireEvent.click(arrow("Scroll left"));
    expect(scrollBy.mock.calls[1][0].left).toBeLessThanOrEqual(0);
  });

  it("scrolls with the arrow keys", () => {
    setup();
    const list = screen.getByRole("list", { name: "Top rated" });
    fireEvent.keyDown(list, { key: "ArrowRight" });
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });
});
