import { getStoreById } from "./shared";
import { AuthError, requireUser, sameWallet } from "~~/lib/auth";

/** Resolves the signed-in user and checks they own the store (the wallet that set it up). */
export async function requireStoreOwner(request: Request, storeId: number) {
  const { wallet } = await requireUser(request);
  const store = await getStoreById(storeId);
  if (!store) throw new AuthError("Store not found", 403);
  if (!sameWallet(store.owner_wallet, wallet)) throw new AuthError("Only the store's owner can do that", 403);
  return { wallet, store };
}
