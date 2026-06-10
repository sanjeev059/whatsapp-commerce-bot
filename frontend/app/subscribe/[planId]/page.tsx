import { notFound } from "next/navigation";
import { getPlan, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { SubscribeForm } from "./SubscribeForm";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const plan = isGharsipApiEnabled() ? await getPlan(planId) : null;

  if (isGharsipApiEnabled() && !plan) notFound();

  return <SubscribeForm planId={planId} plan={plan} />;
}
