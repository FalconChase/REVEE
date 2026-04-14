"use client";

import { TrendingUp, TrendingDown, Minus, Award, Flame, Target, BookOpen } from "lucide-react";

interface Props {
  totalExams: number;
  avgPercentage: number;
  bestPercentage: number;
  improvement: number;
  streakDays: number;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 hover:border-cyan-900/60 transition-colors">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-2xl font-bold font-mono tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function PerformanceStats({
  totalExams,
  avgPercentage,
  bestPercentage,
  improvement,
  streakDays,
}: Props) {
  const ImprovementIcon =
    improvement > 0 ? TrendingUp : improvement < 0 ? TrendingDown : Minus;
  const improvementColor =
    improvement > 0 ? "text-emerald-400" : improvement < 0 ? "text-red-400" : "text-slate-400";
  const improvementBg =
    improvement > 0 ? "bg-emerald-500/10 text-emerald-400" : improvement < 0 ? "bg-red-500/10 text-red-400" : "bg-slate-700/30 text-slate-400";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total Exams"
        value={totalExams}
        sub="completed"
        icon={BookOpen}
        color="bg-cyan-500/10 text-cyan-400"
      />
      <StatCard
        label="Avg Score"
        value={`${avgPercentage}%`}
        sub={avgPercentage >= 75 ? "Passing average" : "Below passing"}
        icon={Target}
        color={avgPercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}
      />
      <StatCard
        label="Best Score"
        value={`${bestPercentage}%`}
        sub="personal record"
        icon={Award}
        color="bg-purple-500/10 text-purple-400"
      />
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 hover:border-cyan-900/60 transition-colors">
        <div className={`p-2 rounded-lg ${improvementBg}`}>
          <ImprovementIcon size={18} />
        </div>
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Trend</p>
          <p className={`text-2xl font-bold font-mono tabular-nums mt-0.5 ${improvementColor}`}>
            {improvement > 0 ? "+" : ""}{improvement}%
          </p>
          <p className="text-slate-500 text-xs mt-0.5">vs first attempts</p>
        </div>
      </div>
    </div>
  );
}