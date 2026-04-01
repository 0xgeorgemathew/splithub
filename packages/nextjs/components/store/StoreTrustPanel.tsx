"use client";

import type { TrustWorkflowStep, TrustWorkflowStepStatus } from "./checkout/shared";
import type { StoreTrustSnapshot } from "~~/lib/store.types";
import type { AgentRun } from "~~/lib/supabase";

const STEP_STATUS_LABELS: Record<TrustWorkflowStepStatus, string> = {
  not_started: "Not started",
  ready: "Ready",
  waiting: "Waiting",
  submitted: "Submitted",
  verified: "Verified",
  failed: "Failed",
};

function getStepStatusLabel(status: string | null | undefined) {
  if (status === "pending") return "Pending";
  if (!status) return "Pending";
  return STEP_STATUS_LABELS[status as TrustWorkflowStepStatus] || status;
}

const STEP_STATUS_CLASS_NAMES: Record<TrustWorkflowStepStatus, string> = {
  not_started: "text-base-content/45",
  ready: "text-info",
  waiting: "text-warning",
  submitted: "text-primary",
  verified: "text-success",
  failed: "text-error",
};

function getLatestRunSummary(latestRun: AgentRun | null) {
  if (!latestRun) {
    return "Not started";
  }

  if (latestRun.state === "failed") {
    return "Failed";
  }

  const actions = Array.isArray(latestRun.output_json?.actions) ? latestRun.output_json.actions : [];
  return actions.length > 0 ? "Action taken" : "No action";
}

function buildWorkflowSteps(params: {
  trust: StoreTrustSnapshot | null;
  latestRun: AgentRun | null;
  canSignTrust: boolean;
  needsManagerTrustRegistration: boolean;
  needsValidationSignature: boolean;
}): TrustWorkflowStep[] {
  const latestRun = params.latestRun;
  const latestValidation =
    latestRun && params.trust?.latestValidation?.agent_run_id === latestRun.id ? params.trust.latestValidation : null;
  const latestReputation =
    latestRun && params.trust
      ? params.trust.reputationEvents.find(event => event.source_run_id === latestRun.id) ||
        (params.trust.latestReputation?.source_run_id === latestRun.id ? params.trust.latestReputation : null)
      : null;

  const managerRegistered = Boolean(params.trust?.managerTrustAgent?.registry_agent_id);
  const latestRunActions = Array.isArray(latestRun?.output_json?.actions) ? latestRun.output_json.actions.length : 0;

  const steps: TrustWorkflowStep[] = [
    {
      key: "register",
      title: "1. Register manager identity",
      actor: "Manual: Manager wallet",
      description:
        "Manager-signed step. Click the button to submit the manager's ERC-8004 identity on Ethereum Sepolia.",
      status: managerRegistered ? "verified" : params.canSignTrust ? "ready" : "waiting",
      txLabel: "View registration tx",
      txUrl: params.trust?.managerTrustAgent?.identity_tx_hash
        ? `${process.env.NEXT_PUBLIC_ERC8004_TRUST_EXPLORER_BASE_URL || "https://sepolia.etherscan.io"}/tx/${params.trust.managerTrustAgent.identity_tx_hash}`
        : null,
    },
    {
      key: "run",
      title: "2. Trigger manager action",
      actor: "Manual or scheduled: Manager runtime",
      description:
        "Trigger the manager agent to inspect inventory and act. This can come from Run Manager Agent or an automatic health scan.",
      status: !managerRegistered
        ? "waiting"
        : !latestRun
          ? "ready"
          : latestRun.state === "failed"
            ? "failed"
            : latestRun.state === "submitted"
              ? "verified"
              : "waiting",
    },
    {
      key: "validation_request",
      title: "3. Submit validation request",
      actor: "Manual: Manager wallet",
      description:
        "Manager-signed step. Submit the ERC-8004 validation request onchain after the run evidence is prepared.",
      status:
        !managerRegistered || !latestRun
          ? "waiting"
          : latestValidation?.request_tx_hash
            ? "submitted"
            : params.needsValidationSignature && params.canSignTrust
              ? "ready"
              : latestValidation
                ? "waiting"
                : "not_started",
      txLabel: "View request tx",
      txUrl: latestValidation?.request_explorer_url,
    },
    {
      key: "validator",
      title: "4. Validator verifies automatically",
      actor: "Automatic: Trust Auditor",
      description:
        "After the manager submits the request, the auditor reviews the evidence and writes the validation response.",
      status: !latestValidation?.request_tx_hash
        ? "waiting"
        : latestValidation.status === "verified"
          ? "verified"
          : latestValidation.status === "failed"
            ? "failed"
            : "submitted",
      txLabel: "View response tx",
      txUrl: latestValidation?.explorer_url,
    },
    {
      key: "reviewer",
      title: "5. Reviewer writes reputation automatically",
      actor: "Automatic: Review Agent",
      description: "After a passing validation, the reviewer records reputation for the manager identity onchain.",
      status:
        latestValidation?.status === "failed"
          ? "failed"
          : latestReputation?.status === "verified"
            ? "verified"
            : latestReputation?.status === "submitted"
              ? "submitted"
              : latestValidation?.status === "verified"
                ? "waiting"
                : "not_started",
      txLabel: "View reputation tx",
      txUrl: latestReputation?.explorer_url,
    },
  ];

  const currentStep = steps.find(
    step =>
      step.status === "ready" || step.status === "submitted" || step.status === "waiting" || step.status === "failed",
  );

  return steps.map(step => ({
    ...step,
    isCurrent: currentStep?.key === step.key,
    description:
      step.key === "run" && latestRunActions > 0
        ? `${step.description} Latest run executed ${latestRunActions} action${latestRunActions === 1 ? "" : "s"}.`
        : step.description,
  }));
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-base-100/80 px-4 py-3 text-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">{label}</div>
      <div className="mt-2 font-semibold text-base-content/80">{value}</div>
    </div>
  );
}

