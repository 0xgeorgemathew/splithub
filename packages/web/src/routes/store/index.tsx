import { createFileRoute } from "@tanstack/react-router";
import { StoreDashboard } from "~~/components/store/StoreDashboard";

function StorePage() {
  return <StoreDashboard />;
}

export const Route = createFileRoute("/store/")({
  component: StorePage,
});
