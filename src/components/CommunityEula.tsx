import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const EULA_VERSION = '1.0';
const EULA_KEY = `eula_accepted_${EULA_VERSION}`;

export const hasAcceptedEula = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(EULA_KEY) === 'true';
};

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const CommunityEula = ({ open, onAccept, onDecline }: Props) => {
  const { user } = useAuth();

  const handleAccept = async () => {
    localStorage.setItem(EULA_KEY, 'true');
    if (user) {
      try {
        await supabase.from('eula_acceptances').insert({
          user_id: user.id,
          version: EULA_VERSION,
        });
      } catch {}
    }
    onAccept();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onDecline(); }}>
      <AlertDialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>תנאי שימוש בקהילה</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-right space-y-3 text-sm leading-relaxed">
              <p className="font-semibold">לפני כניסה לאזור הקהילה, אנא קרא ואשר:</p>

              <p><strong>אפס סובלנות לתוכן פוגעני (EULA).</strong> הקהילה מיועדת לשיתוף התקדמות אישית בלבד. <span className="font-semibold text-destructive">אסור</span> להעלות, לפרסם או להעביר:</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>תוכן מיני, עירום או מרמז.</li>
                <li>אלימות, איומים, גזענות, הסתה או הטרדה.</li>
                <li>תוכן שאינו שייך למשתמש (זכויות יוצרים).</li>
                <li>פרטים אישיים של אחרים, ספאם או הונאה.</li>
              </ul>

              <p><strong>אכיפה.</strong> משתמשים יכולים <strong>לדווח</strong> על תוכן פוגעני ו<strong>לחסום</strong> משתמשים אחרים. אנו מתחייבים לבדוק כל דיווח ולהסיר תוכן פוגעני <strong>בתוך 24 שעות</strong> מהדיווח, ולהשעות חשבונות עבריינים.</p>

              <p><strong>אחריות.</strong> אתה לבדך אחראי לתוכן שהעלת. שימוש פוגעני יוביל למחיקה מיידית של החשבון ללא החזר.</p>

              <p>בלחיצה על "אני מסכים" אתה מאשר שקראת ומסכים לתנאים אלה.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline}>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept}>אני מסכים</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CommunityEula;
