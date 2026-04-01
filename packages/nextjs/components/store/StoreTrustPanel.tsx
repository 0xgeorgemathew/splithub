"use client";

import type { StoreTrustSnapshot } from "~~/lib/store.types";

const ROLE_LABELS = {
  managerTrustAgent: "Store Manager Agent",
  validatorAgent: "SplitHub Trust Auditor",
  reviewerAgent: "SplitHub Review Agent",
} as const;

function RoleCard({
  label,
  agent,
}: {
  label: string;
  agent:
    | StoreTrustSnapshot["managerTrustAgent"]
    | StoreTrustSnapshot["validatorAgent"]
    | StoreTrustSnapshot["reviewerAgent"];
}) {
  return (
    <div className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
      <div className="font-semibold">{label}</div>
      {agent ? (
        <>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-base-content/45">{agent.status}</div>
          <div className="mt-2 text-base-content/65">Operator: {agent.operator_wallet}</div>
          <div className="mt-1 text-base-content/55">
            ERC-8004 ID: {agent.registry_agent_id || "pending registration"}
          </div>
        </>
      ) : (
        <div className="mt-2 text-base-content/55">Not configured yet.</div>
      )}
    </div>
  );
}

export function StoreTrustPanel({ trust, loading }: { trust: StoreTrustSnapshot | null; loading: boolean }) {
  const latestValidation = trust?.latestValidation || null;
  const latestReputation = trust?.latestReputation || null;

  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ERC-8004 Trust Layer</h2>
          <p className="mt-1 text-sm text-base-content/55">
            Ethereum Sepolia identities, validation, and reputation for the autonomous store demo.
          </p>
        </div>
        {loading && <span className="text-xs uppercase tracking-[0.2em] text-primary">Refreshing</span>}
      </div>

      <div className="mt-4 grid gap-3">
        <RoleCard label={ROLE_LABELS.managerTrustAgent} agent={trust?.managerTrustAgent || null} />
        <RoleCard label={ROLE_LABELS.validatorAgent} agent={trust?.validatorAgent || null} />
        <RoleCard label={ROLE_LABELS.reviewerAgent} agent={trust?.reviewerAgent || null} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-primary/5 px-4 py-4 text-sm">
          <div className="font-semibold">Latest Validation</div>
          <div className="mt-2 text-base-content/65">
            Status: <span className="capitalize">{latestValidation?.status || "not started"}</span>
          </div>
          <div className="mt-1 text-base-content/65">Score: {latestValidation?.response_score ?? "pending"}</div>
          {latestValidation?.request_explorer_url && (
            <a
              className="mt-2 inline-block text-primary underline"
              href={latestValidation.request_explorer_url}
              target="_blank"
              rel="noreferrer"
            >
              View request tx
            </a>
          )}
          {latestValidation?.explorer_url && (
            <a
              className="mt-2 ml-3 inline-block text-primary underline"
              href={latestValidation.explorer_url}
              target="_blank"
              rel="noreferrer"
            >
              View response tx
            </a>
          )}
        </div>

        <div className="rounded-2xl bg-success/5 px-4 py-4 text-sm">
          <div className="font-semibold">Latest Reputation</div>
          <div className="mt-2 text-base-content/65">
            Status: <span className="capitalize">{latestReputation?.status || "not started"}</span>
          </div>
          <div className="mt-1 text-base-content/65">Score: {latestReputation?.score ?? "pending"}</div>
          <div className="mt-1 text-base-content/65">
            Tags: {[latestReputation?.tag1, latestReputation?.tag2].filter(Boolean).join(", ") || "pending"}
          </div>
          {latestReputation?.explorer_url && (
            <a
              className="mt-2 inline-block text-primary underline"
              href={latestReputation.explorer_url}
              target="_blank"
              rel="noreferrer"
            >
              View reputation tx
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
