import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { StoreCheckoutClient } from "~~/components/store/StoreCheckoutClient";
import { getStoreBySlugs } from "~~/services/storeService";
import { seo } from "~~/utils/seo";

const loadStore = createServerFn({ method: "GET" })
  .validator((data: { networkSlug: string; storeSlug: string }) => data)
  .handler(async ({ data }) => getStoreBySlugs(data.networkSlug, data.storeSlug));

export const Route = createFileRoute("/store/$networkSlug/$storeSlug")({
  loader: async ({ params }) => {
    const store = await loadStore({ data: params });
    if (!store) throw notFound();
    return store;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? seo({ title: `${loaderData.stall_name} | SplitHub` }) : [],
  }),
  component: StoreDetailPage,
});

function StoreDetailPage() {
  const store = Route.useLoaderData();
  return <StoreCheckoutClient store={store} />;
}
