import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test/intl";

import { Modal } from "./Modal";

describe("Modal", () => {
  it("opens when asked and closes from its button", () => {
    const onClose = vi.fn();
    const { rerender } = renderIntl(
      <Modal open={false} onClose={onClose} title="Remove">
        body
      </Modal>,
    );
    const dialog = document.querySelector("dialog")!;
    expect(dialog).not.toHaveAttribute("open");

    rerender(
      <Modal open onClose={onClose} title="Remove">
        body
      </Modal>,
    );
    expect(dialog).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    expect(onClose).toHaveBeenCalled();
  });
});
