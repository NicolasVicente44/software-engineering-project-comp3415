type MonthDay = { month: number; day: number };

type Season = { name: "Winter" | "Fall"; start: MonthDay; end: MonthDay };

// approximate term dates, the real ones shift a little each year (us-10)
const WINTER: Season = {
  name: "Winter",
  start: { month: 1, day: 5 },
  end: { month: 4, day: 23 },
};
const FALL: Season = {
  name: "Fall",
  start: { month: 9, day: 8 },
  end: { month: 12, day: 18 },
};

export type TermDates = {
  term: number;
  label: string;
  // dates as YYYY-MM-DD (us-10)
  start: string;
  end: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

const toDateString = (year: number, { month, day }: MonthDay) =>
  `${year}-${pad(month)}-${pad(day)}`;

const isBefore = (a: MonthDay, b: MonthDay) =>
  a.month < b.month || (a.month === b.month && a.day < b.day);

// dates for each planned term, from the next term not started yet (us-10)
export function getTermDates(
  termCount: number,
  today: Date = new Date(),
): TermDates[] {
  const now = { month: today.getMonth() + 1, day: today.getDate() };
  let year = today.getFullYear();
  let season: Season;

  if (isBefore(now, WINTER.start)) {
    season = WINTER;
  } else if (isBefore(now, FALL.start)) {
    season = FALL;
  } else {
    season = WINTER;
    year += 1;
  }

  const terms: TermDates[] = [];
  for (let term = 1; term <= termCount; term++) {
    terms.push({
      term,
      label: `${season.name} ${year}`,
      start: toDateString(year, season.start),
      end: toDateString(year, season.end),
    });

    if (season === WINTER) {
      season = FALL;
    } else {
      season = WINTER;
      year += 1;
    }
  }

  return terms;
}
