import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a new recurring task for the signed-in user. Optionally include per-day workout details.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Task name in Hebrew."),
    category: z
      .enum(["כושר", "לימודים", "כסף", "משמעת", "אישי"])
      .describe("Task category."),
    days: z
      .array(z.enum(["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]))
      .describe("Days of the week the task repeats on."),
    startTime: z.string().describe('Start time "HH:MM".'),
    endTime: z.string().describe('End time "HH:MM".'),
    meaning: z.string().optional().describe("Why this task matters."),
    workoutDetails: z
      .array(
        z.object({
          day: z.string().describe("Day of week in Hebrew."),
          description: z
            .string()
            .describe('Exercises, e.g. "1. לחיצת חזה – 4x8-10, 2. ..."'),
        }),
      )
      .optional()
      .describe("Per-day workout plan, only for כושר tasks."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .insert({
        user_id: ctx.getUserId(),
        name: input.name,
        category: input.category,
        days: input.days,
        start_time: input.startTime,
        end_time: input.endTime,
        meaning: input.meaning ?? null,
        workout_details: input.workoutDetails ?? null,
      })
      .select("id,name,category,days,start_time,end_time")
      .single();

    if (error) return failure(error.message);
    return ok(`נוצרה משימה: ${data.name}`, { task: data });
  },
});
