import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List the signed-in user's recurring tasks (name, category, time window, days of week and workout details).",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe('Optional category filter: כושר, לימודים, כסף, משמעת, אישי'),
    limit: z.number().int().optional().describe("Max tasks to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("tasks")
      .select("id,name,category,start_time,end_time,days,meaning,workout_details")
      .order("start_time", { ascending: true })
      .limit(Math.min(limit ?? 50, 200));
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) return failure(error.message);
    return ok(JSON.stringify(data ?? [], null, 2), { tasks: data ?? [] });
  },
});
