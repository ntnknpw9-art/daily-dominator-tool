import { useState } from 'react';
import { Mail, HelpCircle, Shield, FileText, ChevronDown, Copy, Check } from 'lucide-react';

const FAQS = [
  {
    q: 'איך מתחילים להשתמש באפליקציה?',
    a: 'נרשמים בעזרת אימייל וסיסמה או דרך Google / Apple, ולאחר מכן נכנסים ללוח הבקרה ומוסיפים את המשימות היומיות שלכם.',
  },
  {
    q: 'איך מוחקים את החשבון?',
    a: 'בתוך האפליקציה: הגדרות → אזור מסוכן → "מחק חשבון". המחיקה מוחקת לצמיתות את החשבון וכל הנתונים מהשרת.',
  },
  {
    q: 'שכחתי את הסיסמה, מה עושים?',
    a: 'במסך ההתחברות לחצו על "שכחתי סיסמה" וקבלו קישור לאיפוס למייל. אם לא קיבלתם, בדקו בתיקיית הספאם או פנו אלינו במייל.',
  },
  {
    q: 'האם הנתונים שלי מוצפנים ומאובטחים?',
    a: 'כן. הנתונים נשמרים בשרתים מאובטחים עם הצפנה ב-Transit וב-Rest. רק אתם יכולים לגשת לנתונים שלכם דרך החשבון שלכם.',
  },
  {
    q: 'האפליקציה לא נטענת / קורסת — מה לעשות?',
    a: 'נסו לסגור ולפתוח מחדש, לוודא שיש חיבור אינטרנט תקין, ולעדכן לגרסה האחרונה מ-App Store. אם הבעיה נמשכת — שלחו לנו מייל ונחזור אליכם תוך 48 שעות.',
  },
  {
    q: 'איך מפעילים / מכבים התראות?',
    a: 'הגדרות → התראות חכמות. ניתן להפעיל ולכבות בכל עת.',
  },
  {
    q: 'האם האפליקציה בתשלום?',
    a: 'האפליקציה ניתנת לשימוש חינמי. אם בעתיד יתווספו תכונות פרימיום בתשלום — תקבלו על כך הודעה מראש.',
  },
];

const SUPPORT_EMAIL = 'ntnknpw9@gmail.com';

const SupportPage = () => {
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a0a] text-[#f2f2f2] font-heebo">
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-16">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">תמיכה - Daily Dominator</h1>
          <p className="text-white/60 text-sm md:text-base">
            כאן תמצאו תשובות לשאלות נפוצות ודרך ליצור איתנו קשר
          </p>
        </header>

        {/* About */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-[#e11d2c]" />
            <h2 className="text-xl font-semibold">על האפליקציה</h2>
          </div>
          <p className="text-white/70 leading-relaxed text-sm md:text-base">
            Daily Dominator היא אפליקציית מעקב משימות ומשמעת אישית בעברית.
            היא עוזרת לכם לבנות הרגלים, לעקוב אחר התקדמות יומית, ולשפר את המשמעת
            דרך מערכת הישגים, יעדים ודוחות שבועיים.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-8 rounded-2xl border border-[#e11d2c]/30 bg-gradient-to-br from-[#e11d2c]/10 to-transparent p-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-[#e11d2c]" />
            <h2 className="text-xl font-semibold">צור קשר</h2>
          </div>
          <p className="text-white/70 text-sm mb-4">
            יש שאלה, בעיה או הצעה לשיפור? נשמח לקבל את פנייתכם במייל.
            אנו משיבים לרוב הפניות תוך <strong>24-48 שעות</strong> בימי עסקים.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=תמיכה%20-%20Daily%20Dominator`}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#e11d2c] hover:bg-[#c01825] transition-colors text-white font-medium rounded-lg px-5 py-3"
            >
              <Mail className="w-4 h-4" />
              שלח מייל
            </a>
            <button
              onClick={copyEmail}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 transition-colors text-white font-medium rounded-lg px-5 py-3"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'הועתק!' : SUPPORT_EMAIL}
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-[#f5b301]" />
            <h2 className="text-xl font-semibold">שאלות נפוצות</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-white/[0.03] transition-colors"
                >
                  <span className="font-medium text-sm md:text-base">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/50 shrink-0 transition-transform ${
                      open === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open === i && (
                  <div className="px-4 pb-4 text-white/70 text-sm leading-relaxed border-t border-white/5 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Account Deletion */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-[#22c55e]" />
            <h2 className="text-xl font-semibold">מחיקת חשבון ופרטיות</h2>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-3">
            אתם יכולים למחוק את החשבון שלכם בכל עת ישירות מתוך האפליקציה:
          </p>
          <ol className="list-decimal pr-5 space-y-1 text-white/70 text-sm">
            <li>פתחו את האפליקציה והתחברו לחשבון</li>
            <li>עברו ללשונית <strong>הגדרות</strong></li>
            <li>גללו לתחתית עד <strong>אזור מסוכן</strong></li>
            <li>לחצו על <strong>מחק חשבון</strong> ואשרו</li>
          </ol>
          <p className="text-white/50 text-xs mt-4">
            המחיקה מוחקת לצמיתות את החשבון, ההישגים, המשימות וכל הנתונים מהשרת. לא ניתן לשחזר.
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-white/40 text-xs pt-6 border-t border-white/10">
          <p>© {new Date().getFullYear()} Daily Dominator. כל הזכויות שמורות.</p>
          <p className="mt-1">גרסה 1.0</p>
        </footer>
      </div>
    </div>
  );
};

export default SupportPage;
