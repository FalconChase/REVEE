"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { ScoreTrend } from "@/lib/analytics";

interface Props {
  data: ScoreTrend[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ScoreTrend;
  return (
    <div className="bg-[#0d1b2e] border border-cyan-900/40 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-cyan-400 text-xs font-mono mb-1">{label}</p>
      <p className="text-white text-lg font-bold">{d.percentage}%</p>
      <p className="text-slate-400 text-xs">{d.topic}</p>
      <p className="text-slate-500 text-xs capitalize mt-0.5">{d.mode} mode</p>
    </div>
  );
};

export function ScoreTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No exam data yet. Take your first exam to see trends.
      </div>
    );
  }

  const passingLine = 75;
  const avg = Math.round(data.reduce((s, d) => s + d.percentage, 0) / data.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-cyan-400 inline-block rounded" />
          Your score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded border-dashed" />
          Passing (75%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-500 inline-block rounded border-dashed" />
          Your avg ({avg}%)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a4a" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
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
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={passingLine}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={avg}
            stroke="#475569"
            strokeDasharray="2 4"
            strokeOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="percentage"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color =
                payload.percentage >= 75 ? "#10b981" : payload.percentage >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={color}
                  stroke="#0d1b2e"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, fill: "#22d3ee", stroke: "#0d1b2e", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}