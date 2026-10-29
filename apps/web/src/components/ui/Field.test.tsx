import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderIntl } from "@/test/intl";

import { Field } from "./Field";

describe("Field", () => {
  it("has no show button on a text field", () => {
    renderIntl(<Field label="Name" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("toggles a password between hidden and visible", () => {
    renderIntl(<Field label="Secret" type="password" />);
    const input = screen.getByLabelText(/Secret/);
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAccessibleName("Secret");
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
