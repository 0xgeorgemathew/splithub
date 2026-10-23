import type { StoreWithCatalog } from "~~/lib/store.types";

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;

export type CheckoutLog = {
  time: string;
  message: string;
  tone: "info" | "success" | "error";
};

export type CartEntry = {
  itemId: number;
  quantity: number;
  item: StoreWithCatalog["items"][number];
};
