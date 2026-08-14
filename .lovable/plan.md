# מנויים iOS — מעבר לארכיטקטורה מקצועית (Offerings + Entitlement)

## מה כבר קיים בקוד
- אתחול RevenueCat, logIn עם user id, רכישה, שחזור, סנכרון לשרת (`sync-subscription` עם REST + service role).
- Paywall מלא-מסך ב-`SettingsTab` עם מחירים, תנאים, EULA, ביטול מנוי.
- בדיקת גישה כבר לפי Entitlement (`entitlements.active`), לא לפי product.

## מה לא תקין ולכן "0 מוצרים"
1. `IOS_STOREKIT_VERSION = 'STOREKIT_1'` — כפוי StoreKit 1. RevenueCat SDK 5 מיועד ל-StoreKit 2 כברירת מחדל.
2. שם ה-Entitlement בקוד הוא `'Daily Dominator AI Pro'` (שם תצוגה) במקום מזהה קצר כמו `pro` — אם ב-RevenueCat המזהה שונה, תמיד יוחזר "לא פרימיום".
3. ה-Paywall נופל ל-`getProducts` עם Product IDs קשיחים במקום להסתמך על Offering/Packages.
4. Product IDs לא עקביים/לא סמנטיים (`com.natanknafo.dailydominator` / `...k`).

## מה אני עומד לעשות בקוד (אחרי אישורך)
1. **StoreKit 2**: החלפת `STOREKIT_1` ל-`STOREKIT_2` ב-`src/lib/revenuecat.ts`.
2. **Entitlement גמיש**: `PREMIUM_ENTITLEMENT` יהפוך לרשימת מזהים אפשריים (`pro`, `premium`, וגם השם הנוכחי), ובנוסף fallback: אם קיים *כל* entitlement פעיל — פרימיום פעיל. אותו תיקון גם ב-`supabase/functions/sync-subscription/index.ts`.
3. **Offering-first Paywall**: `SettingsTab` ישתמש קודם ב-`getOfferings()` ובחבילות (`monthly` / `annual`) עם המחיר והכותרת מ-RevenueCat; רק אם אין Offering — נפילה ל-`getProducts` הקיים.
4. **Restore Purchases**: לוודא שהכפתור קיים ובולט ב-Paywall וגם במסך ההגדרות (דרישת אפל).
5. **Login/Logout נכון**: `logIn` בכל התחברות, `logOut` ביציאה, כדי שרכישות לא "ידבקו" למשתמש הלא נכון.
6. **מקור אמת אחד**: `usePremium` ימשיך לרענן מ-RevenueCat ב-iOS, אבל לא יאמין ל-cache מקומי — כבר כמעט ככה, אעשה סדר קטן.
7. **הודעת שגיאה ברורה** ב-Paywall כשאין מוצרים ("המנויים עדיין בבדיקה אצל אפל") במקום מסך ריק.

## מה אני *לא* עושה בקוד (זה עליך, בדשבורדים)
- App Store Connect: Subscription Group אחד + חודשי/שנתי, מחירים, Agreements/Tax/Banking.
- RevenueCat: חיבור ל-App Store Connect, **In-App Purchase Key** (חובה ל-StoreKit 2), Products, Entitlement בשם `pro`, Offering `default` עם Packages monthly/annual.
- Xcode: In-App Purchase capability, בחירת קובץ `DailyDominator.storekit` ב-Scheme לבדיקה מקומית.

## שאלה אחת לפני שאני מתחיל
מה שם ה-Entitlement המדויק (המזהה, לא שם התצוגה) שהגדרת ב-RevenueCat? אם לא בטוח — אעשה את הקוד סובלני לכל השמות כמו שכתוב בסעיף 2.
