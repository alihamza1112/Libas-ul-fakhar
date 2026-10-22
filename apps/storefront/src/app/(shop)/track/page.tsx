import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "Track your order" };

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4">
      <Breadcrumbs items={[["Track your order"]]} />
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl">Track your order</h1>
        <p className="mt-2 text-sm text-muted">Enter the order number from your confirmation and the mobile number you ordered with.</p>
      </header>
      <TrackForm initialNumber={typeof sp.order === "string" ? sp.order : undefined} />
    </div>
  );
}
