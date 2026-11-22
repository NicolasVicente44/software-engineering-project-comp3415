import type { TermDates } from "@/lib/calendar/terms";

export type CalendarTerm = TermDates & { courses: string[] };

const pad = (n: number) => String(n).padStart(2, "0");

// "2027-01-05" -> "20270105" (us-10)
const toIcsDate = (date: string) => date.replaceAll("-", "");

// all-day DTEND is exclusive, so it is the day after the last day (us-10)
const dayAfter = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
};

// UTC timestamp as YYYYMMDDTHHMMSSZ (us-10)
const toIcsTimestamp = (now: Date) =>
  now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const toUidPart = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type AllDayEvent = {
  uid: string;
  start: string;
  end: string;
  summary: string;
  description?: string;
};

const eventLines = (event: AllDayEvent, stamp: string) => [
  "BEGIN:VEVENT",
  `UID:${event.uid}@gradpath`,
  `DTSTAMP:${stamp}`,
  `DTSTART;VALUE=DATE:${toIcsDate(event.start)}`,
  `DTEND;VALUE=DATE:${dayAfter(event.end)}`,
  `SUMMARY:${escapeText(event.summary)}`,
  ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
  "TRANSP:TRANSPARENT",
  "END:VEVENT",
];

// the planned terms and courses as an .ics calendar file (us-10)
export function buildIcs(terms: CalendarTerm[], now: Date = new Date()): string {
  const stamp = toIcsTimestamp(now);
  const events: AllDayEvent[] = [];

  for (const term of terms) {
    const termUid = toUidPart(term.label);
    events.push(
      { uid: `${termUid}-start`, start: term.start, end: term.start, summary: `${term.label} starts` },
      { uid: `${termUid}-end`, start: term.end, end: term.end, summary: `${term.label} ends` },
    );

    // uid is per course so a re-imported file updates a course that moved terms (us-10)
    for (const code of term.courses) {
      events.push({
        uid: toUidPart(code),
        start: term.start,
        end: term.end,
        summary: code,
        description: `Term ${term.term} · ${term.label}`,
      });
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GradPath//Plan Export//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR",
  ];

  return lines.map((line) => `${line}\r\n`).join("");
}
