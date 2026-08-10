import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasksTool from "./tools/list-tasks";
import createTaskTool from "./tools/create-task";
import completeTaskTool from "./tools/complete-task";
import getProgressTool from "./tools/get-progress";
import addJournalEntryTool from "./tools/add-journal-entry";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "daily-dominator-mcp",
  title: "Daily Dominator",
  version: "0.1.0",
  instructions:
    "Tools for Daily Dominator, a Hebrew self-discipline and fitness tracker. Use `list_tasks` to see the user's recurring tasks and workout plans, `create_task` to add one, `complete_task` to check a task off for a date, `get_progress` for XP/level/streak and recent completions, and `add_journal_entry` for the daily reflection journal. All dates are Asia/Jerusalem and all user-facing text is Hebrew.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasksTool, createTaskTool, completeTaskTool, getProgressTool, addJournalEntryTool],
});
