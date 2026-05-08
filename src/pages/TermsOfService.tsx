const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10" dir="rtl">
      <div className="max-w-3xl mx-auto glass-card p-6 md:p-10 space-y-4">
        <h1 className="text-3xl font-bold">תנאי שימוש (EULA)</h1>
        <p className="text-sm text-muted-foreground">עודכן לאחרונה: מאי 2026</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. הסכמה</h2>
          <p>
            השימוש באפליקציה מהווה את הסכמתך המלאה לתנאים אלה. אם אינך מסכים, אל תשתמש
            באפליקציה.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. דיסקליימר רפואי / תזונה</h2>
          <p>
            האפליקציה מספקת מידע כללי בתחומי כושר, תזונה ופרודוקטיביות בלבד, ואינה מהווה
            ייעוץ רפואי, אבחון או טיפול. ערכים קלוריים, המלצות AI ותכניות אימון הם הערכות
            בלבד. התייעץ עם רופא או דיאטן מוסמך לפני כל שינוי תזונתי או אימון משמעותי.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. מדיניות אפס סובלנות לתוכן פוגעני</h2>
          <p>
            אסור להעלות, לשתף, להגיב או לפרסם תוכן הכולל: עירום, פורנוגרפיה, אלימות,
            הסתה, גזענות, הטרדה, איומים, או כל תוכן בלתי חוקי או פוגעני. אנו שומרים
            לעצמנו את הזכות להסיר תוכן ולחסום משתמשים מיידית.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. דיווח, חסימה ומחיקה</h2>
          <p>
            כל משתמש יכול לדווח על תוכן פוגעני (אייקון Flag) ולחסום משתמשים אחרים.
            אנו מתחייבים לבדוק כל דיווח ולהסיר תוכן מפר בתוך 24 שעות מהקבלה.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. אחריות המשתמש</h2>
          <p>
            אתה אחראי באופן בלעדי לתוכן שאתה מעלה. אסור להעלות תמונות של אדם אחר ללא
            הסכמתו, או תוכן שמפר זכויות יוצרים.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. סיום שירות</h2>
          <p>
            אנו רשאים לחסום או למחוק חשבון שמפר תנאים אלה ללא התראה מוקדמת.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. הגבלת אחריות</h2>
          <p>
            השירות ניתן "כפי שהוא" (AS IS). איננו אחראים לכל נזק ישיר או עקיף הנובע
            משימוש באפליקציה.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">8. יצירת קשר</h2>
          <p>
            <a className="text-primary underline" href="mailto:ntnknpw9@gmail.com">ntnknpw9@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
