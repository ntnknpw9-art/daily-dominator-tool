// Deterministic nutrition calculator based on research:
// - BMR: Mifflin-St Jeor (default), or Katch-McArdle if body fat % is known
// - TDEE = BMR × PAL
// - Goal adjustment: cut -400 (max 20% deficit), bulk +300, recomp/maintain 0
// - Protein: 1.8-2.4 g/kg depending on goal
// - Fat: 0.9 g/kg (min 20% of calories)
// - Carbs: remainder
// - Water: 35 ml/kg
// - Sleep: 7-9h

export type Gender = 'זכר' | 'נקבה' | 'male' | 'female';
export type Activity = 'יושבני' | 'בינוני' | 'פעיל' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'חיטוב' | 'מסה' | 'recomp' | 'כללי' | 'lose' | 'gain' | 'maintain' | 'cut' | 'bulk';

export interface NutritionInput {
  gender: Gender;
  age: number;
  height: number; // cm
  weight: number; // kg
  activity: Activity;
  goal: Goal;
  bodyFatPercent?: number; // optional, if known → Katch-McArdle
}

export interface NutritionResult {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
  water_liters: number;
  sleep_hours: number;
  method: 'Mifflin-St Jeor' | 'Katch-McArdle';
  pal: number;
  goalAdjustment: number;
}

const isMale = (g: Gender) => g === 'זכר' || g === 'male';

// PAL factors (research-based, more granular than the AI prompt used)
const palFactor = (a: Activity): number => {
  switch (a) {
    case 'יושבני':
    case 'sedentary':
      return 1.4;
    case 'בינוני':
    case 'light':
    case 'moderate':
      return 1.6;
    case 'פעיל':
    case 'active':
      return 1.8;
    case 'very_active':
      return 2.0;
    default:
      return 1.6;
  }
};

const isCut = (g: Goal) => g === 'חיטוב' || g === 'lose' || g === 'cut';
const isBulk = (g: Goal) => g === 'מסה' || g === 'gain' || g === 'bulk';

export function calculateNutrition(input: NutritionInput): NutritionResult {
  const { gender, age, height, weight, activity, goal, bodyFatPercent } = input;

  // 1. BMR
  let bmr: number;
  let method: NutritionResult['method'];
  if (typeof bodyFatPercent === 'number' && bodyFatPercent > 0 && bodyFatPercent < 60) {
    // Katch-McArdle: more accurate when body fat is known
    const lbm = weight * (1 - bodyFatPercent / 100);
    bmr = 370 + 21.6 * lbm;
    method = 'Katch-McArdle';
  } else {
    // Mifflin-St Jeor
    bmr = 10 * weight + 6.25 * height - 5 * age + (isMale(gender) ? 5 : -161);
    method = 'Mifflin-St Jeor';
  }
  bmr = Math.round(bmr);

  // 2. TDEE
  const pal = palFactor(activity);
  const tdee = Math.round(bmr * pal);

  // 3. Goal adjustment (research recommends 300-500 kcal, capped at 20% of TDEE)
  let goalAdjustment = 0;
  if (isCut(goal)) {
    goalAdjustment = -Math.min(500, Math.round(tdee * 0.20));
    if (goalAdjustment > -300) goalAdjustment = -300;
  } else if (isBulk(goal)) {
    goalAdjustment = Math.min(400, Math.round(tdee * 0.15));
    if (goalAdjustment < 250) goalAdjustment = 250;
  }
  // recomp/maintain → 0
  const calories = Math.max(1200, tdee + goalAdjustment);

  // 4. Macros
  // Protein: cut high to preserve muscle, recomp moderate-high, bulk moderate
  let proteinPerKg = 2.0;
  if (isCut(goal)) proteinPerKg = 2.3;
  else if (goal === 'recomp') proteinPerKg = 2.2;
  else if (isBulk(goal)) proteinPerKg = 1.8;
  else proteinPerKg = 1.8;

  const protein = Math.round(weight * proteinPerKg);

  // Fat: 0.9 g/kg, but minimum 20% of calories for hormonal health
  const fatByWeight = Math.round(weight * 0.9);
  const minFat = Math.round((calories * 0.20) / 9);
  const fat = Math.max(fatByWeight, minFat);

  // Carbs: remainder
  const calsFromPF = protein * 4 + fat * 9;
  const carbs = Math.max(0, Math.round((calories - calsFromPF) / 4));

  // 5. Water: 35 ml/kg
  const water_liters = Math.round((weight * 35) / 100) / 10; // round to 0.1L

  // 6. Sleep: 8h baseline
  const sleep_hours = 8;

  return {
    bmr,
    tdee,
    calories,
    protein,
    fat,
    carbs,
    water_liters,
    sleep_hours,
    method,
    pal,
    goalAdjustment,
  };
}

// Body fat preset cards based on research-grade visual reference
export const BODY_FAT_LEVELS = [
  { id: 1, range: '3-7%', midpoint: 5, label: 'מאוד מחוטב', sub: 'תחרותי / סטייג׳' },
  { id: 2, range: '7-15%', midpoint: 11, label: 'אתלטי', sub: 'מראה ספורטיבי בריא' },
  { id: 3, range: '15-20%', midpoint: 17, label: 'רזה-ממוצע', sub: 'בטן שטוחה ללא קוביות' },
  { id: 4, range: '20-25%', midpoint: 22, label: 'ממוצע', sub: 'מעט שומן באזור הבטן' },
  { id: 5, range: '25-30%', midpoint: 27, label: 'עודף משקל קל', sub: 'בטן בולטת' },
  { id: 6, range: '30-35%', midpoint: 32, label: 'עודף משקל', sub: 'שומן ניכר בכל הגוף' },
] as const;
