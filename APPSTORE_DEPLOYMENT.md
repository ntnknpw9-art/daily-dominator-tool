# 🚀 מדריך העלאת Daily Dominator לאפל סטור

מדריך מלא, שלב-אחרי-שלב, להרצה ב-Xcode על MacBook ולהעלאה ל-App Store.

---

## ⚙️ דרישות מקדימות

1. **MacBook** עם macOS עדכני (Sonoma או חדש יותר).
2. **Xcode 15+** מותקן מ-App Store.
3. **Node.js 20+** (`brew install node`).
4. **CocoaPods** (לא חובה ב-Capacitor 8 SPM, אבל מומלץ): `sudo gem install cocoapods`.
5. **חשבון Apple Developer** פעיל ($99 לשנה) — https://developer.apple.com.

---

## 📥 שלב 1 — שכפול הפרויקט למחשב

1. בלובאבל, לחץ על **GitHub → Connect to GitHub** וייצא את הפרויקט.
2. ב-MacBook, פתח Terminal:

```bash
git clone https://github.com/<your-username>/daily-dominator-tool.git
cd daily-dominator-tool
npm install
```

---

## 🛠️ שלב 2 — בנייה ל-Production

חשוב: לפני העלאה לחנות, יש לבנות ללא ה-server URL של לובאבל.

```bash
git pull
npm install
rm -rf dist ios/App/App/public
npm run build
npx cap sync ios
```

**הסבר:** מוחקים את `dist` ואת `ios/App/App/public` לפני הבנייה כדי לוודא שהארכיון הבא מכיל בדיוק את הקוד החדש — ולא Web assets ישנים מבילד קודם. הקובץ `capacitor.config.ts` מוגדר כך שה-`server.url` נטען רק כש-`CAP_ENV=development`. ברירת המחדל היא בנייה מקומית מתוך `dist/` — בדיוק מה שאפל דורשת.

אם תרצה Hot-reload בזמן פיתוח על המכשיר:
```bash
CAP_ENV=development npx cap sync ios
```

---

## 🍎 שלב 3 — פתיחת הפרויקט ב-Xcode

```bash
npx cap open ios
```

Xcode ייפתח עם הפרויקט `ios/App/App.xcworkspace`.

### הגדרות חשובות ב-Xcode:

1. בחר ב-**App** בעץ הקבצים השמאלי.
2. תחת **Signing & Capabilities**:
   - סמן **Automatically manage signing**.
   - בחר את ה-**Team** שלך (חשבון ה-Developer).
   - **Bundle Identifier**: `com.natanknafo.dailydominator`
      - חייב להתאים בדיוק ל-App Store Connect, ל-RevenueCat ול-`capacitor.config.ts`.
3. תחת **General**:
   - **Display Name**: `Daily Dominator`
   - **Version**: `1.0.0`
   - **Build**: `1`
   - **Minimum Deployments**: iOS 15.0
4. תחת **App Icons**: ודא שיש אייקון 1024x1024 ב-`Assets.xcassets/AppIcon`.

---

## 🧪 שלב 4 — הרצה על סימולטור / מכשיר

- **סימולטור**: בחר iPhone 15 בראש Xcode → לחץ ▶️.
- **מכשיר אמיתי**: חבר אייפון ב-USB → אשר אמון → בחר את המכשיר → ▶️.

---

## 📤 שלב 5 — העלאה ל-App Store Connect

### 5.1 צור את האפליקציה ב-App Store Connect
1. היכנס ל-https://appstoreconnect.apple.com.
2. **My Apps → +** → **New App**.
3. מלא:
   - Platform: iOS
   - Name: `Daily Dominator`
   - Primary Language: Hebrew
   - Bundle ID: בחר את ה-Bundle ID שלך
   - SKU: `daily-dominator-001`

### 5.2 ארכיון ב-Xcode
1. בראש Xcode בחר **Any iOS Device (arm64)** (לא סימולטור!).
2. תפריט **Product → Archive**.
3. כשהארכיון מסתיים, ייפתח חלון **Organizer**.
4. לחץ **Distribute App → App Store Connect → Upload**.
5. אשר את כל ברירות המחדל → **Upload**.

### 5.3 הגשה לבדיקה
1. חזור ל-App Store Connect → האפליקציה שלך.
2. תחת **TestFlight** תראה את הבילד תוך כ-15-30 דק' (אחרי "Processing").
3. תחת **App Store → 1.0 Prepare for Submission**:
   - מלא תיאור, צילומי מסך (חובה: 6.7" + 6.5"), קטגוריה, מילות מפתח.
   - הוסף **Privacy Policy URL** (חובה — אפשר לארח דף פשוט).
   - בחר את הבילד מ-TestFlight.
4. לחץ **Add for Review → Submit to App Review**.

הסקירה לוקחת בד"כ 24-48 שעות.

---

## ✅ צ'קליסט סופי לפני שליחה

- [ ] `Bundle Identifier` ייחודי ורשום בחשבון Developer.
- [ ] גרסה ובילד מספרים (`1.0.0` / `1`).
- [ ] אייקון 1024x1024 ללא שקיפות וללא פינות מעוגלות.
- [ ] צילומי מסך ב-6.7" (1290x2796) ו-6.5".
- [ ] Privacy Policy URL.
- [ ] תיאור בעברית + אנגלית.
- [ ] בנייה ללא `server.url` (ברירת המחדל החדשה).
- [ ] אישור שאין הצפנה לא-סטנדרטית (כבר מוגדר ב-Info.plist).

---

## 🆘 בעיות נפוצות

| בעיה | פתרון |
|------|--------|
| `Bundle ID already exists` | החלף ל-ID ייחודי ב-`capacitor.config.ts` וב-Xcode |
| `No team selected` | התחבר לחשבון Developer בהעדפות Xcode |
| מסך לבן באפליקציה | ודא ש-`server` מושבת ב-prod ושרצת `npm run build && npx cap sync ios` |
| `Missing compliance` | כבר טופל — `ITSAppUsesNonExemptEncryption=false` ב-Info.plist |

בהצלחה! 🎯
