import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/calendar/ics";
import { getTermDates } from "@/lib/calendar/terms";
import { loadPlanData } from "@/lib/planner/saved-plan";
import { createClient } from "@/lib/supabase/server";

// downloads the student's saved plan as an .ics file (us-10)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { coursesError, settingsError, savedPlan } = await loadPlanData(supabase, user.id);

  if (coursesError || settingsError) {
    console.error("Failed to load plan for calendar export: ", coursesError ?? settingsError);
    return new NextResponse("Unable to load your plan", { status: 500 });
  }

  if (!savedPlan) {
    return new NextResponse("No saved plan", { status: 404 });
  }

  // dates are matched by term number so they line up with my plan (us-10)
  const dates = getTermDates(Math.max(0, ...savedPlan.terms.map((term) => term.term)));
  const terms = savedPlan.terms.map((term) => ({ ...dates[term.term - 1], courses: term.courses }));

  return new NextResponse(buildIcs(terms), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gradpath-plan.ics"',
    },
  });
}
