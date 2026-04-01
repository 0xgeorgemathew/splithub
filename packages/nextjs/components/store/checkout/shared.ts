import type { StoreWithCatalog } from "~~/lib/store.types";

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;

export type CheckoutLog = {
  time: string;
  message: string;
  tone: "info" | "success" | "error";
};

export type AgentFeedback = {
  state: string;
  summary: string;
  actionCount: number;
  validationStatus?: string;
  queued?: boolean;
  currentStepLabel?: string;
  requiresManualAction?: boolean;
  nextStepLabel?: string;
  nextStepAutomatic?: boolean;
};

export type TrustWorkflowStepStatus = "not_started" | "ready" | "waiting" | "submitted" | "verified" | "failed";

export type TrustWorkflowStep = {
  key: string;
  title: string;
  actor: string;
  description: string;
  status: TrustWorkflowStepStatus;
  isCurrent?: boolean;
  txLabel?: string;
  txUrl?: string | null;
};

export type ItemFormState = {
  sku: string;
  name: string;
  price: string;
  stock: string;
};

export type CartEntry = {
  itemId: number;
  quantity: number;
  item: StoreWithCatalog["items"][number];
};
