"use client";

import { TopicPerformance } from "@/lib/analytics";

interface Props {
  data: TopicPerformance[];
}

function getHeatColor(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 85) return { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-400", label: "Strong" };
  if (pct >= 75) return { bg: "bg-cyan-500/20 border-cyan-500/40", text: "text-cyan-400", label: "Passing" };
  if (pct >= 60) return { bg: "bg-amber-500/20 border-amber-500/40", text: "text-amber-400", label: "Needs work" };
  if (pct >= 40) return { bg: "bg-orange-500/20 border-orange-500/40", text: "text-orange-400", label: "Weak" };
  return { bg: "bg-red-500/20 border-red-500/40", text: "text-red-400", label: "Critical" };
}

export function TopicHeatmap({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Complete topic-based exams to see your weakness map.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.avg_percentage - b.avg_percentage);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "Critical", color: "bg-red-500/30 text-red-400" },
          { label: "Weak", color: "bg-orange-500/30 text-orange-400" },
          { label: "Needs work", color: "bg-amber-500/30 text-amber-400" },
          { label: "Passing", color: "bg-cyan-500/30 text-cyan-400" },
          { label: "Strong", color: "bg-emerald-500/30 text-emerald-400" },
        ].map((l) => (
          <span key={l.label} className={`px-2 py-0.5 rounded font-mono ${l.color}`}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((topic) => {
          const { bg, text, label } = getHeatColor(topic.avg_percentage);
          const barWidth = Math.round(topic.avg_percentage);
          return (
            <div
              key={topic.topic_id}
              className={`border rounded-lg p-3 ${bg} transition-all hover:scale-[1.01] cursor-default`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white text-sm font-medium leading-tight">
                    {topic.topic_name}
                  </p>
                  <p className={`text-xs font-mono mt-0.5 ${text}`}>{label}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold font-mono tabular-nums ${text}`}>
                    {Math.round(topic.avg_percentage)}%
                  </p>
                  <p className="text-slate-500 text-xs">{topic.attempts} attempt{topic.attempts !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    topic.avg_percentage >= 85
                      ? "bg-emerald-500"
                      : topic.avg_percentage >= 75
                      ? "bg-cyan-500"
                      : topic.avg_percentage >= 60
                      ? "bg-amber-500"
                      : topic.avg_percentage >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Best / Worst */}
              <div className="flex gap-3 mt-2 text-xs text-slate-500 font-mono">
                <span>
                  Best: <span className="text-emerald-400">{Math.round(topic.best_score)}%</span>
                </span>
                <span>
                  Worst: <span className="text-red-400">{Math.round(topic.worst_score)}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}