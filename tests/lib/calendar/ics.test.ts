import { describe, expect, it } from "vitest";
import { buildIcs, type CalendarTerm } from "@/lib/calendar/ics";

const NOW = new Date(Date.UTC(2026, 10, 16, 9, 5, 7));

const WINTER: CalendarTerm = {
  term: 1,
  label: "Winter 2027",
  start: "2027-01-05",
  end: "2027-04-23",
  courses: ["COMP-2477", "COMP-3415"],
};

const FALL: CalendarTerm = {
  term: 2,
  label: "Fall 2027",
  start: "2027-09-08",
  end: "2027-12-18",
  courses: ["COMP-4411"],
};

// the lines of the one VEVENT with this summary (us-10)
const eventWith = (ics: string, summary: string) =>
  ics
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => block.split("\r\n"))
    .find((lines) => lines.includes(`SUMMARY:${summary}`))!;

describe("buildIcs", () => {
  it("ends every line with CRLF", () => {
    const ics = buildIcs([WINTER, FALL], NOW);

    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("wraps the events in a VCALENDAR with the required properties", () => {
    const lines = buildIcs([WINTER], NOW).split("\r\n");

    expect(lines.slice(0, 4)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GradPath//Plan Export//EN",
      "CALSCALE:GREGORIAN",
    ]);
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("has a start and end event per term and one event per course", () => {
    const ics = buildIcs([WINTER, FALL], NOW);

    // 2 terms x 2 dates + 3 courses (us-10)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(7);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(7);
  });

  it("adds all-day term start and end events with an exclusive DTEND", () => {
    const ics = buildIcs([WINTER], NOW);

    expect(eventWith(ics, "Winter 2027 starts")).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20270105",
        "DTEND;VALUE=DATE:20270106",
      ]),
    );
    expect(eventWith(ics, "Winter 2027 ends")).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20270423",
        "DTEND;VALUE=DATE:20270424",
      ]),
    );
  });

  it("adds a course event spanning the whole term", () => {
    const course = eventWith(buildIcs([WINTER], NOW), "COMP-3415");

    expect(course).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20270105",
        "DTEND;VALUE=DATE:20270424",
        "DESCRIPTION:Term 1 · Winter 2027",
      ]),
    );
  });

  it("rolls DTEND over into the next month and year", () => {
    const ics = buildIcs(
      [
        { ...WINTER, end: "2027-04-30", courses: [] },
        { ...FALL, end: "2027-12-31", courses: [] },
      ],
      NOW,
    );

    expect(eventWith(ics, "Winter 2027 ends")).toContain("DTEND;VALUE=DATE:20270501");
    expect(eventWith(ics, "Fall 2027 ends")).toContain("DTEND;VALUE=DATE:20280101");
  });

  it("gives every event a stable UID and a UTC DTSTAMP", () => {
    const ics = buildIcs([WINTER, FALL], NOW);
    const uids = ics.match(/^UID:.*$/gm)!;

    expect(eventWith(ics, "COMP-3415")).toContain("UID:comp-3415@gradpath");
    expect(eventWith(ics, "Winter 2027 starts")).toContain("UID:winter-2027-start@gradpath");
    expect(new Set(uids).size).toBe(7);
    expect(ics.match(/^DTSTAMP:20261116T090507Z$/gm)).toHaveLength(7);
    // the same plan exported later keeps the same uids (us-10)
    expect(buildIcs([WINTER, FALL], new Date()).match(/^UID:.*$/gm)).toEqual(uids);
  });

  it("escapes backslashes, commas, semicolons and newlines in text", () => {
    const ics = buildIcs(
      [{ ...WINTER, label: "Winter, 2027; a\\b\nc", courses: [] }],
      NOW,
    );

    expect(ics).toContain("SUMMARY:Winter\\, 2027\\; a\\\\b\\nc starts\r\n");
  });

  it("returns a valid calendar with no events for an empty plan", () => {
    expect(buildIcs([], NOW)).toBe(
      "BEGIN:VCALENDAR\r\n" +
        "VERSION:2.0\r\n" +
        "PRODID:-//GradPath//Plan Export//EN\r\n" +
        "CALSCALE:GREGORIAN\r\n" +
        "END:VCALENDAR\r\n",
    );
  });
});
