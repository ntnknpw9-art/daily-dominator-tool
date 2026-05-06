import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2, History, Trash2, RotateCcw, Sparkles, Droplets, Apple, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import ApplyPlanDialog from './ApplyPlanDialog';

interface AppliedPlanRow {
  id: string;
  plan: any;
  summary: string | null;
  applied_targets: boolean;
  applied_nutrition: boolean;
  applied_training: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PlanHistoryDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AppliedPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reapplyPlan, setReapplyPlan] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('applied_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, user?.id]);

  const remove = async (id: string) => {
    await supabase.from('applied_plans').delete().eq('id', id);
    toast.success('נמחק');
    load();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              היסטוריית תוכניות שהוחלו
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              טוען...
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              עדיין לא הוחלו תוכניות. החל תוכנית מהניתוח של ה-AI כדי שתופיע כאן.
            </div>
          )}

          <div className="space-y-2">
            {rows.map(r => {
              const date = new Date(r.created_at).toLocaleString('he-IL', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              });
              return (
                <div key={r.id} className="bg-muted/30 border border-border/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{date}</div>
                    <div className="flex gap-1">
                      {r.applied_targets && <Droplets className="w-3.5 h-3.5 text-blue-400" />}
                      {r.applied_nutrition && <Apple className="w-3.5 h-3.5 text-green-400" />}
                      {r.applied_training && <Dumbbell className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </div>
                  {r.summary && <div className="text-sm font-semibold">{r.summary}</div>}
                  {r.plan?.training?.schedule?.length ? (
                    <div className="text-xs text-muted-foreground">
                      {r.plan.training.split_type && <span>תוכנית {r.plan.training.split_type} · </span>}
                      {r.plan.training.schedule.map((s: any) => s.day).join(', ')}
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setReapplyPlan(r.plan)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 ml-1" />
                      החל מחדש / ערוך
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {reapplyPlan && (
        <ApplyPlanDialog
          open={!!reapplyPlan}
          onOpenChange={(v) => { if (!v) { setReapplyPlan(null); load(); } }}
          initialPlan={reapplyPlan}
        />
      )}
    </>
  );
};

export default PlanHistoryDialog;
