## ניקוי פיצ'ר "גלריית הלוחם"

מוחק את כל מה שנוסף עבור הפיצ'ר שלא ייכנס לשימוש.

### קבצים למחיקה
- `src/components/WarriorGallery.tsx`
- `supabase/functions/generate-warrior-portrait/` (כולל מחיקת ה-edge function מ-Cloud)

### שינויי דאטאבייס (migration)
- `DROP TABLE public.warrior_portraits`
- מחיקת ה-storage bucket `warrior-portraits` וה-policies שלו

### הערה
ה-secret `LOVABLE_API_KEY` יישאר — הוא חלק מ-Lovable Cloud ושימושי לפיצ'רים עתידיים.
