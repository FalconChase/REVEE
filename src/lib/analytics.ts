import { createClient } from "@/lib/supabase";

export interface ScoreTrend {
  date: string;
  score: number;
  percentage: number;
  topic: string;
  mode: string;
}

export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  avg_percentage: number;
  attempts: number;
  best_score: number;
  worst_score: number;
}

export interface ModulePerformance {
  module_id: string;
  module_title: string;
  avg_percentage: number;
  total_attempts: number;
  last_taken: string;
}

export interface CreatorStats {
  total_modules: number;
  total_enrolled: number;
  total_exam_results: number;
  avg_score_across_modules: number;
  top_performing_topic: string;
  weakest_topic: string;
  enrollments_by_module: { module_title: string; count: number }[];
  score_distribution: { range: string; count: number }[];
}

export interface LearnerAnalytics {
  total_exams: number;
  avg_percentage: number;
  best_percentage: number;
  improvement: number; // % change from first 3 vs last 3 exams
  score_trends: ScoreTrend[];
  topic_performance: TopicPerformance[];
  module_performance: ModulePerformance[];
  streak_days: number;
}

export async function fetchLearnerAnalytics(userId: string): Promise<LearnerAnalytics> {
  const supabase = createClient();

  const { data: results, error } = await supabase
    .from("exam_results")
    .select(`
      id,
      score,
      total,
      percentage,
      taken_at,
      mode,
      topic_id,
      module_id,
      modules(title),
      question_topics(name)
    `)
    .eq("user_id", userId)
    .order("taken_at", { ascending: true });

  if (error || !results || results.length === 0) {
    return {
      total_exams: 0,
      avg_percentage: 0,
      best_percentage: 0,
      improvement: 0,
      score_trends: [],
      topic_performance: [],
      module_performance: [],
      streak_days: 0,
    };
  }

  const total_exams = results.length;
  const avg_percentage =
    results.reduce((sum, r) => sum + (r.percentage || 0), 0) / total_exams;
  const best_percentage = Math.max(...results.map((r) => r.percentage || 0));

  // Improvement: compare first 3 vs last 3
  let improvement = 0;
  if (results.length >= 6) {
    const first3Avg =
      results.slice(0, 3).reduce((s, r) => s + (r.percentage || 0), 0) / 3;
    const last3Avg =
      results.slice(-3).reduce((s, r) => s + (r.percentage || 0), 0) / 3;
    improvement = last3Avg - first3Avg;
  }

  // Score trends
  const score_trends: ScoreTrend[] = results.map((r) => ({
    date: new Date(r.taken_at).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    }),
    score: r.score,
    percentage: Math.round(r.percentage || 0),
    topic: (r.question_topics as any)?.name || "General",
    mode: r.mode || "standard",
  }));

  // Topic performance aggregation
  const topicMap = new Map<string, { name: string; scores: number[] }>();
  for (const r of results) {
    const tid = r.topic_id || "general";
    const tname = (r.question_topics as any)?.name || "General";
    if (!topicMap.has(tid)) topicMap.set(tid, { name: tname, scores: [] });
    topicMap.get(tid)!.scores.push(r.percentage || 0);
  }

  const topic_performance: TopicPerformance[] = Array.from(
    topicMap.entries()
  ).map(([topic_id, { name, scores }]) => ({
    topic_id,
    topic_name: name,
    avg_percentage: scores.reduce((a, b) => a + b, 0) / scores.length,
    attempts: scores.length,
    best_score: Math.max(...scores),
    worst_score: Math.min(...scores),
  }));

  // Module performance aggregation
  const moduleMap = new Map<string, { title: string; scores: number[]; last: string }>();
  for (const r of results) {
    const mid = r.module_id || "unknown";
    const mtitle = (r.modules as any)?.title || "Unknown Module";
    if (!moduleMap.has(mid)) moduleMap.set(mid, { title: mtitle, scores: [], last: r.taken_at });
    moduleMap.get(mid)!.scores.push(r.percentage || 0);
    if (new Date(r.taken_at) > new Date(moduleMap.get(mid)!.last)) {
      moduleMap.get(mid)!.last = r.taken_at;
    }
  }

  const module_performance: ModulePerformance[] = Array.from(
    moduleMap.entries()
  ).map(([module_id, { title, scores, last }]) => ({
    module_id,
    module_title: title,
    avg_percentage: scores.reduce((a, b) => a + b, 0) / scores.length,
    total_attempts: scores.length,
    last_taken: last,
  }));

  // Streak calculation
  const examDates = [
    ...new Set(results.map((r) => new Date(r.taken_at).toDateString())),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak_days = 0;
  const today = new Date().toDateString();
  let checkDate = new Date();
  for (const d of examDates) {
    if (d === checkDate.toDateString()) {
      streak_days++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  return {
    total_exams,
    avg_percentage: Math.round(avg_percentage),
    best_percentage: Math.round(best_percentage),
    improvement: Math.round(improvement * 10) / 10,
    score_trends,
    topic_performance,
    module_performance,
    streak_days,
  };
}

export async function fetchCreatorStats(userId: string): Promise<CreatorStats> {
  const supabase = createClient();

  const [modulesRes, enrollmentsRes, resultsRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title")
      .eq("created_by", userId),
    supabase
      .from("module_enrollments")
      .select("module_id, modules(title)")
      .in(
        "module_id",
        (
          await supabase
            .from("modules")
            .select("id")
            .eq("created_by", userId)
        ).data?.map((m) => m.id) || []
      ),
    supabase
      .from("exam_results")
      .select("percentage, topic_id, module_id, question_topics(name), modules(title)")
      .in(
        "module_id",
        (
          await supabase
            .from("modules")
            .select("id")
            .eq("created_by", userId)
        ).data?.map((m) => m.id) || []
      ),
  ]);

  const modules = modulesRes.data || [];
  const enrollments = enrollmentsRes.data || [];
  const results = resultsRes.data || [];

  // Enrollments by module
  const enrollByModule = new Map<string, { module_title: string; count: number }>();
  for (const e of enrollments) {
    const mid = e.module_id;
    const module_title = (e.modules as any)?.title || "Unknown";
    if (!enrollByModule.has(mid)) enrollByModule.set(mid, { module_title, count: 0 });
    enrollByModule.get(mid)!.count++;
  }

  // Score distribution buckets
  const dist = [
    { range: "0-49%", count: 0 },
    { range: "50-64%", count: 0 },
    { range: "65-74%", count: 0 },
    { range: "75-84%", count: 0 },
    { range: "85-100%", count: 0 },
  ];
  for (const r of results) {
    const p = r.percentage || 0;
    if (p < 50) dist[0].count++;
    else if (p < 65) dist[1].count++;
    else if (p < 75) dist[2].count++;
    else if (p < 85) dist[3].count++;
    else dist[4].count++;
  }

  // Top/weakest topic
  const topicScores = new Map<string, number[]>();
  for (const r of results) {
    const tname = (r.question_topics as any)?.name || "General";
    if (!topicScores.has(tname)) topicScores.set(tname, []);
    topicScores.get(tname)!.push(r.percentage || 0);
  }
  let topTopic = "-",
    weakTopic = "-";
  let topAvg = -1,
    weakAvg = 101;
  for (const [name, scores] of topicScores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > topAvg) { topAvg = avg; topTopic = name; }
    if (avg < weakAvg) { weakAvg = avg; weakTopic = name; }
  }

  return {
    total_modules: modules.length,
    total_enrolled: enrollments.length,
    total_exam_results: results.length,
    avg_score_across_modules:
      results.length > 0
        ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length)
        : 0,
    top_performing_topic: topTopic,
    weakest_topic: weakTopic,
    enrollments_by_module: Array.from(enrollByModule.values()),
    score_distribution: dist,
  };
}