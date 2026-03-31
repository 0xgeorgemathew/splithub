import { logger, task } from "@trigger.dev/sdk";
import { executeAutonomousStoreRun } from "~~/services/storeService";

export type StoreAgentRunPayload = {
  storeId: number;
  triggerSource?: string;
};

export const storeAgentRunTask = task({
  id: "store-agent-run",
  run: async (payload: StoreAgentRunPayload) => {
    logger.info("Starting autonomous store run", payload);

    const result = await executeAutonomousStoreRun(
      payload.storeId,
      payload.triggerSource ?? "trigger_task",
    );

    logger.info("Completed autonomous store run", {
      storeId: payload.storeId,
      runId: result.run.id,
      state: result.run.state,
      actionCount: result.actions.length,
    });

    return {
      storeId: payload.storeId,
      runId: result.run.id,
      state: result.run.state,
      actionCount: result.actions.length,
      summary: result.run.decision_summary,
    };
  },
});
