import { describe, expect, it } from "vitest";

import { parseBrowse, yearOptions } from "./browse";

const known = new Set([1, 2]);

describe("parseBrowse", () => {
  it("reads valid filters and the page", () => {
    expect(parseBrowse({ genre: "2", year: "2024", season: "fall", page: "3" }, known)).toEqual({
      filters: { genre: 2, year: 2024, season: "fall" },
      page: 3,
    });
  });

  it("drops what the API would reject", () => {
    const { filters, page } = parseBrowse({ genre: "99", year: "1800", season: "monsoon", page: "0" }, known);
    expect(filters).toEqual({ genre: undefined, year: undefined, season: undefined });
    expect(page).toBe(1);
  });

  it("ignores a season without a year", () => {
    expect(parseBrowse({ season: "spring" }, known).filters.season).toBeUndefined();
  });

  it("takes the first value of a repeated parameter", () => {
    expect(parseBrowse({ year: ["2020", "2021"] }, known).filters.year).toBe(2020);
  });
});

describe("yearOptions", () => {
  it("runs from next year down to 1960", () => {
    const years = yearOptions(new Date("2026-06-01"));
    expect(years[0]).toBe(2027);
    expect(years.at(-1)).toBe(1960);
  });
});
