import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invoice Instructions" },
      { name: "description", content: "Search and manage client invoice sending instructions." },
      { property: "og:title", content: "Invoice Instructions" },
      { property: "og:description", content: "Search and manage client invoice sending instructions." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
