import { notFound } from "next/navigation";
import { getPlan } from "@/lib/gharsipApi";
import { SubscribeForm } from "./SubscribeForm";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const plan = await getPlan(planId);

  if (!plan) notFound();

  return <SubscribeForm planId={planId} plan={plan} />;
}
