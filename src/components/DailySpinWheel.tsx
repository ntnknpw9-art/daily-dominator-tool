import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const PRIZES = [
  { label: 'XP x2', type: 'xp_double', value: 2, color: 'hsl(var(--primary))', emoji: '⚡' },
  { label: '+50 XP', type: 'xp_bonus', value: 50, color: '#22c55e', emoji: '✨' },
  { label: 'דילוג עונש', type: 'skip_punishment', value: 1, color: '#f59e0b', emoji: '🛡️' },
  { label: '+100 XP', type: 'xp_bonus', value: 100, color: '#8b5cf6', emoji: '🔥' },
  { label: 'תג מיוחד', type: 'special_badge', value: 1, color: '#ec4899', emoji: '👑' },
  { label: '+25 XP', type: 'xp_bonus', value: 25, color: '#06b6d4', emoji: '💎' },
  { label: 'סטריק בוסט', type: 'streak_boost', value: 1, color: '#f97316', emoji: '🔥' },
  { label: '+75 XP', type: 'xp_bonus', value: 75, color: '#10b981', emoji: '⭐' },
];

const DailySpinWheel = () => {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showPrize, setShowPrize] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) checkSpinStatus();
  }, [user]);

  useEffect(() => {
    drawWheel();
  }, [rotation]);

  const checkSpinStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('daily_spins')
      .select('*')
      .eq('user_id', user.id)
      .eq('spin_date', today)
      .maybeSingle();
    if (data) setAlreadySpun(true);
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;
    const sliceAngle = (2 * Math.PI) / PRIZES.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);

    PRIZES.forEach((p, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Heebo, sans-serif';
      ctx.fillText(p.emoji, radius * 0.65, 5);
      ctx.font = '11px Heebo, sans-serif';
      ctx.fillText(p.label, radius * 0.45, -8);
      ctx.restore();
    });

    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Arrow pointer at top
    ctx.beginPath();
    ctx.moveTo(center - 12, 2);
    ctx.lineTo(center + 12, 2);
    ctx.lineTo(center, 22);
    ctx.closePath();
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fill();
  };

  const spin = async () => {
    if (!user || spinning || alreadySpun) return;
    setSpinning(true);
    setShowPrize(false);

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const selectedPrize = PRIZES[prizeIndex];
    const sliceAngle = 360 / PRIZES.length;
    // Spin 5 full rotations + land on the prize
    const targetRotation = 360 * 5 + (360 - prizeIndex * sliceAngle - sliceAngle / 2);

    // Animate
    const startRotation = rotation;
    const totalRotation = targetRotation;
    const duration = 4000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(startRotation + totalRotation * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPrize(selectedPrize);
        setShowPrize(true);
        setSpinning(false);
        setAlreadySpun(true);
        saveSpin(selectedPrize);
        applyPrize(selectedPrize);
      }
    };

    requestAnimationFrame(animate);
  };

  const saveSpin = async (p: typeof PRIZES[0]) => {
    if (!user) return;
    await supabase.from('daily_spins').insert({
      user_id: user.id,
      spin_date: today,
      prize_type: p.type,
      prize_value: p.value,
    });
  };

  const applyPrize = async (p: typeof PRIZES[0]) => {
    if (!user) return;
    if (p.type === 'xp_bonus') {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('xp')
        .eq('user_id', user.id)
        .maybeSingle();
      if (stats) {
        await supabase
          .from('user_stats')
          .update({ xp: stats.xp + p.value })
          .eq('user_id', user.id);
      }
      toast.success(`🎉 זכית ב-${p.value} XP!`);
    } else if (p.type === 'xp_double') {
      toast.success('⚡ XP כפול על כל משימה היום!');
    } else if (p.type === 'skip_punishment') {
      toast.success('🛡️ דילוג על עונש אחד!');
    } else if (p.type === 'special_badge') {
      toast.success('👑 תג מיוחד נפתח!');
    } else if (p.type === 'streak_boost') {
      toast.success('🔥 סטריק בוסט מופעל!');
    }
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          🎰 גלגל מזל יומי
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="rounded-full"
          />
        </div>

        {showPrize && prize && (
          <div className="text-center animate-scale-in">
            <div className="text-4xl mb-2">{prize.emoji}</div>
            <Badge className="text-lg px-4 py-1" style={{ backgroundColor: prize.color }}>
              {prize.label}
            </Badge>
          </div>
        )}

        <Button
          onClick={spin}
          disabled={spinning || alreadySpun}
          size="lg"
          className="w-full max-w-[200px]"
        >
          {spinning ? '🎰 מסתובב...' : alreadySpun ? '✅ כבר סובבת היום' : '🎯 סובב את הגלגל!'}
        </Button>

        {alreadySpun && !showPrize && (
          <p className="text-xs text-muted-foreground">חזור מחר לסיבוב נוסף!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySpinWheel;
