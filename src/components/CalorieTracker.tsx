import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Apple, Plus, Trash2, Calculator, Loader2, UtensilsCrossed, Target, TrendingUp, Calendar, Camera, X, ScanLine, ChefHat, Barcode, Search, Instagram, Brain } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

declare global {
  interface Window {
    Capacitor?: {
      nativePromise?: (pluginName: string, methodName: string, options?: Record<string, unknown>) => Promise<any>;
      Plugins?: {
        InstagramStories?: {
          canShare: () => Promise<{ available: boolean }>;
          share: (options: { backgroundImage: string }) => Promise<{ completed: boolean }>;
        };
      };
    };
  }
}

interface DailyNeeds {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  bmr: number;
  explanation: string;
}

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion: string;
}

interface UserProfile {
  age: string;
  gender: string;
  height: string;
  weight: string;
  activityLevel: string;
  goal: string;
}

interface DayHistory {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const getTodayDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
};

const CalorieTracker = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<'questionnaire' | 'tracker'>('questionnaire');
  const [profile, setProfile] = useState<UserProfile>({
    age: '', gender: '', height: '', weight: '', activityLevel: '', goal: '',
  });
  const [dailyNeeds, setDailyNeeds] = useState<DailyNeeds | null>(null);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scanningFood, setScanningFood] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [servingCount, setServingCount] = useState(1);
  const barcodeIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const today = getTodayDate();

  // Load profile from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          age: String(profileData.age),
          gender: profileData.gender,
          height: String(profileData.height),
          weight: String(profileData.weight),
          activityLevel: profileData.activity_level,
          goal: profileData.goal,
        });
        if (profileData.daily_calories) {
          setDailyNeeds({
            calories: profileData.daily_calories,
            protein: profileData.daily_protein || 0,
            fat: profileData.daily_fat || 0,
            carbs: profileData.daily_carbs || 0,
            bmr: 0,
            explanation: '',
          });
          setStep('tracker');
        }
      }

      // Load today's food logs
      const { data: logs } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .order('created_at', { ascending: true });

      if (logs && logs.length > 0) {
        setFoods(logs.map(l => ({
          id: l.id,
          name: l.food_name,
          calories: l.calories,
          protein: Number(l.protein),
          fat: Number(l.fat),
          carbs: Number(l.carbs),
          portion: l.portion || '',
        })));
      }

      // Load history (last 30 days)
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

      const { data: historyLogs } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', monthAgoStr)
        .lt('log_date', today)
        .order('log_date', { ascending: true });

      if (historyLogs && historyLogs.length > 0) {
        const grouped: Record<string, DayHistory> = {};
        historyLogs.forEach(l => {
          if (!grouped[l.log_date]) {
            grouped[l.log_date] = { date: l.log_date, calories: 0, protein: 0, fat: 0, carbs: 0 };
          }
          grouped[l.log_date].calories += l.calories;
          grouped[l.log_date].protein += Number(l.protein);
          grouped[l.log_date].fat += Number(l.fat);
          grouped[l.log_date].carbs += Number(l.carbs);
        });
        setHistory(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
      }
    };
    load();
  }, [user, today]);

  const calculateNeeds = async () => {
    if (!profile.age || !profile.gender || !profile.height || !profile.weight || !profile.activityLevel || !profile.goal) {
      toast.error('אנא מלא את כל השדות');
      return;
    }
    setLoading(true);
    try {
      // חישוב דטרמיניסטי לפי המחקר (Mifflin-St Jeor / Katch-McArdle + PAL)
      const { calculateNutrition } = await import('@/lib/nutritionCalculator');
      const result = calculateNutrition({
        gender: profile.gender as any,
        age: parseInt(profile.age),
        height: parseFloat(profile.height),
        weight: parseFloat(profile.weight),
        activity: profile.activityLevel as any,
        goal: profile.goal as any,
      });
      const data = {
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
        bmr: result.bmr,
        explanation: `${result.method} · TDEE ${result.tdee} קק"ל × פעילות ${result.pal} ${result.goalAdjustment !== 0 ? `${result.goalAdjustment > 0 ? '+' : ''}${result.goalAdjustment} למטרה` : '(תחזוקה)'}`,
      };
      setDailyNeeds(data);

      // Save profile to DB
      if (user) {
        await supabase.from('nutrition_profiles').upsert({
          user_id: user.id,
          age: parseInt(profile.age),
          gender: profile.gender,
          height: parseFloat(profile.height),
          weight: parseFloat(profile.weight),
          activity_level: profile.activityLevel,
          goal: profile.goal,
          daily_calories: data.calories,
          daily_protein: data.protein,
          daily_fat: data.fat,
          daily_carbs: data.carbs,
        }, { onConflict: 'user_id' });
      }

      setStep('tracker');
      toast.success('היעדים היומיים חושבו בהצלחה!');
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בחישוב');
    } finally {
      setLoading(false);
    }
  };

  const analyzeFood = async () => {
    if (!foodInput.trim()) return;
    setAnalyzingFood(true);
    try {
      const { data, error } = await supabase.functions.invoke('calorie-tracker', {
        body: { type: 'analyze_food', data: { foodDescription: foodInput } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save to DB
      if (user) {
        const { data: inserted, error: insertErr } = await supabase.from('nutrition_logs').insert({
          user_id: user.id,
          log_date: today,
          food_name: data.name || foodInput,
          calories: data.calories || 0,
          protein: data.protein || 0,
          fat: data.fat || 0,
          carbs: data.carbs || 0,
          portion: data.portion || '',
        }).select().single();

        if (insertErr) throw insertErr;

        setFoods(prev => [...prev, {
          id: inserted.id,
          name: inserted.food_name,
          calories: inserted.calories,
          protein: Number(inserted.protein),
          fat: Number(inserted.fat),
          carbs: Number(inserted.carbs),
          portion: inserted.portion || '',
        }]);
      } else {
        setFoods(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
      }

      setFoodInput('');
      toast.success(`${data.name} נוסף!`);
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בניתוח מאכל');
    } finally {
      setAnalyzingFood(false);
    }
  };

  const removeFood = async (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
    if (user) {
      await supabase.from('nutrition_logs').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  // Camera functions
  const startCamera = async () => {
    setShowCamera(true);
    setCapturedImage(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('לא ניתן לגשת למצלמה. נסה להעלות תמונה במקום.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    scanFoodImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('אנא בחר קובץ תמונה');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setScanResult(null);
      scanFoodImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const scanFoodImage = async (dataUrl: string) => {
    setScanningFood(true);
    setScanResult(null);
    try {
      const base64 = dataUrl.split(',')[1];
      const mimeMatch = dataUrl.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const { data, error } = await supabase.functions.invoke('calorie-tracker', {
        body: { type: 'scan_food', data: { imageBase64: base64, mimeType } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScanResult(data);
      toast.success('הסריקה הושלמה!');
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בסריקת התמונה');
    } finally {
      setScanningFood(false);
    }
  };

  const addScannedFood = async () => {
    if (!scanResult) return;
    if (user) {
      const { data: inserted, error: insertErr } = await supabase.from('nutrition_logs').insert({
        user_id: user.id,
        log_date: today,
        food_name: scanResult.name || 'מאכל סרוק',
        calories: scanResult.calories || 0,
        protein: scanResult.protein || 0,
        fat: scanResult.fat || 0,
        carbs: scanResult.carbs || 0,
        portion: scanResult.portion || '',
      }).select().single();

      if (insertErr) {
        toast.error('שגיאה בשמירה');
        return;
      }

      setFoods(prev => [...prev, {
        id: inserted.id,
        name: inserted.food_name,
        calories: inserted.calories,
        protein: Number(inserted.protein),
        fat: Number(inserted.fat),
        carbs: Number(inserted.carbs),
        portion: inserted.portion || '',
      }]);
    } else {
      setFoods(prev => [...prev, {
        id: crypto.randomUUID(),
        name: scanResult.name,
        calories: scanResult.calories,
        protein: scanResult.protein,
        fat: scanResult.fat,
        carbs: scanResult.carbs,
        portion: scanResult.portion || '',
      }]);
    }
    toast.success(`${scanResult.name} נוסף!`);
    setCapturedImage(null);
    setScanResult(null);
  };

  const shareToInstagramStory = async () => {
    if (!capturedImage || !scanResult) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d')!;

      // Transparent background — only the food image, no overlay
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = capturedImage;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

      const ratio = Math.max(1080 / img.width, 1920 / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (1080 - w) / 2, (1920 - h) / 2, w, h);

      // Centered values — stacked vertically, one below the other
      ctx.textAlign = 'center';
      const drawTextWithShadow = (text: string, x: number, y: number, font: string, color: string) => {
        ctx.font = font;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      };

      const cx = 540;
      let y = 720;

      drawTextWithShadow(
        String(scanResult.name || 'ארוחה').slice(0, 22),
        cx, y, 'bold 64px Heebo, sans-serif', '#fbbf24'
      );
      y += 130;

      drawTextWithShadow(`${scanResult.calories || 0} קלוריות`, cx, y, 'bold 96px Heebo, sans-serif', '#ffffff');
      y += 120;

      const lines = [
        { label: 'חלבון', val: `${scanResult.protein || 0}g`, color: '#60a5fa' },
        { label: 'שומן', val: `${scanResult.fat || 0}g`, color: '#fbbf24' },
        { label: 'פחמימות', val: `${scanResult.carbs || 0}g`, color: '#34d399' },
      ];
      lines.forEach(m => {
        drawTextWithShadow(`${m.label}: ${m.val}`, cx, y, 'bold 72px Heebo, sans-serif', m.color);
        y += 100;
      });

      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));

      // Native iOS app — open Instagram Stories directly with the generated story image.
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        try {
          const dataUrl: string = await new Promise((res) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.readAsDataURL(blob);
          });

          const nativeInstagramStories = window.Capacitor?.Plugins?.InstagramStories;
          const callInstagramStories = async (methodName: 'canShare' | 'share', options?: Record<string, unknown>) => {
            if (nativeInstagramStories) {
              return methodName === 'canShare'
                ? nativeInstagramStories.canShare()
                : nativeInstagramStories.share(options as { backgroundImage: string });
            }

            return window.Capacitor?.nativePromise?.('InstagramStories', methodName, options);
          };

          if (Capacitor.getPlatform() === 'ios' && window.Capacitor?.nativePromise) {
            const { available } = await callInstagramStories('canShare');
            if (!available) {
              toast.error('Instagram לא מותקן במכשיר');
              return;
            }

            await callInstagramStories('share', { backgroundImage: dataUrl });
            toast.success('פותח ישר לסטורי באינסטגרם');
            return;
          }

          const base64 = dataUrl.split(',')[1];
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const fileName = `food-story-${Date.now()}.png`;
          const written = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
          });
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: scanResult.name || 'ארוחה',
            url: written.uri,
            dialogTitle: 'שתף לסטורי',
          });
          toast.success('בחר Instagram Stories');
          return;
        } catch (err: any) {
          if (err?.message?.includes('cancel')) return;
          // fall through to web fallback
        }
      }

      // Web fallback
      try {
        if (navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
        }
      } catch {}
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'food-story.png'; a.click();
      toast.success('התמונה הורדה והועתקה — העלה אותה לסטורי ידנית מהגלריה');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בהכנת הסטורי');
    }
  };
  const startBarcodeScanner = async () => {
    setBarcodeResult(null);
    setServingCount(1);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // Native: use MLKit barcode scanner (Apple Vision / Google MLKit)
        const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
        try {
          const { camera } = await BarcodeScanner.requestPermissions();
          if (camera !== 'granted' && camera !== 'limited') {
            toast.error('נדרשת הרשאת מצלמה כדי לסרוק ברקוד');
            return;
          }
          const { barcodes } = await BarcodeScanner.scan();
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code) lookupBarcode(code);
          }
        } catch (err: any) {
          if (!String(err?.message || '').toLowerCase().includes('cancel')) {
            toast.error('שגיאה בסריקת הברקוד');
          }
        }
        return;
      }

      // Web fallback: in-page camera + BarcodeDetector
      setBarcodeMode(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });
        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopBarcodeScanner();
              lookupBarcode(code);
            }
          } catch {}
        };
        barcodeIntervalRef.current = window.setInterval(scanLoop, 500);
      } else {
        toast.error('הדפדפן לא תומך בסריקת ברקוד. הזן ברקוד ידנית.');
      }
    } catch (err) {
      toast.error('לא ניתן לגשת למצלמה');
      setBarcodeMode(false);
    }
  };

  const stopBarcodeScanner = () => {
    if (barcodeIntervalRef.current) {
      clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setBarcodeMode(false);
  };

  const lookupBarcode = async (code: string) => {
    setBarcodeScanning(true);
    setBarcodeResult(null);
    setBarcodeInput(code);
    try {
      const { data, error } = await supabase.functions.invoke('barcode-lookup', {
        body: { barcode: code },
      });
      if (error) throw error;
      if (data.error && !data.found) {
        toast.error(data.error);
        setBarcodeResult(null);
      } else if (data.found) {
        setBarcodeResult(data);
        toast.success(`נמצא: ${data.name}`);
      } else {
        toast.error('המוצר לא נמצא במאגר');
      }
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בחיפוש ברקוד');
    } finally {
      setBarcodeScanning(false);
    }
  };

  const addBarcodeFood = async () => {
    if (!barcodeResult) return;
    const multiplier = servingCount;
    const vals = barcodeResult.per_serving;
    const foodName = barcodeResult.brand
      ? `${barcodeResult.name} (${barcodeResult.brand})`
      : barcodeResult.name;
    const portion = `${multiplier} × ${barcodeResult.serving_size}`;

    if (user) {
      const { data: inserted, error: insertErr } = await supabase.from('nutrition_logs').insert({
        user_id: user.id,
        log_date: today,
        food_name: foodName,
        calories: Math.round(vals.calories * multiplier),
        protein: Math.round(vals.protein * multiplier),
        fat: Math.round(vals.fat * multiplier),
        carbs: Math.round(vals.carbs * multiplier),
        portion,
      }).select().single();

      if (insertErr) { toast.error('שגיאה בשמירה'); return; }

      setFoods(prev => [...prev, {
        id: inserted.id,
        name: inserted.food_name,
        calories: inserted.calories,
        protein: Number(inserted.protein),
        fat: Number(inserted.fat),
        carbs: Number(inserted.carbs),
        portion: inserted.portion || '',
      }]);
    } else {
      setFoods(prev => [...prev, {
        id: crypto.randomUUID(),
        name: foodName,
        calories: Math.round(vals.calories * multiplier),
        protein: Math.round(vals.protein * multiplier),
        fat: Math.round(vals.fat * multiplier),
        carbs: Math.round(vals.carbs * multiplier),
        portion,
      }]);
    }
    toast.success(`${foodName} נוסף!`);
    setBarcodeResult(null);
    setBarcodeInput('');
    setServingCount(1);
  };

  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      fat: acc.fat + f.fat,
      carbs: acc.carbs + f.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const getProgress = (current: number, target: number) =>
    Math.min(100, Math.round((current / target) * 100));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (step === 'questionnaire') {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            שאלון פרופיל תזונתי
          </CardTitle>
          <p className="text-sm text-muted-foreground">מלא את הפרטים כדי לחשב את הצריכה היומית המומלצת</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>גיל</Label>
              <Input type="number" placeholder="25" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>מין</Label>
              <Select value={profile.gender} onValueChange={v => setProfile(p => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">זכר</SelectItem>
                  <SelectItem value="female">נקבה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>גובה (ס"מ)</Label>
              <Input type="number" placeholder="175" value={profile.height} onChange={e => setProfile(p => ({ ...p, height: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>משקל (ק"ג)</Label>
              <Input type="number" placeholder="70" value={profile.weight} onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>רמת פעילות</Label>
            <Select value={profile.activityLevel} onValueChange={v => setProfile(p => ({ ...p, activityLevel: v }))}>
              <SelectTrigger><SelectValue placeholder="בחר רמת פעילות" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">יושבני (ללא פעילות)</SelectItem>
                <SelectItem value="light">קל (1-3 פעמים בשבוע)</SelectItem>
                <SelectItem value="moderate">בינוני (3-5 פעמים בשבוע)</SelectItem>
                <SelectItem value="active">פעיל (6-7 פעמים בשבוע)</SelectItem>
                <SelectItem value="very_active">מאוד פעיל (אימונים כפולים)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מטרה</Label>
            <Select value={profile.goal} onValueChange={v => setProfile(p => ({ ...p, goal: v }))}>
              <SelectTrigger><SelectValue placeholder="בחר מטרה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">הרזיה</SelectItem>
                <SelectItem value="maintain">שמירה על משקל</SelectItem>
                <SelectItem value="gain">עלייה במשקל / בניית שריר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={calculateNeeds} disabled={loading} className="w-full">
            {loading ? (<><Loader2 className="w-4 h-4 ml-2 animate-spin" />מחשב...</>) : (<><Target className="w-4 h-4 ml-2" />חשב יעדים יומיים</>)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-muted-foreground/80 bg-muted/30 border border-border/40 rounded-lg p-2 leading-relaxed">
        ⚠️ ערכים קלוריים והמלצות הם הערכות בלבד ואינם מהווים ייעוץ רפואי או תזונתי. התייעץ עם איש מקצוע מוסמך.
      </div>
      {dailyNeeds && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                היעדים היומיים שלך
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs">
                  <TrendingUp className="w-3 h-3 ml-1" />
                  היסטוריה
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep('questionnaire')} className="text-xs">
                  עדכן פרופיל
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">קלוריות</span>
                <span className="font-bold">{totals.calories} / {dailyNeeds.calories}</span>
              </div>
              <Progress value={getProgress(totals.calories, dailyNeeds.calories)} className="h-3" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">חלבון</p>
                <p className="font-bold text-sm text-blue-400">{totals.protein}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.protein}g</p>
                <Progress value={getProgress(totals.protein, dailyNeeds.protein)} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">שומן</p>
                <p className="font-bold text-sm text-yellow-400">{totals.fat}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.fat}g</p>
                <Progress value={getProgress(totals.fat, dailyNeeds.fat)} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">פחמימות</p>
                <p className="font-bold text-sm text-green-400">{totals.carbs}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.carbs}g</p>
                <Progress value={getProgress(totals.carbs, dailyNeeds.carbs)} className="h-1.5 mt-2" />
              </div>
            </div>
            {dailyNeeds.explanation && (
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">{dailyNeeds.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <>
          {/* Trends Chart */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                מגמת קלוריות - {history.length} ימים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                calories: { label: 'קלוריות', color: 'hsl(var(--primary))' },
                protein: { label: 'חלבון', color: 'hsl(210, 80%, 60%)' },
                fat: { label: 'שומן', color: 'hsl(45, 90%, 55%)' },
                carbs: { label: 'פחמימות', color: 'hsl(140, 70%, 50%)' },
              }} className="h-[220px] w-full">
                <AreaChart data={history.map(d => ({
                  ...d,
                  label: new Date(d.date + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' }),
                }))}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  {dailyNeeds && (
                    <ReferenceLine y={dailyNeeds.calories} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'יעד', position: 'insideTopLeft', fill: 'hsl(var(--destructive))', fontSize: 11 }} />
                  )}
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="calories" stroke="hsl(var(--primary))" fill="url(#calGrad)" strokeWidth={2} name="calories" />
                </AreaChart>
              </ChartContainer>

              {/* Macros bar chart */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2 text-right">פירוט מאקרו (גרם)</p>
                <ChartContainer config={{
                  protein: { label: 'חלבון', color: 'hsl(210, 80%, 60%)' },
                  fat: { label: 'שומן', color: 'hsl(45, 90%, 55%)' },
                  carbs: { label: 'פחמימות', color: 'hsl(140, 70%, 50%)' },
                }} className="h-[160px] w-full">
                  <BarChart data={history.map(d => ({
                    ...d,
                    label: new Date(d.date + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' }),
                    protein: Math.round(d.protein),
                    fat: Math.round(d.fat),
                    carbs: Math.round(d.carbs),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="protein" fill="hsl(210, 80%, 60%)" radius={[2, 2, 0, 0]} name="protein" />
                    <Bar dataKey="fat" fill="hsl(45, 90%, 55%)" radius={[2, 2, 0, 0]} name="fat" />
                    <Bar dataKey="carbs" fill="hsl(140, 70%, 50%)" radius={[2, 2, 0, 0]} name="carbs" />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* History list */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                היסטוריה - {history.length} ימים אחרונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {history.slice().reverse().map(day => (
                  <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{formatDate(day.date)}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-primary font-medium">{day.calories} קל׳</span>
                      <span className="text-blue-400">{Math.round(day.protein)}g ח׳</span>
                      <span className="text-yellow-400">{Math.round(day.fat)}g ש׳</span>
                      <span className="text-green-400">{Math.round(day.carbs)}g פ׳</span>
                    </div>
                    {dailyNeeds && (
                      <div className="w-16">
                        <Progress value={getProgress(day.calories, dailyNeeds.calories)} className="h-1.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {showHistory && history.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            אין היסטוריה עדיין. התחל לתעד את האוכל שלך!
          </CardContent>
        </Card>
      )}

      {/* Camera Food Scanner */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            סורק אוכל חכם
          </CardTitle>
          <p className="text-xs text-muted-foreground">צלם או העלה תמונה של האוכל וה-AI ינתח קלוריות, משקל ושיטת בישול</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showCamera && !capturedImage && (
            <div className="flex gap-2">
              <Button onClick={startCamera} className="flex-1 gap-2" variant="outline">
                <Camera className="w-4 h-4" />
                צלם תמונה
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" variant="outline">
                <Apple className="w-4 h-4" />
                העלה מגלריה
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {showCamera && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/60 rounded-xl animate-pulse" />
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                <Button onClick={capturePhoto} size="lg" className="rounded-full w-14 h-14 bg-primary hover:bg-primary/80">
                  <Camera className="w-6 h-6" />
                </Button>
                <Button onClick={stopCamera} size="icon" variant="destructive" className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden">
                <img src={capturedImage} alt="צילום אוכל" className="w-full aspect-video object-cover rounded-lg" />
                {scanningFood && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm font-medium text-white">מנתח את האוכל...</p>
                    <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                  onClick={() => { setCapturedImage(null); setScanResult(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {scanResult && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-base">{scanResult.name}</h4>
                    </div>
                    
                    {scanResult.cooking_method && (
                      <p className="text-xs text-muted-foreground">
                        🍳 שיטת בישול: <span className="text-foreground font-medium">{scanResult.cooking_method}</span>
                      </p>
                    )}
                    {scanResult.estimated_weight_grams && (
                      <p className="text-xs text-muted-foreground">
                        ⚖️ משקל משוער: <span className="text-foreground font-medium">{scanResult.estimated_weight_grams} גרם</span>
                      </p>
                    )}
                    {scanResult.confidence && (
                      <p className="text-xs text-muted-foreground">
                        🎯 רמת דיוק: <span className={`font-medium ${scanResult.confidence === 'high' ? 'text-green-400' : scanResult.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                          {scanResult.confidence === 'high' ? 'גבוהה' : scanResult.confidence === 'medium' ? 'בינונית' : 'נמוכה'}
                        </span>
                      </p>
                    )}

                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs text-muted-foreground">קלוריות</p>
                        <p className="font-bold text-primary">{scanResult.calories}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-muted-foreground">חלבון</p>
                        <p className="font-bold text-blue-400">{scanResult.protein}g</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-xs text-muted-foreground">שומן</p>
                        <p className="font-bold text-yellow-400">{scanResult.fat}g</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-muted-foreground">פחמימות</p>
                        <p className="font-bold text-green-400">{scanResult.carbs}g</p>
                      </div>
                    </div>

                    {scanResult.items && scanResult.items.length > 1 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">פירוט פריטים:</p>
                        {scanResult.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs p-1.5 rounded bg-muted/30">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">{item.calories} קל׳ • {item.weight_grams}g</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {scanResult.portion && (
                      <p className="text-xs text-muted-foreground mt-1">{scanResult.portion}</p>
                    )}

                    {scanResult.feedback && (
                      <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
                        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                          <Brain className="w-3.5 h-3.5 text-primary" /> ניתוח תזונאי AI
                        </p>
                        {scanResult.feedback.good && (
                          <p className="text-xs text-green-400 font-medium">✅ {scanResult.feedback.good}</p>
                        )}
                        {scanResult.feedback.bad && (
                          <p className="text-xs text-red-400 font-medium">⚠️ {scanResult.feedback.bad}</p>
                        )}
                        {scanResult.feedback.improvement && (
                          <p className="text-xs text-accent font-medium">💡 לשיפור: {scanResult.feedback.improvement}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={addScannedFood} className="flex-1 gap-2">
                      <Plus className="w-4 h-4" />
                      הוסף ללוג היומי
                    </Button>
                    <Button onClick={shareToInstagramStory} variant="outline" className="gap-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 hover:from-pink-500/30 hover:to-purple-500/30">
                      <Instagram className="w-4 h-4" />
                      שתף לסטורי
                    </Button>
                    <Button onClick={() => { setCapturedImage(null); setScanResult(null); }} variant="outline" className="gap-2">
                      <Camera className="w-4 h-4" />
                      סרוק שוב
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barcode Scanner */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Barcode className="w-5 h-5 text-primary" />
            סורק ברקוד
          </CardTitle>
          <p className="text-xs text-muted-foreground">סרוק ברקוד של מוצר או הזן ידנית כדי לקבל ערכים תזונתיים מדויקים</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!barcodeMode && !barcodeResult && (
            <div className="space-y-3">
              <Button onClick={startBarcodeScanner} className="w-full gap-2" variant="outline">
                <Camera className="w-4 h-4" />
                סרוק ברקוד עם המצלמה
              </Button>
              <div className="flex gap-2">
                <Input
                  placeholder="הזן מספר ברקוד ידנית"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && barcodeInput.trim() && lookupBarcode(barcodeInput.trim())}
                  disabled={barcodeScanning}
                  dir="ltr"
                  className="text-center"
                />
                <Button
                  onClick={() => barcodeInput.trim() && lookupBarcode(barcodeInput.trim())}
                  disabled={barcodeScanning || !barcodeInput.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  {barcodeScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {barcodeMode && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-24 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-bounce" style={{ animationDuration: '1.5s' }} />
                </div>
              </div>
              <p className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                כוון את הברקוד למסגרת
              </p>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <Button onClick={stopBarcodeScanner} size="sm" variant="destructive" className="gap-2">
                  <X className="w-4 h-4" />
                  ביטול
                </Button>
              </div>
            </div>
          )}

          {barcodeScanning && !barcodeMode && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">מחפש מוצר...</span>
            </div>
          )}

          {barcodeResult && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 rounded-lg bg-muted/40 border border-border/50 space-y-3">
                <div className="flex gap-3">
                  {barcodeResult.image_url && (
                    <img src={barcodeResult.image_url} alt={barcodeResult.name} className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-base">{barcodeResult.name}</h4>
                    {barcodeResult.brand && (
                      <p className="text-xs text-muted-foreground">{barcodeResult.brand}</p>
                    )}
                    {barcodeResult.quantity && (
                      <p className="text-xs text-muted-foreground">כמות: {barcodeResult.quantity}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">מנה: {barcodeResult.serving_size}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">כמות מנות:</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => setServingCount(Math.max(0.5, servingCount - 0.5))}
                    >-</Button>
                    <span className="w-10 text-center font-bold text-sm">{servingCount}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => setServingCount(servingCount + 0.5)}
                    >+</Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground">קלוריות</p>
                    <p className="font-bold text-primary">{Math.round(barcodeResult.per_serving.calories * servingCount)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">חלבון</p>
                    <p className="font-bold text-blue-400">{Math.round(barcodeResult.per_serving.protein * servingCount)}g</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-muted-foreground">שומן</p>
                    <p className="font-bold text-yellow-400">{Math.round(barcodeResult.per_serving.fat * servingCount)}g</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">פחמימות</p>
                    <p className="font-bold text-green-400">{Math.round(barcodeResult.per_serving.carbs * servingCount)}g</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ל-100 גרם: {barcodeResult.per_100g.calories} קל׳ | {barcodeResult.per_100g.protein}g ח׳ | {barcodeResult.per_100g.fat}g ש׳ | {barcodeResult.per_100g.carbs}g פ׳
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={addBarcodeFood} className="flex-1 gap-2">
                  <Plus className="w-4 h-4" />
                  הוסף ללוג היומי
                </Button>
                <Button onClick={() => { setBarcodeResult(null); setBarcodeInput(''); }} variant="outline" className="gap-2">
                  <Barcode className="w-4 h-4" />
                  סרוק שוב
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            הוסף מאכל ידנית
          </CardTitle>
          <p className="text-xs text-muted-foreground">תאר את מה שאכלת וה-AI ינתח את הערכים התזונתיים</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder='לדוגמא: "חזה עוף 200 גרם עם אורז"'
              value={foodInput}
              onChange={e => setFoodInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeFood()}
              disabled={analyzingFood}
            />
            <Button onClick={analyzeFood} disabled={analyzingFood || !foodInput.trim()} size="icon" className="shrink-0">
              {analyzingFood ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Food log */}
      {foods.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-400" />
              מה אכלת היום ({foods.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {foods.map(food => (
                <div key={food.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all animate-fade-in">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.portion}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="text-primary font-medium">{food.calories} קל׳</span>
                    <span className="text-blue-400">{food.protein}g ח׳</span>
                    <span className="text-yellow-400">{food.fat}g ש׳</span>
                    <span className="text-green-400">{food.carbs}g פ׳</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFood(food.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex justify-between text-sm font-medium">
              <span>סה"כ</span>
              <div className="flex gap-3">
                <span className="text-primary">{totals.calories} קל׳</span>
                <span className="text-blue-400">{totals.protein}g ח׳</span>
                <span className="text-yellow-400">{totals.fat}g ש׳</span>
                <span className="text-green-400">{totals.carbs}g פ׳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalorieTracker;
