import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_cidjicwdanetazvhmlxu",
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
