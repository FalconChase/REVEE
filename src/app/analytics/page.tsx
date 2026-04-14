import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchLearnerAnalytics } from "@/lib/analytics";
import { ScoreTrendChart } from "@/components/analytics/ScoreTrendChart";
import { TopicHeatmap } from "@/components/analytics/TopicHeatmap";
import { PerformanceStats } from "@/components/analytics/PerformanceStats";
import { ModuleBreakdown } from "@/components/analytics/ModuleBreakdown";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const analytics = await fetchLearnerAnalytics(session.user.id);

  return (
    <main className="min-h-screen bg-[#060d17] text-white">
      {/* Blueprint grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight">
              Performance Analytics
            </h1>
          </div>
        </div>

        {analytics.total_exams === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <BarChart2 size={28} className="text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
            <p className="text-slate-400 text-sm max-w-sm">
              Take your first exam to start tracking your performance and
              identifying areas to improve.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-900 font-semibold text-sm hover:bg-cyan-400 transition-colors"
            >
              Go to Modules
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat cards */}
            <PerformanceStats
              totalExams={analytics.total_exams}
              avgPercentage={analytics.avg_percentage}
              bestPercentage={analytics.best_percentage}
              improvement={analytics.improvement}
              streakDays={analytics.streak_days}
            />

            {/* Score Trend + Module Breakdown row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score trend — wider */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
                  Score Trend
                </h2>
                <ScoreTrendChart data={analytics.score_trends} />
              </div>

              {/* Module breakdown */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
                  By Module
                </h2>
                <ModuleBreakdown data={analytics.module_performance} />
              </div>
            </div>

            {/* Topic Heatmap */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  Topic Weakness Heatmap
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Sorted: weakest first
                </span>
              </div>
              <TopicHeatmap data={analytics.topic_performance} />
            </div>

            {/* Recent activity table */}
            {analytics.score_trends.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
                  Recent Exams
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                        <th className="text-left pb-2 font-medium">Date</th>
                        <th className="text-left pb-2 font-medium">Topic</th>
                        <th className="text-left pb-2 font-medium">Mode</th>
                        <th className="text-right pb-2 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {[...analytics.score_trends]
                        .reverse()
                        .slice(0, 10)
                        .map((exam, i) => (
                          <tr
                            key={i}
                            className="text-slate-300 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-2.5 font-mono text-xs text-slate-500">
                              {exam.date}
                            </td>
                            <td className="py-2.5 text-slate-200 max-w-[180px] truncate">
                              {exam.topic}
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400 capitalize">
                                {exam.mode}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`font-bold font-mono tabular-nums ${
                                  exam.percentage >= 75
                                    ? "text-emerald-400"
                                    : exam.percentage >= 50
                                    ? "text-amber-400"
                                    : "text-red-400"
                                }`}
                              >
                                {exam.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}