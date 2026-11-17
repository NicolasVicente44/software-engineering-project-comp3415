import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/calendar/ics";
import { getTermDates } from "@/lib/calendar/terms";
import { loadPlan } from "@/lib/planner/load-plan";
import { createClient } from "@/lib/supabase/server";

// downloads the student's plan as an .ics file (us-10)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { plan, error } = await loadPlan(supabase, user.id);

  if (error || !plan) {
    return new NextResponse("Unable to load your plan", { status: 500 });
  }

  const dates = getTermDates(plan.terms.length);
  const terms = plan.terms.map((term, i) => ({ ...dates[i], courses: term.courses }));

  return new NextResponse(buildIcs(terms), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gradpath-plan.ics"',
    },
  });
}
