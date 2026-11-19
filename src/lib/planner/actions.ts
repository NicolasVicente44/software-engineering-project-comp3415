"use server";

import { redirect } from "next/navigation";
import { generateAndSavePlan } from "@/lib/planner/saved-plan";
import { createClient } from "@/lib/supabase/server";

// build the student's plan from scratch and save it (us-04, us-05)
export async function generatePlanAction() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await generateAndSavePlan(supabase, user.id);

  if (error) {
    console.error("Failed to generate plan:", error);
    redirect("/plan?error=generate");
  }

  redirect("/plan");
}
