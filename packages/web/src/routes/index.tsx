import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "~~/components/landing";

function Home() {
  return <LandingPage />;
}

export const Route = createFileRoute("/")({
  component: Home,
});
