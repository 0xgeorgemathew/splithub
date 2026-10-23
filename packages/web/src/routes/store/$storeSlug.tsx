import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { StoreCheckoutClient } from "~~/components/store/StoreCheckoutClient";
import { getStoreBySlug } from "~~/services/storeService";
import { seo } from "~~/utils/seo";

const loadStore = createServerFn({ method: "GET" })
  .validator((data: { storeSlug: string }) => data)
  .handler(async ({ data }) => getStoreBySlug(data.storeSlug));

export const Route = createFileRoute("/store/$storeSlug")({
  loader: async ({ params }) => {
    const store = await loadStore({ data: { storeSlug: params.storeSlug } });
    if (!store) throw notFound();
    return store;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? seo({ title: `${loaderData.store_name} | SplitHub` }) : [],
  }),
  component: StoreDetailPage,
});

function StoreDetailPage() {
  const store = Route.useLoaderData();
  return <StoreCheckoutClient store={store} />;
}
