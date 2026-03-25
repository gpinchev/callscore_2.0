import { createServerClient } from "@/lib/supabase/server";
import { EngageTopBar } from "@/components/layout/engage-top-bar";
import { EngageSidebar } from "@/components/layout/engage-sidebar";
import { CallScoreSubNav } from "@/components/layout/callscore-subnav";
import { notFound } from "next/navigation";

// Hardcoded demo org — always accessible, DB returns empty → mock data shows
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = createServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    if (orgId !== DEMO_ORG_ID) notFound();
  }

  return (
    <div className="flex h-screen flex-col">
      <EngageTopBar />
      <div className="flex flex-1 overflow-hidden">
        <EngageSidebar orgId={orgId} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CallScoreSubNav orgId={orgId} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
