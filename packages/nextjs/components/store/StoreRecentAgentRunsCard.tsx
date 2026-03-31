import type { AgentRun, AgentValidation } from "~~/lib/supabase";

const RUN_STATE_CLASS_NAMES: Record<string, string> = {
  discovering: "text-info",
  planning: "text-warning",
  executing: "text-warning",
  verifying: "text-info",
  submitted: "text-success",
  failed: "text-error",
};

export function StoreRecentAgentRunsCard({
  runs,
  validations,
  loading,
}: {
  runs: AgentRun[];
  validations: AgentValidation[];
  loading: boolean;
}) {
  const validationsByRunId = new Map(validations.map(validation => [validation.agent_run_id, validation]));

  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Recent Agent Runs</h2>
          <p className="mt-1 text-sm text-base-content/55">
            Auto-refreshes so queued runs become visible without leaving the page.
          </p>
        </div>
        {loading && <span className="text-xs uppercase tracking-[0.2em] text-primary">Refreshing</span>}
      </div>

      <div className="mt-4 space-y-3">
        {runs.length ? (
          runs.map(run => {
            const actionCount = Array.isArray(run.output_json?.actions) ? run.output_json.actions.length : 0;
            const validation = validationsByRunId.get(run.id);
            return (
              <div key={run.id} className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{run.run_type.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-xs text-base-content/45">
                      {new Date(run.started_at).toLocaleString()} · {run.trigger_source.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${RUN_STATE_CLASS_NAMES[run.state] || "text-base-content/60"}`}
                  >
                    {run.state}
                  </div>
                </div>

                <div className="mt-3 text-base-content/70">{run.decision_summary || "No summary recorded."}</div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-base-content/55">
                  <span>Actions: {actionCount}</span>
                  <span>Retries: {run.retries}</span>
                  <span>Validation: {validation?.status || "not created"}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-base-content/55">
            No agent runs have been recorded yet for this store.
          </div>
        )}
      </div>
    </div>
  );
}
