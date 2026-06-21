import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./lib/theme";
import { installGlobalErrorLogger } from "./lib/errorLogger";

installGlobalErrorLogger();

declare global {
  interface Window {
    __showDailyDominatorStartupError?: (message: string) => void;
  }
}

try {
  initTheme();

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element #root was not found");

  createRoot(root).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  window.__showDailyDominatorStartupError?.(message);
  throw error;
}
