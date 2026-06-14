import { notFound } from "next/navigation";
import { getPlan } from "@/lib/gharsipApi";
import { SubscribeForm } from "./SubscribeForm";

export default async function SubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ apartment?: string }>;
}) {
  const { planId } = await params;
  const { apartment } = await searchParams;
  const plan = await getPlan(planId);

  if (!plan) notFound();

  return <SubscribeForm planId={planId} plan={plan} apartment={apartment} />;
}
