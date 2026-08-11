import { useState } from 'react';
import { Flame, Crown, Zap, Check, ChevronLeft, Dumbbell, LayoutDashboard, TrendingUp, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LIME_PRIMARY = '72 88% 46%';
const LIME_GLOW = '72 88% 46%';
const LIME_DARK = '72 85% 38%';

const ColorDemo = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div
      className="min-h-screen bg-background text-foreground font-heebo"
      dir="rtl"
      style={
        {
          '--primary': LIME_PRIMARY,
          '--ring': LIME_PRIMARY,
          '--sidebar-primary': LIME_PRIMARY,
          '--primary-foreground': '0 0% 5%',
          '--gradient-fire': `linear-gradient(135deg, hsl(${LIME_PRIMARY}) 0%, hsl(${LIME_DARK}) 100%)`,
          '--gradient-hero': `radial-gradient(ellipse at top right, hsl(${LIME_PRIMARY} / 0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom left, hsl(${LIME_DARK} / 0.12) 0%, transparent 50%), linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 4%) 100%)`,
          '--shadow-fire': `0 10px 40px -10px hsl(${LIME_GLOW} / 0.55), 0 0 80px -20px hsl(${LIME_GLOW} / 0.3)`,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-foreground">דמו צבע — ליים זית 🫒</h1>
          <a href="/" className="text-sm text-primary font-medium flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            חזרה לאפליקציה
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Color info */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">הצבע החדש</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center text-[#0a0a0a] font-bold text-xs" style={{ background: '#B6DD0E' }}>
              #B6DD0E
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">הצבע הנוכחי — אדום/כתום — מוחלף בגוון ליים-זית אנרגטי.</p>
              <p className="text-muted-foreground">כל הכפתורים, ההילות, הגרדיאנטים והאייקונים יקבלו את הגוון הזה.</p>
            </div>
          </div>
        </section>

        {/* Hero preview */}
        <section className="premium-card hero-bg p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full blur-3xl bg-primary" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">רצף יומי</p>
              <h2 className="text-4xl sm:text-5xl font-black text-gradient-fire display-font">12 ימים</h2>
              <p className="text-sm text-muted-foreground mt-1">היום הוא היום ה-13 ברצף שלך — אל תוותר!</p>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-fire">
              <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="relative z-10 mt-6 flex gap-3">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">המשך רצף</Button>
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">פרטים</Button>
          </div>
        </section>

        {/* Buttons & CTAs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-foreground">כפתורים</h3>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-primary text-primary-foreground">ראשי</Button>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">משני</Button>
              <Button variant="ghost" className="text-primary hover:bg-primary/10">רקע</Button>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-foreground">אייקונים והילות</h3>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center glow-fire">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="text-primary text-sm font-bold">+250 נקודות</div>
            </div>
          </div>
        </section>

        {/* Subscription preview */}
        <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            מסך מנוי (תצוגה מקדימה)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 p-4 opacity-80">
              <p className="text-sm text-muted-foreground">חודשי</p>
              <p className="text-2xl font-black text-foreground">₪29.90</p>
              <p className="text-xs text-muted-foreground">מחויב פעם בחודש</p>
            </div>
            <div className="rounded-xl border-2 border-primary p-4 relative bg-primary/5 glow-fire">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                הכי נמכר
              </span>
              <p className="text-sm text-primary font-bold">שנתי</p>
              <p className="text-3xl font-black text-foreground">₪179.90</p>
              <p className="text-sm text-muted-foreground">מחויב פעם בשנה</p>
              <p className="text-sm text-primary mt-1 font-medium">שווה ערך ל־₪14.99 לחודש</p>
              <Button className="w-full mt-4 bg-primary text-primary-foreground">
                <Check className="w-4 h-4 ml-2" />
                שדרג לפרימיום
              </Button>
            </div>
          </div>
        </section>

        {/* Progress & stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">התקדמות יומית</p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '72%' }} />
            </div>
            <p className="text-sm text-primary mt-2 font-bold">72%</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">משימות</p>
            <p className="text-2xl font-black text-foreground mt-1">8/11</p>
            <p className="text-xs text-primary">3 נשארו</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">דיסציפלינה</p>
            <p className="text-2xl font-black text-foreground mt-1">87</p>
            <p className="text-xs text-primary">+4 מהשבוע שעבר</p>
          </div>
        </section>

        {/* Mobile nav preview */}
        <section className="bg-card border border-border/50 rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">ניווט תחתון (מובייל)</h3>
          <div className="flex justify-around items-center px-1 py-2 border-t border-border/50">
            {[
              { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
              { id: 'workouts', label: 'אימונים', icon: Dumbbell },
              { id: 'growth', label: 'צמיחה', icon: TrendingUp },
              { id: 'analytics', label: 'נתונים', icon: BarChart3 },
              { id: 'settings', label: 'עוד', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[11px] font-semibold">{tab.label}</span>
                  {isActive && <div className="absolute -top-1 w-8 h-0.5 bg-primary rounded-full" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Before/after */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">אדום נוכחי</p>
            <div className="w-full h-12 rounded-lg bg-[hsl(14_100%_57%)]" />
            <p className="text-xs text-foreground mt-1">HSL(14 100% 57%)</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">ליים חדש</p>
            <div className="w-full h-12 rounded-lg bg-[#B6DD0E]" />
            <p className="text-xs text-foreground mt-1">HSL(72 88% 46%)</p>
          </div>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          אם הדמו נראה טוב — ניישם את הצבע הזה באפליקציה בצורה גלובלית. אם לא — נמחק את הדף הזה.
        </p>
      </main>
    </div>
  );
};

export default ColorDemo;
