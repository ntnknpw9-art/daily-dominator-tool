import { supabase } from "@/integrations/supabase/client";

type Severity = "debug" | "info" | "warn" | "error" | "critical";
type Source =
  | "client"
  | "server"
  | "network"
  | "auth"
  | "db"
  | "payment"
  | "ai"
  | "edge_function"
  | "unknown";

const recent = new Map<string, number>();
const DEDUP_MS = 30_000;
const MAX_MSG = 1000;
const MAX_STACK = 4000;

function shouldThrottle(key: string) {
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < DEDUP_MS) return true;
  recent.set(key, now);
  if (recent.size > 200) {
    const cutoff = now - DEDUP_MS;
    for (const [k, t] of recent) if (t < cutoff) recent.delete(k);
  }
  return false;
}

// Known-benign / environmental noise we never want to log
const IGNORE_PATTERNS: RegExp[] = [
  /Refresh Token Not Found/i,
  /Invalid Refresh Token/i,
  /AuthSessionMissingError/i,
  /Auth session missing/i,
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /Failed to fetch.*lovable\.js/i,
];

export async function logError(opts: {
  message: string;
  severity?: Severity;
  source?: Source;
  stack?: string;
  context?: Record<string, unknown>;
}) {
  try {
    const message = String(opts.message || "Unknown error").slice(0, MAX_MSG);
    const severity = opts.severity || "error";
    const source = opts.source || "client";
    const stack = opts.stack ? String(opts.stack).slice(0, MAX_STACK) : null;

    if (IGNORE_PATTERNS.some((re) => re.test(message) || (stack && re.test(stack)))) {
      // Auto-recover stale auth sessions silently
      if (/Refresh Token/i.test(message)) {
        try { await supabase.auth.signOut(); } catch {}
      }
      return;
    }

    const dedupKey = `${severity}|${source}|${message}`;
    if (shouldThrottle(dedupKey)) return;

    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));

    await supabase.from("app_errors" as any).insert({
      user_id: user?.id ?? null,
      severity,
      source,
      message,
      stack,
      url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      context: opts.context ?? null,
    });
  } catch {
    // never let the logger itself crash the app
  }
}

let installed = false;
export function installGlobalErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    logError({
      message: e.message || "window.onerror",
      severity: "error",
      source: "client",
      stack: e.error?.stack,
      context: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason: any = e.reason;
    const msg = reason?.message || (typeof reason === "string" ? reason : "unhandledrejection");
    logError({
      message: msg,
      severity: "error",
      source: "client",
      stack: reason?.stack,
      context: { kind: "unhandledrejection" },
    });
  });

  // Wrap fetch to catch network failures and 5xx
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    try {
      const res = await origFetch(...args);
      if (res.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        logError({
          message: `HTTP ${res.status} ${res.statusText}`,
          severity: res.status >= 500 ? "error" : "warn",
          source: "network",
          context: { url: url.slice(0, 300), status: res.status },
        });
      }
      return res;
    } catch (err: any) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url;
      logError({
        message: err?.message || "fetch failed",
        severity: "warn",
        source: "network",
        stack: err?.stack,
        context: { url: url?.slice(0, 300) },
      });
      throw err;
    }
  };

  // Capture console.error as warnings
  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ")
        .slice(0, MAX_MSG);
      const stack = args.find((a) => a instanceof Error) as Error | undefined;
      logError({
        message: msg,
        severity: "warn",
        source: "client",
        stack: stack?.stack,
      });
    } catch {}
    origConsoleError(...args);
  };
}
