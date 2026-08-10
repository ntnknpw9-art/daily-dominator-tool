import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, todayInJerusalem, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_progress",
  title: "Get progress & streak",
  description:
    "Get the signed-in user's discipline stats: XP, level, current and longest streak, total completed tasks, plus recent completions.",
  inputSchema: {
    days: z
      .number()
      .int()
      .optional()
      .describe("How many past days of completions to include (default 7, max 90)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const window = Math.min(Math.max(days ?? 7, 1), 90);
    const since = new Date(Date.now() - window * 86_400_000).toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);

    const [statsRes, completionsRes] = await Promise.all([
      supabase
        .from("user_stats")
        .select("xp,level,current_streak,longest_streak,total_tasks_completed,last_active_date")
        .eq("user_id", ctx.getUserId())
        .maybeSingle(),
      supabase
        .from("task_completions")
        .select("task_id,completion_date,completed")
        .gte("completion_date", since)
        .order("completion_date", { ascending: false })
        .limit(500),
    ]);

    if (statsRes.error) return failure(statsRes.error.message);
    if (completionsRes.error) return failure(completionsRes.error.message);

    const payload = {
      today: todayInJerusalem(),
      stats: statsRes.data ?? null,
      windowDays: window,
      completions: completionsRes.data ?? [],
    };
    return ok(JSON.stringify(payload, null, 2), payload);
  },
});
