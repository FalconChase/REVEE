"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ModulePerformance } from "@/lib/analytics";

interface Props {
  data: ModulePerformance[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ModulePerformance;
  return (
    <div className="bg-[#0d1b2e] border border-cyan-900/40 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-cyan-400 text-xs font-mono mb-1">{d.module_title}</p>
      <p className="text-white text-lg font-bold">{Math.round(d.avg_percentage)}%</p>
      <p className="text-slate-400 text-xs">{d.total_attempts} exam{d.total_attempts !== 1 ? "s" : ""}</p>
      <p className="text-slate-500 text-xs mt-0.5">
        Last:{" "}
        {new Date(d.last_taken).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
};

function getBarColor(pct: number) {
  if (pct >= 85) return "#10b981";
  if (pct >= 75) return "#22d3ee";
  if (pct >= 60) return "#f59e0b";
  if (pct >= 40) return "#f97316";
  return "#ef4444";
}

export function ModuleBreakdown({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Enroll in modules and take exams to see your module breakdown.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    avg: Math.round(d.avg_percentage),
    shortTitle:
      d.module_title.length > 16
        ? d.module_title.slice(0, 14) + "…"
        : d.module_title,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 10, bottom: 0, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a4a" strokeOpacity={0.5} />
        <XAxis
          dataKey="shortTitle"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(34,211,238,0.05)" }} />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={60}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_percentage)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}