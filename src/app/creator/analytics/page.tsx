'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { fetchCreatorStats, CreatorStats } from "@/lib/analytics";
import { CreatorStatsPanel } from "@/components/analytics/CreatorStatsPanel";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function CreatorAnalyticsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "creator") { router.push("/dashboard"); return; }

      const data = await fetchCreatorStats(user.id);
      setStats(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <main className="min-h-screen bg-[#060d17] text-white flex items-center justify-center">
      <p className="text-slate-400 text-sm animate-pulse">Loading analytics...</p>
    </main>
  );

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

        {stats && <CreatorStatsPanel stats={stats} />}
      </div>
    </main>
  );
}