import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { failure, ok, supabaseForUser, todayInJerusalem, unauthenticated } from "../supabase";

export default defineTool({
  name: "add_journal_entry",
  title: "Add reflection journal entry",
  description:
    "Create or update the signed-in user's daily reflection journal entry (what was learned, what was hard, what to improve, gratitude, day score).",
  inputSchema: {
    date: z.string().optional().describe('Date "YYYY-MM-DD". Defaults to today in Asia/Jerusalem.'),
    learned: z.string().optional().describe("What the user learned today."),
    hard: z.string().optional().describe("What was hard today."),
    improve: z.string().optional().describe("What to improve tomorrow."),
    grateful: z.string().optional().describe("What the user is grateful for."),
    score: z.number().int().optional().describe("Day score 1-10."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ date, learned, hard, improve, grateful, score }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const entryDate = date ?? todayInJerusalem();
    if (score !== undefined && (score < 1 || score > 10)) {
      return failure("score חייב להיות בין 1 ל-10");
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("journal_entries")
      .upsert(
        {
          user_id: ctx.getUserId(),
          entry_date: entryDate,
          learned: learned ?? null,
          hard: hard ?? null,
          improve: improve ?? null,
          grateful: grateful ?? null,
          score: score ?? null,
        },
        { onConflict: "user_id,entry_date" },
      )
      .select("id,entry_date,score")
      .single();

    if (error) return failure(error.message);
    return ok(`נשמר יומן ל-${entryDate}`, { entry: data });
  },
});