function TrustStepCard({ step }: { step: TrustWorkflowStep }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-sm ${
        step.isCurrent ? "border-primary/40 bg-primary/8" : "border-white/10 bg-base-100/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{step.title}</div>
          <div className="mt-1 text-xs text-base-content/50">{step.actor}</div>
        </div>
        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${STEP_STATUS_CLASS_NAMES[step.status]}`}>
          {STEP_STATUS_LABELS[step.status]}
        </div>
      </div>
      <div className="mt-3 text-base-content/65">{step.description}</div>
      {step.txUrl && (
        <a className="mt-3 inline-block text-primary underline" href={step.txUrl} target="_blank" rel="noreferrer">
          {step.txLabel}
        </a>
      )}
    </div>
  );
}

export function StoreTrustPanel({
  trust,
  loading,
  latestRun,
  canSignTrust,
  needsManagerTrustRegistration,
  needsValidationSignature,
}: {
  trust: StoreTrustSnapshot | null;
  loading: boolean;
  latestRun: AgentRun | null;
  canSignTrust: boolean;
  needsManagerTrustRegistration: boolean;
  needsValidationSignature: boolean;
}) {
  const latestValidation =
    latestRun && trust?.latestValidation?.agent_run_id === latestRun.id ? trust.latestValidation : null;
  const latestReputation =
    latestRun && trust
      ? trust.reputationEvents.find(event => event.source_run_id === latestRun.id) ||
        (trust.latestReputation?.source_run_id === latestRun.id ? trust.latestReputation : null)
      : null;
  const steps = buildWorkflowSteps({
    trust,
    latestRun,
    canSignTrust,
    needsManagerTrustRegistration,
    needsValidationSignature,
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-base-200/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ERC-8004 Trust Flow</h2>
          <p className="mt-1 text-sm text-base-content/55">
            Current implementation uses manual manager signing for Privy-owned manager wallets. Auditor and reviewer
            steps are automatic.
          </p>
        </div>
        {loading && <span className="text-xs uppercase tracking-[0.2em] text-primary">Refreshing</span>}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusPill
          label="Manager Identity"
          value={trust?.managerTrustAgent?.registry_agent_id ? "Registered" : "Not registered"}
        />
        <StatusPill label="Latest Run" value={getLatestRunSummary(latestRun)} />
        <StatusPill label="Validation" value={getStepStatusLabel(latestValidation?.status)} />
        <StatusPill label="Reputation" value={getStepStatusLabel(latestReputation?.status)} />
      </div>

      <div className="mt-5 grid gap-3">
        {steps.map(step => (
          <TrustStepCard key={step.key} step={step} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
          <div className="font-semibold">Store Manager Agent</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-base-content/45">
            {trust?.managerTrustAgent?.status || "pending"}
          </div>
          <div className="mt-2 break-all text-base-content/65">
            Operator: {trust?.managerTrustAgent?.operator_wallet || "pending"}
          </div>
          <div className="mt-1 text-base-content/55">
            ERC-8004 ID: {trust?.managerTrustAgent?.registry_agent_id || "pending registration"}
          </div>
        </div>
        <div className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
          <div className="font-semibold">SplitHub Trust Auditor</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-base-content/45">
            {trust?.validatorAgent?.status || "pending"}
          </div>
          <div className="mt-2 break-all text-base-content/65">
            Operator: {trust?.validatorAgent?.operator_wallet || "pending"}
          </div>
          <div className="mt-1 text-base-content/55">
            ERC-8004 ID: {trust?.validatorAgent?.registry_agent_id || "pending registration"}
          </div>
        </div>
        <div className="rounded-2xl bg-base-100/80 px-4 py-4 text-sm">
          <div className="font-semibold">SplitHub Review Agent</div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-base-content/45">
            {trust?.reviewerAgent?.status || "pending"}
          </div>
          <div className="mt-2 break-all text-base-content/65">
            Operator: {trust?.reviewerAgent?.operator_wallet || "pending"}
          </div>
          <div className="mt-1 text-base-content/55">
            ERC-8004 ID: {trust?.reviewerAgent?.registry_agent_id || "pending registration"}
          </div>
        </div>
      </div>
    </div>
  );
}
