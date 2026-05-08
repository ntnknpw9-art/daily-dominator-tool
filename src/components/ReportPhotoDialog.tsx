import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';

const REASONS = [
  { value: 'sexual', label: 'תוכן מיני / עירום' },
  { value: 'violence', label: 'אלימות / איומים' },
  { value: 'harassment', label: 'הטרדה / הסתה' },
  { value: 'spam', label: 'ספאם / הונאה' },
  { value: 'copyright', label: 'הפרת זכויות' },
  { value: 'other', label: 'אחר' },
];

interface Props {
  photoId: string;
  trigger?: React.ReactNode;
}

const ReportPhotoDialog = ({ photoId, trigger }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('photo_reports').insert({
        reporter_id: user.id,
        photo_id: photoId,
        reason,
        details: details.trim() || null,
      });
      if (error && !error.message.includes('duplicate')) throw error;
      toast.success('הדיווח התקבל. נטפל בזה תוך 24 שעות.');
      setOpen(false);
      setReason(null);
      setDetails('');
    } catch (e: any) {
      toast.error('שגיאה בשליחת דיווח');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        title="דווח על תוכן"
      >
        {trigger || <Flag className="w-3.5 h-3.5" />}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>דיווח על תוכן פוגעני</AlertDialogTitle>
            <AlertDialogDescription>
              נבדוק את הדיווח ונסיר תוכן פוגעני תוך 24 שעות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map(r => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={reason === r.value ? 'default' : 'outline'}
                  onClick={() => setReason(r.value)}
                  className="text-xs"
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="פרטים נוספים (אופציונלי)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="h-20 resize-none"
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={!reason || submitting}>
              {submitting ? 'שולח...' : 'שלח דיווח'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReportPhotoDialog;
