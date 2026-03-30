import { NextResponse } from "next/server";
import { supabase } from "~~/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  const runIds = (runs || []).map(run => run.id);
  const { data: validations } = runIds.length
    ? await supabase.from("agent_validations").select("*").in("agent_run_id", runIds)
    : { data: [] };

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    runs: runs || [],
    validations: validations || [],
  });
}
