# iOS Auto-Prebuild Script

הסקריפט `ios-prebuild.sh` מריץ אוטומטית לפני כל Build ב-Xcode:
1. `git pull --rebase --autostash`
2. `npm install` (אם חסר node_modules)
3. `npm run build`
4. `npx cap sync ios`

## הגדרה חד-פעמית ב-Xcode (Pre-action בסכמה)

1. פתח את `ios/App/App.xcworkspace` ב-Xcode.
2. בתפריט העליון: **Product → Scheme → Edit Scheme...** (או ⌘<).
3. בחר **Build** בצד שמאל, ופתח את החץ ליד.
4. לחץ על **Pre-actions** → **+** → **New Run Script Action**.
5. ב-**Provide build settings from**: בחר `App`.
6. הדבק בתיבת הסקריפט:
   ```bash
   "${PROJECT_DIR}/../../scripts/ios-prebuild.sh"
   ```
7. סגור עם **Close**.

## הרצה ידנית

```bash
./scripts/ios-prebuild.sh
```

## לוגים

הפלט נשמר ב-`/tmp/ios-prebuild.log` (כי Pre-actions לא מציגים stdout ב-Xcode).
כדי לעקוב בזמן אמת:
```bash
tail -f /tmp/ios-prebuild.log
```
