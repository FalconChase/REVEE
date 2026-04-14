import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchCreatorStats } from "@/lib/analytics";
import { CreatorStatsPanel } from "@/components/analytics/CreatorStatsPanel";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreatorAnalyticsPage() {
  const cookieStore = await cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { get: (name) => cookieStore.get(name)?.value } }
);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  // Check role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!user || user.role !== "creator") redirect("/dashboard");

  const stats = await fetchCreatorStats(session.user.id);

  return (
    <main className="min-h-screen bg-[#060d17] text-white">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/creator"
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Creator Panel
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight">Creator Analytics</h1>
          </div>
        </div>

        <CreatorStatsPanel stats={stats} />
      </div>
    </main>
  );
}