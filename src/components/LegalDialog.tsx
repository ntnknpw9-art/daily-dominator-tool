import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export type LegalKind = 'terms' | 'privacy';

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LegalKind;
}

const TermsContent = () => (
  <div className="space-y-4 text-sm leading-7" dir="rtl">
    <p className="text-xs text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">1. הסכמה</h3>
      <p>השימוש באפליקציה מהווה את הסכמתך המלאה לתנאים אלה. אם אינך מסכים, אל תשתמש באפליקציה.</p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">2. מנויים ותשלומים (Auto-Renewable Subscription)</h3>
      <p>
        המנוי Daily Dominator Pro מוצע בשני מסלולים: חודשי (₪39.90 לחודש) ושנתי (₪179.90 לשנה).
        התשלום יחויב מחשבון ה-Apple ID שלך בעת אישור הרכישה. המנוי מתחדש אוטומטית באותו מחיר
        בסוף כל תקופה אלא אם בוטל לפחות 24 שעות לפני תום התקופה. ניתן לנהל ולבטל את המנוי בכל
        עת דרך הגדרות חשבון ה-Apple ID &gt; Subscriptions. לא ניתן לקבל החזר על תקופה שכבר חויבה.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">3. דיסקליימר רפואי / תזונה</h3>
      <p>
        האפליקציה מספקת מידע כללי בתחומי כושר, תזונה ופרודוקטיביות בלבד, ואינה מהווה ייעוץ
        רפואי, אבחון או טיפול. ערכים קלוריים, המלצות AI ותכניות אימון הם הערכות בלבד.
        התייעץ עם רופא או דיאטן מוסמך לפני כל שינוי תזונתי או אימון משמעותי.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">4. מדיניות אפס סובלנות לתוכן פוגעני</h3>
      <p>
        אסור להעלות, לשתף, להגיב או לפרסם תוכן הכולל: עירום, פורנוגרפיה, אלימות, הסתה, גזענות,
        הטרדה, איומים, או כל תוכן בלתי חוקי או פוגעני. אנו שומרים לעצמנו את הזכות להסיר תוכן
        ולחסום משתמשים מיידית.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">5. דיווח, חסימה ומחיקה</h3>
      <p>
        כל משתמש יכול לדווח על תוכן פוגעני ולחסום משתמשים אחרים. אנו מתחייבים לבדוק כל דיווח
        ולהסיר תוכן מפר בתוך 24 שעות מהקבלה.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">6. אחריות המשתמש</h3>
      <p>
        אתה אחראי באופן בלעדי לתוכן שאתה מעלה. אסור להעלות תמונות של אדם אחר ללא הסכמתו, או
        תוכן שמפר זכויות יוצרים.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">7. סיום שירות</h3>
      <p>אנו רשאים לחסום או למחוק חשבון שמפר תנאים אלה ללא התראה מוקדמת.</p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">8. הגבלת אחריות</h3>
      <p>השירות ניתן "כפי שהוא" (AS IS). איננו אחראים לכל נזק ישיר או עקיף הנובע משימוש באפליקציה.</p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">9. יצירת קשר</h3>
      <p>
        <a className="text-primary underline" href="mailto:ntnknpw9@gmail.com">ntnknpw9@gmail.com</a>
      </p>
    </section>
  </div>
);

const PrivacyContent = () => (
  <div className="space-y-4 text-sm leading-7" dir="rtl">
    <p className="text-xs text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">1. מידע שאנחנו אוספים</h3>
      <p>
        כתובת אימייל ושם תצוגה, נתוני שימוש (משימות, צ'אלנג'ים, מדידות גוף), תמונות שאתה
        מעלה, ונתונים טכניים בסיסיים (סוג מכשיר, גרסת אפליקציה).
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">2. שימוש במידע</h3>
      <p>
        אנו משתמשים במידע כדי לספק את שירותי האפליקציה, לאפשר התחברות, לשמור את ההתקדמות
        שלך ולהציג לך תכנים מותאמים. איננו מוכרים מידע אישי לצדדים שלישיים.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">3. אחסון ואבטחה</h3>
      <p>
        הנתונים נשמרים בשרתי Lovable Cloud עם הצפנה והרשאות גישה ברמת שורה (RLS). רק אתה יכול
        לגשת לנתונים האישיים שלך.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">4. התחברות עם Apple / Google</h3>
      <p>
        כאשר אתה מתחבר עם Apple או Google, אנו מקבלים את כתובת האימייל ושם תצוגה בלבד. איננו
        ניגשים לאנשי קשר, יומן, או כל מידע אחר במכשיר שלך.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">5. תוכן שנוצר על ידי משתמשים (UGC)</h3>
      <p>
        אם אתה מעלה תמונות התקדמות לקהילה, התמונות גלויות למשתמשים אחרים. אתה יכול למחוק את
        התמונות שלך בכל עת. אנו מסירים תוכן פוגעני בתוך 24 שעות מקבלת דיווח.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">6. מנויים בתשלום</h3>
      <p>
        רכישות מנויים מתבצעות דרך Apple App Store. איננו אוספים או שומרים פרטי תשלום — Apple
        מטפלת בעיבוד התשלום ובחיוב. אנו מקבלים מ-Apple רק את סטטוס המנוי (פעיל/לא פעיל) דרך
        RevenueCat.
      </p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">7. הזכויות שלך</h3>
      <p>אתה יכול למחוק את חשבונך והנתונים שלך בכל עת מתוך הגדרות &gt; מחק חשבון.</p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">8. ילדים</h3>
      <p>האפליקציה מיועדת למשתמשים בני 13 ומעלה.</p>
    </section>

    <section className="space-y-1">
      <h3 className="text-base font-semibold">9. יצירת קשר</h3>
      <p>
        לכל שאלה: <a className="text-primary underline" href="mailto:ntnknpw9@gmail.com">ntnknpw9@gmail.com</a>
      </p>
    </section>
  </div>
);

const LegalDialog = ({ open, onOpenChange, kind }: LegalDialogProps) => {
  const title = kind === 'terms' ? 'תנאי שימוש (EULA)' : 'מדיניות פרטיות';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-lg max-h-[85vh] p-0 gap-0 flex flex-col"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40 shrink-0">
          <DialogTitle className="text-right text-lg">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-5 py-4">
          {kind === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LegalDialog;
