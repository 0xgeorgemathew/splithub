"use client";

import { useMemo, useState } from "react";
import type { AgentRun, AgentValidation, ReputationEventRecord } from "~~/lib/supabase";

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
  reputationEvents,
  loading,
}: {
  runs: AgentRun[];
  validations: AgentValidation[];
  reputationEvents: ReputationEventRecord[];
  loading: boolean;
}) {
  const [showAllRuns, setShowAllRuns] = useState(false);
  const validationsByRunId = new Map(validations.map(validation => [validation.agent_run_id, validation]));
  const reputationByRunId = new Map(reputationEvents.map(event => [event.source_run_id, event]));
  const latestRun = runs[0] || null;
  const historicalRuns = useMemo(() => runs.slice(1), [runs]);
  const visibleRuns = showAllRuns ? historicalRuns : historicalRuns.slice(0, 4);
  const hiddenRunCount = Math.max(historicalRuns.length - visibleRuns.length, 0);

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

      {latestRun && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Latest Run Story</div>
              <div className="mt-1 text-xs text-base-content/55">
                Demo-friendly summary of what happened, what was submitted onchain, and what was verified.
              </div>
            </div>
            <div
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                RUN_STATE_CLASS_NAMES[latestRun.state] || "text-base-content/60"
              }`}
            >
              {latestRun.state}
            </div>
          </div>

          {(() => {
            const latestValidation = validationsByRunId.get(latestRun.id);
            const latestReputation = reputationByRunId.get(latestRun.id);
            const actions = Array.isArray(latestRun.output_json?.actions) ? latestRun.output_json.actions : [];
            const timeline = [
              {
                label: "Run triggered",
                detail: latestRun.trigger_source.replaceAll("_", " "),
              },
              {
                label: actions.length > 0 ? "Action executed" : "Healthy store check",
                detail:
                  actions.length > 0
                    ? `${actions.length} action${actions.length === 1 ? "" : "s"} completed`
                    : "No action was needed for this run",
              },
              {
                label: "Validation request prepared",
                detail: latestValidation ? "Evidence payload and request hash created" : "Not prepared yet",
              },
              {
                label: "Validation request submitted",
                detail: latestValidation?.request_tx_hash
                  ? "Manager submitted the request onchain"
                  : "Waiting for manager submission",
              },
              {
                label: "Validation response recorded",
                detail:
                  latestValidation?.status === "verified"
                    ? `Verified with score ${latestValidation.response_score ?? "pending"}`
                    : latestValidation?.status === "failed"
                      ? "Validation failed"
                      : "Waiting for auditor",
              },
              {
                label: "Reputation recorded",
                detail: latestReputation ? `Status: ${latestReputation.status}` : "Waiting for reviewer",
              },
            ];

            return (
              <>
                <div className="mt-4 rounded-2xl bg-base-100/80 px-4 py-4">
                  <div className="text-sm font-semibold">{actions.length > 0 ? "Business outcome" : "Run outcome"}</div>
                  <div className="mt-2 text-sm text-base-content/70">
                    {latestRun.decision_summary || "No summary recorded."}
                  </div>
                  {actions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {actions.map((action, index) => (
                        <div
                          key={`${action.itemId || index}-${index}`}
                          className="rounded-xl bg-base-200/50 px-3 py-3 text-sm"
                        >
                          <div className="font-semibold">
                            {action.previousStock !== undefined && action.newStock !== undefined
                              ? `Restocked ${action.name || action.sku || `item ${action.itemId}`} from ${action.previousStock} to ${action.newStock}`
                              : action.reason || action.type || "Action recorded"}
                          </div>
                          <div className="mt-1 text-base-content/60">
                            Estimated value: {action.estimatedValue ?? "n/a"}
                            {action.confidence !== undefined ? ` • Confidence: ${action.confidence}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl bg-base-200/50 px-3 py-3 text-sm text-base-content/65">
                      This was a healthy-store check. The agent reviewed inventory and found no safe action was needed.
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-base-100/80 px-4 py-4">
                  <div className="text-sm font-semibold">Trust timeline</div>
                  <div className="mt-3 space-y-3">
                    {timeline.map(item => (
                      <div key={item.label} className="flex gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-base-content/60">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          <details className="mt-4 rounded-2xl bg-base-100/80 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">Inspect raw evidence</summary>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-base-content/50">Output JSON</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-neutral px-3 py-3 text-xs text-neutral-content whitespace-pre-wrap break-words">
                  {JSON.stringify(latestRun.output_json || {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-base-content/50">Tool Calls</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-neutral px-3 py-3 text-xs text-neutral-content whitespace-pre-wrap break-words">
                  {JSON.stringify(latestRun.tool_calls_json || [], null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-base-content/50">Failures</div>
                <pre className="max-h-52 overflow-auto rounded-xl bg-neutral px-3 py-3 text-xs text-neutral-content whitespace-pre-wrap break-words">
                  {JSON.stringify(latestRun.failures_json || [], null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Run History</div>
          <div className="text-xs text-base-content/50">
            Showing {visibleRuns.length} of {historicalRuns.length} older runs
          </div>
        </div>

        {historicalRuns.length ? (
          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {visibleRuns.map(run => {
              const actionCount = Array.isArray(run.output_json?.actions) ? run.output_json.actions.length : 0;
              const validation = validationsByRunId.get(run.id);
              return (
                <div key={run.id} className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {actionCount === 0 && run.state === "submitted"
                          ? "Healthy store check"
                          : run.run_type.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 text-xs text-base-content/45">
                        {new Date(run.started_at).toLocaleString()} · {run.trigger_source.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                        RUN_STATE_CLASS_NAMES[run.state] || "text-base-content/60"
                      }`}
                    >
                      {run.state}
                    </div>
                  </div>

                  <div className="mt-3 text-base-content/70">{run.decision_summary || "No summary recorded."}</div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-base-content/55">
                    <span>Actions: {actionCount}</span>
                    <span>Retries: {run.retries}</span>
                    <span>Validation: {validation?.status || "not created"}</span>
                    {validation?.response_score !== null && validation?.response_score !== undefined && (
                      <span>Score: {validation.response_score}</span>
                    )}
                  </div>

                  {(validation?.request_explorer_url || validation?.explorer_url) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {validation.request_explorer_url && (
                        <a
                          href={validation.request_explorer_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          Validation request
                        </a>
                      )}
                      {validation.explorer_url && (
                        <a
                          href={validation.explorer_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          Validation response
                        </a>
                      )}
                    </div>
                  )}

                  <details className="mt-3 rounded-xl border border-white/10 bg-base-200/40 px-3 py-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-base-content/60">
                      Inspect raw run data
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-base-content/50">
                          Output JSON
                        </div>
                        <pre className="max-h-64 overflow-auto rounded-xl bg-neutral px-3 py-3 text-[11px] text-neutral-content whitespace-pre-wrap break-words">
                          {JSON.stringify(run.output_json || {}, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-base-content/50">
                          Tool Calls
                        </div>
                        <pre className="max-h-64 overflow-auto rounded-xl bg-neutral px-3 py-3 text-[11px] text-neutral-content whitespace-pre-wrap break-words">
                          {JSON.stringify(run.tool_calls_json || [], null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-base-content/55">
            No older agent runs yet. The latest run will appear above once the agent starts working.
          </div>
        )}

        {historicalRuns.length > 4 && (
          <button className="btn btn-ghost btn-sm mt-3" onClick={() => setShowAllRuns(current => !current)}>
            {showAllRuns ? "Show fewer runs" : `Show ${hiddenRunCount} older run${hiddenRunCount === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </div>
  );
}
