export type Status = "idle" | "connecting" | "building" | "signing" | "broadcasting" | "success" | "error";

export type LogEntry = {
  time: string;
  type: "info" | "success" | "error" | "data";
  message: string;
};

export type LogFn = (type: LogEntry["type"], message: string) => void;

export const ERC20_ABI = [
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
] as const;
