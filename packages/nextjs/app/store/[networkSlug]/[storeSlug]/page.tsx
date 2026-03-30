import { notFound } from "next/navigation";
import { StoreCheckoutClient } from "~~/components/store/StoreCheckoutClient";
import { getStoreBySlugs } from "~~/services/storeService";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ networkSlug: string; storeSlug: string }>;
}) {
  const { networkSlug, storeSlug } = await params;
  const store = await getStoreBySlugs(networkSlug, storeSlug);

  if (!store) {
    notFound();
  }

  return <StoreCheckoutClient store={store} />;
}
