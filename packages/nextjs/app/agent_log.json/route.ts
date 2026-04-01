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
  const [{ data: trustAgents }, { data: reputationEvents }] = await Promise.all([
    supabase.from("erc8004_agents").select("*").order("created_at", { ascending: false }),
    supabase.from("agent_reputation_events").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const validationByRunId = new Map((validations || []).map(validation => [validation.agent_run_id, validation]));
  const reputationByRunId = new Map((reputationEvents || []).map(event => [event.source_run_id, event]));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    trust_agents: trustAgents || [],
    runs: runs || [],
    validations: validations || [],
    reputation_events: reputationEvents || [],
    timeline: (runs || []).map(run => {
      const validation = validationByRunId.get(run.id);
      const reputation = reputationByRunId.get(run.id);

      return {
        run_id: run.id,
        agent_id: run.agent_id,
        trigger_source: run.trigger_source,
        state: run.state,
        started_at: run.started_at,
        completed_at: run.completed_at,
        decision_summary: run.decision_summary,
        events: [
          {
            type: "manager_run",
            status: run.state,
            at: run.started_at,
          },
          validation
            ? {
                type: "validation_request",
                status: validation.status,
                request_hash: validation.request_hash,
                tx_hash: validation.request_tx_hash,
                explorer_url: validation.request_explorer_url,
              }
            : null,
          validation?.response_score !== null && validation
            ? {
                type: "validation_response",
                status: validation.status,
                score: validation.response_score,
                tx_hash: validation.erc8004_validation_tx,
                explorer_url: validation.explorer_url,
                reviewed_at: validation.reviewed_at,
              }
            : null,
          reputation
            ? {
                type: "reputation_feedback",
                status: reputation.status,
                score: reputation.score,
                tx_hash: reputation.reputation_tx_hash,
                explorer_url: reputation.explorer_url,
                created_at: reputation.created_at,
              }
            : null,
        ].filter(Boolean),
      };
    }),
  });
}
