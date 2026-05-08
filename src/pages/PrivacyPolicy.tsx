const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10" dir="rtl">
      <div className="max-w-3xl mx-auto glass-card p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold">מדיניות פרטיות</h1>
        <p className="text-sm text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. מידע שאנחנו אוספים</h2>
          <p>
            כתובת אימייל ושם תצוגה, נתוני שימוש (משימות, צ'אלנג'ים, מדידות גוף), תמונות שאתה
            מעלה, ונתונים טכניים בסיסיים (סוג מכשיר, גרסת אפליקציה).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. שימוש במידע</h2>
          <p>
            אנו משתמשים במידע כדי לספק את שירותי האפליקציה, לאפשר התחברות, לשמור את ההתקדמות
            שלך ולהציג לך תכנים מותאמים. איננו מוכרים מידע אישי לצדדים שלישיים.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. אחסון ואבטחה</h2>
          <p>
            הנתונים נשמרים בשרתי Lovable Cloud עם הצפנה והרשאות גישה ברמת שורה (RLS).
            רק אתה יכול לגשת לנתונים האישיים שלך.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. התחברות עם Apple / Google</h2>
          <p>
            כאשר אתה מתחבר עם Apple או Google, אנו מקבלים את כתובת האימייל ושם תצוגה
            בלבד. איננו ניגשים לאנשי קשר, יומן, או כל מידע אחר במכשיר שלך.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. תוכן שנוצר על ידי משתמשים (UGC)</h2>
          <p>
            אם אתה מעלה תמונות התקדמות לקהילה, התמונות גלויות למשתמשים אחרים. אתה יכול
            למחוק את התמונות שלך בכל עת. אנו מסירים תוכן פוגעני בתוך 24 שעות מקבלת דיווח.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. הזכויות שלך</h2>
          <p>
            אתה יכול למחוק את חשבונך והנתונים שלך בכל עת מתוך הגדרות &gt; מחק חשבון.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. ילדים</h2>
          <p>האפליקציה מיועדת למשתמשים בני 13 ומעלה.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">8. יצירת קשר</h2>
          <p>
            לכל שאלה: <a className="text-primary underline" href="mailto:support@dailydominator.app">support@dailydominator.app</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
