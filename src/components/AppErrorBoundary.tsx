import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

declare global {
  interface Window {
    __showDailyDominatorStartupError?: (message: string) => void;
  }
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[AppErrorBoundary] render failed:', error);
    window.__showDailyDominatorStartupError?.(error.message);
    import('@/lib/errorLogger').then(({ logError }) => {
      logError({
        message: error.message || 'React render error',
        severity: 'critical',
        source: 'client',
        stack: error.stack,
        context: { componentStack: info?.componentStack?.slice(0, 2000) },
      });
    }).catch(() => {});
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6" dir="rtl">
        <section className="w-full max-w-md space-y-4 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-black">Daily Dominator לא נטען</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            אירעה שגיאה בטעינת האפליקציה. אפשר לנסות לרענן, ואם זה חוזר — לפתוח מחדש את האפליקציה.
          </p>
          <pre className="max-h-32 overflow-auto rounded-lg border border-border bg-card p-3 text-left text-xs text-destructive" dir="ltr">
            {this.state.error.message}
          </pre>
          <Button onClick={() => window.location.reload()} className="w-full">
            טען מחדש
          </Button>
        </section>
      </main>
    );
  }
}