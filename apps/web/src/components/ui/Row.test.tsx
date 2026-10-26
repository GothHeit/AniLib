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

describe("Row", () => {
  it("renders every item in the list", () => {
    setup();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("scrolls with the arrow buttons", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Scroll right" }));
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: expect.any(Number) }));
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThanOrEqual(0);
    fireEvent.click(screen.getByRole("button", { name: "Scroll left" }));
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
