import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, todayInJerusalem, unauthenticated } from "../supabase";

export default defineTool({
  name: "complete_task",
  title: "Mark task complete",
  description:
    "Mark one of the signed-in user's tasks as completed (or not completed) for a given date.",
  inputSchema: {
    taskId: z.string().uuid().describe("Task id from list_tasks."),
    date: z
      .string()
      .optional()
      .describe('Date "YYYY-MM-DD". Defaults to today in Asia/Jerusalem.'),
    completed: z.boolean().optional().describe("Defaults to true."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ taskId, date, completed }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const completionDate = date ?? todayInJerusalem();
    const isDone = completed ?? true;

    const { data, error } = await supabaseForUser(ctx)
      .from("task_completions")
      .upsert(
        {
          user_id: ctx.getUserId(),
          task_id: taskId,
          completion_date: completionDate,
          completed: isDone,
        },
        { onConflict: "task_id,completion_date" },
      )
      .select("id,task_id,completion_date,completed")
      .single();

    if (error) return failure(error.message);
    return ok(
      isDone ? `סומן כהושלם ל-${completionDate}` : `סימון הושלם בוטל ל-${completionDate}`,
      { completion: data },
    );
  },
});
