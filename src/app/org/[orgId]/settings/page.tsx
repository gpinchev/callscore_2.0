import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SettingsForm } from "./settings-form";
import type { Organization } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Settings" };

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

const DEMO_ORG: Organization = {
  id: DEMO_ORG_ID,
  name: "Cool Air HVAC",
  industry: "HVAC",
  company_size: "11-50",
  notification_email: null,
  onboarding_completed: true,
  call_taxonomy: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  let org: Organization | null = null;

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();
    org = data;
  } catch {
    // ignore
  }

  if (!org) {
    if (orgId === DEMO_ORG_ID) {
      org = DEMO_ORG;
    } else {
      notFound();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm org={org} orgId={orgId} />
    </div>
  );
}
