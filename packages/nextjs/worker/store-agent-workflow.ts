/**
 * Durable autonomous store agent run, replacing the Trigger.dev `store-agent-run` task.
 * Queued by POST /api/stores/[storeId]/agent/runs/trigger and by the scheduled health scan.
 */
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { StoreAgentRunPayload } from "~~/services/store/storeAgentQueue";
import { executeAutonomousStoreRun } from "~~/services/storeService";

export class StoreAgentRunWorkflow extends WorkflowEntrypoint<Env, StoreAgentRunPayload> {
  async run(event: WorkflowEvent<StoreAgentRunPayload>, step: WorkflowStep) {
    const { storeId, triggerSource } = event.payload;

    return step.do(
      "execute autonomous store run",
      // Matches the old Trigger.dev policy: 3 attempts, exponential backoff from 1s.
      { retries: { limit: 2, delay: "1 second", backoff: "exponential" }, timeout: "15 minutes" },
      async () => {
        console.log("Starting autonomous store run", { storeId, triggerSource });
        const result = await executeAutonomousStoreRun(storeId, triggerSource ?? "workflow");
        const summary = {
          storeId,
          runId: result.run.id,
          state: result.run.state,
          actionCount: result.actions.length,
          summary: result.run.decision_summary,
        };
        console.log("Completed autonomous store run", summary);
        return summary;
      },
    );
  }
}
