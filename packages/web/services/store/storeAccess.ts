import { getStoreRecordById } from "./shared";
import { AuthError, requireUser, sameWallet } from "~~/lib/auth";

/**
 * Resolves the signed-in user and checks they can manage the store: its manager (payout wallet) or the
 * owner of the store network it belongs to.
 */
export async function requireStoreManager(request: Request, storeId: number) {
  const { wallet } = await requireUser(request);
  const store = await getStoreRecordById(storeId).catch(() => null);
  if (!store || store.event?.kind !== "store_network") throw new AuthError("Store not found", 403);
  const isManager = sameWallet(store.operator_wallet, wallet);
  const isOwner = sameWallet(store.event?.owner_wallet, wallet);
  if (!isManager && !isOwner) throw new AuthError("Only the store's manager or owner can do that", 403);
  return { wallet, store, isManager, isOwner };
}
