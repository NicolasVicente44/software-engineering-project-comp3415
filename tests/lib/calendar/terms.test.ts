import { describe, expect, it } from "vitest";
import { getTermDates } from "@/lib/calendar/terms";

// a local date with a 1-based month (us-10)
const day = (year: number, month: number, date: number, hour = 12) =>
  new Date(year, month - 1, date, hour);

describe("getTermDates", () => {
  it("starts with Winter of next year when today is in November", () => {
    expect(getTermDates(1, day(2026, 11, 16))).toEqual([
      { term: 1, label: "Winter 2027", start: "2027-01-05", end: "2027-04-23" },
    ]);
  });

  it("starts with Fall of the same year when today is in February", () => {
    expect(getTermDates(1, day(2027, 2, 10))).toEqual([
      { term: 1, label: "Fall 2027", start: "2027-09-08", end: "2027-12-18" },
    ]);
  });

  it("starts with Fall of the same year when today is in June", () => {
    expect(getTermDates(1, day(2027, 6, 15))[0].label).toBe("Fall 2027");
  });

  it("starts with Winter of the same year before it has started", () => {
    expect(getTermDates(1, day(2027, 1, 4))[0].label).toBe("Winter 2027");
  });

  it("skips a term that starts today", () => {
    expect(getTermDates(1, day(2027, 1, 5))[0].label).toBe("Fall 2027");
    expect(getTermDates(1, day(2027, 9, 8))[0].label).toBe("Winter 2028");
  });

  it("uses the local date late at night", () => {
    expect(getTermDates(1, day(2027, 9, 7, 23))[0].label).toBe("Fall 2027");
  });

  it("alternates Winter and Fall over 4 terms with no summer", () => {
    expect(getTermDates(4, day(2026, 11, 16))).toEqual([
      { term: 1, label: "Winter 2027", start: "2027-01-05", end: "2027-04-23" },
      { term: 2, label: "Fall 2027", start: "2027-09-08", end: "2027-12-18" },
      { term: 3, label: "Winter 2028", start: "2028-01-05", end: "2028-04-23" },
      { term: 4, label: "Fall 2028", start: "2028-09-08", end: "2028-12-18" },
    ]);
  });

  it("returns no terms for a term count of 0", () => {
    expect(getTermDates(0, day(2026, 11, 16))).toEqual([]);
  });
});
