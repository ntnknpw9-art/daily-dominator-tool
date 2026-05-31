import { Link } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import { SubscriptionDiagnostics } from '@/components/SubscriptionDiagnostics';

const DiagnosticsPage = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="w-3 h-3" />
            חזרה
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-semibold">RevenueCat / StoreKit Status</h1>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          האבחון מופעל אוטומטית. כל שלב מציג זמן ביצוע ותוצאת PASS / FAIL — כולל
          init, REST offerings, runtime, StoreKit native, ו-CustomerInfo.
        </p>

        <SubscriptionDiagnostics autoRun />
      </div>
    </div>
  );
};

export default DiagnosticsPage;
