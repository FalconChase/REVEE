"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CreatorStats } from "@/lib/analytics";
import { Users, BookOpen, ClipboardCheck, TrendingUp, Star, AlertTriangle } from "lucide-react";

interface Props {
  stats: CreatorStats;
}

const DIST_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22d3ee", "#10b981"];

const DistTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b2e] border border-cyan-900/40 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white text-sm font-bold">{payload[0].payload.range}</p>
      <p className="text-cyan-400 text-sm">{payload[0].value} students</p>
    </div>
  );
};

const EnrollTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b2e] border border-cyan-900/40 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-cyan-400 text-xs">{payload[0].payload.module_title}</p>
      <p className="text-white text-sm font-bold">{payload[0].value} enrolled</p>
    </div>
  );
};

export function CreatorStatsPanel({ stats }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Modules",
            value: stats.total_modules,
            icon: BookOpen,
            color: "text-cyan-400 bg-cyan-500/10",
          },
          {
            label: "Enrolled",
            value: stats.total_enrolled,
            icon: Users,
            color: "text-purple-400 bg-purple-500/10",
          },
          {
            label: "Exams Taken",
            value: stats.total_exam_results,
            icon: ClipboardCheck,
            color: "text-emerald-400 bg-emerald-500/10",
          },
          {
            label: "Avg Score",
            value: `${stats.avg_score_across_modules}%`,
            icon: TrendingUp,
            color:
              stats.avg_score_across_modules >= 75
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-amber-400 bg-amber-500/10",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3 hover:border-cyan-900/50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon size={16} />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">
                {card.label}
              </p>
              <p className="text-white text-xl font-bold font-mono tabular-nums mt-0.5">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Topic insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
            <Star size={16} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
              Strongest Topic
            </p>
            <p className="text-emerald-400 font-semibold">
              {stats.top_performing_topic}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Highest avg across learners</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-1">
              Needs Attention
            </p>
            <p className="text-amber-400 font-semibold">{stats.weakest_topic}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              Lowest avg — consider adding content
            </p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
            Score Distribution
          </h3>
          {stats.total_exam_results === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No exam data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.score_distribution}
                margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
              >
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DistTooltip />} cursor={{ fill: "rgba(34,211,238,0.05)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {stats.score_distribution.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Enrollments by module */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">
            Enrollments by Module
          </h3>
          {stats.enrollments_by_module.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No enrollments yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.enrollments_by_module}
                margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
              >
                <XAxis
                  dataKey="title"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v.length > 14 ? v.slice(0, 12) + "…" : v
                  }
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<EnrollTooltip />} cursor={{ fill: "rgba(34,211,238,0.05)" }} />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}