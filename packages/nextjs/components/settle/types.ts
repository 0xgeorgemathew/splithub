// Payment parameters passed to the settle component
export interface PaymentParams {
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  memo?: string;
}

// Flow states for the settle process
export type FlowState = "idle" | "tapping" | "signing" | "submitting" | "confirming" | "success" | "error";

// Props for the main SettleFlow component
export interface SettleFlowProps {
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

// Props for the modal wrapper
export interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: PaymentParams;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

// Payment request stored in database
export interface PaymentRequest {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amount: string;
  memo: string | null;
  status: "pending" | "completed" | "expired";
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
}

// API response for creating a payment request
export interface CreatePaymentRequestResponse {
  requestId: string;
  settleUrl: string;
}

// Multi-settle participant (payer auto-detected from chip tap)
export interface Participant {
  id: string;
  expectedAmount: string;
  status: "waiting" | "signing" | "signed" | "error";
  // Auto-filled after chip tap:
  chipAddress?: `0x${string}`;
  payer?: `0x${string}`;
  signature?: string;
  nonce?: bigint;
  deadline?: bigint;
  error?: string;
}

// Multi-settle flow props (amounts only - payers are auto-detected)
export interface MultiSettleFlowProps {
  recipient: `0x${string}`;
  token: `0x${string}`;
  amounts: string[];
  memo?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

// Batch payment auth for relay
export interface BatchPaymentAuth {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  nonce: string;
  deadline: string;
  signature: string;
}

// Progress steps for visual indicator
export const FLOW_STEPS = [
  { key: "tapping", label: "Tap" },
  { key: "signing", label: "Sign" },
  { key: "submitting", label: "Send" },
  { key: "confirming", label: "Confirm" },
] as const;

// ABIs needed for settle flow
export const ERC20_ABI = [
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;

export const SPLIT_HUB_PAYMENTS_ABI = [
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const SPLIT_HUB_REGISTRY_ABI = [
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;
