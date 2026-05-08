import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Camera, Upload, Trash2, Eye, EyeOff, ImagePlus, Users, Lock, SlidersHorizontal, X, Heart, MessageCircle, Send, Sparkles, Loader2, Target, Dumbbell, History, Flag, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import ApplyPlanDialog from './ApplyPlanDialog';
import PlanHistoryDialog from './PlanHistoryDialog';
import ReportPhotoDialog from './ReportPhotoDialog';
import CommunityEula, { hasAcceptedEula } from './CommunityEula';

interface ProgressPhoto {
  id: string;
  user_id: string;
  image_url: string;
  photo_type: string;
  caption: string | null;
  is_public: boolean;
  photo_date: string;
  created_at: string;
}

const ProgressPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [communityPhotos, setCommunityPhotos] = useState<ProgressPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'before' | 'after'>('after');
  const [isPublic, setIsPublic] = useState(false);
  const [caption, setCaption] = useState('');
  const [viewMode, setViewMode] = useState<'mine' | 'community' | 'compare'>('mine');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [compareBefore, setCompareBefore] = useState<ProgressPhoto | null>(null);
  const [compareAfter, setCompareAfter] = useState<ProgressPhoto | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [goal, setGoal] = useState<'cut' | 'recomp' | 'bulk' | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [eulaOpen, setEulaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const requireEulaThen = (next: () => void) => {
    if (hasAcceptedEula()) { next(); return; }
    setEulaOpen(true);
    pendingEulaActionRef.current = next;
  };
  const pendingEulaActionRef = useRef<(() => void) | null>(null);

  const blockUser = async (blockedId: string) => {
    if (!user || blockedId === user.id) return;
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_id: blockedId,
    });
    if (error && !error.message.includes('duplicate')) {
      toast.error('שגיאה בחסימה');
      return;
    }
    toast.success('המשתמש נחסם. לא תראה ממנו תוכן.');
    setBlockedIds(prev => new Set(prev).add(blockedId));
    fetchCommunityPhotos();
  };

  const fetchBlocks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    if (data) setBlockedIds(new Set(data.map((d: any) => d.blocked_id)));
  };

  const handleTargetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('התמונה גדולה מדי (מקס 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setTargetImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyzeProgress = async (selectedGoal: 'cut' | 'recomp' | 'bulk') => {
    if (!compareBefore || !compareAfter) return;
    setGoal(selectedGoal);
    setAnalyzing(true);
    setAiAnalysis('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-progress-compare', {
        body: {
          beforeUrl: compareBefore.image_url,
          afterUrl: compareAfter.image_url,
          beforeDate: compareBefore.photo_date,
          afterDate: compareAfter.photo_date,
          goal: selectedGoal,
          targetUrl: targetImage,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setAiAnalysis(data?.analysis || '');
      }
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בניתוח AI');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPhotos();
      fetchBlocks();
      fetchCommunityPhotos();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const signPhotoUrls = async (rows: ProgressPhoto[]): Promise<ProgressPhoto[]> => {
    return Promise.all(
      rows.map(async (p) => {
        const path = p.image_url.split('/progress-photos/')[1];
        if (!path) return p;
        const { data } = await supabase.storage
          .from('progress-photos')
          .createSignedUrl(path, 60 * 60);
        return data?.signedUrl ? { ...p, image_url: data.signedUrl } : p;
      })
    );
  };

  const fetchPhotos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false });
    if (data) setPhotos(await signPhotoUrls(data as ProgressPhoto[]));
  };

  const fetchCommunityPhotos = async () => {
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const filtered = (data as ProgressPhoto[]).filter(p => !blockedIds.has(p.user_id));
      setCommunityPhotos(await signPhotoUrls(filtered));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (!user || selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('progress-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('progress-photos')
          .getPublicUrl(fileName);

        await supabase.from('progress_photos').insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          photo_type: uploadType,
          caption: caption || null,
          is_public: isPublic,
          photo_date: today,
        });
      }

      toast.success(`${selectedFiles.length} תמונות הועלו בהצלחה! 📸`);
      setSelectedFiles([]);
      setPreviews([]);
      setCaption('');
      fetchPhotos();
      if (isPublic) fetchCommunityPhotos();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהעלאת תמונות');
    } finally {
      setUploading(false);
    }
  };

  const togglePublic = async (photo: ProgressPhoto) => {
    await supabase
      .from('progress_photos')
      .update({ is_public: !photo.is_public })
      .eq('id', photo.id);
    toast.success(photo.is_public ? 'התמונה הוסתרה' : 'התמונה פורסמה');
    fetchPhotos();
    fetchCommunityPhotos();
  };

  const deletePhoto = async (photo: ProgressPhoto) => {
    const path = photo.image_url.split('/progress-photos/')[1];
    if (path) {
      await supabase.storage.from('progress-photos').remove([path]);
    }
    await supabase.from('progress_photos').delete().eq('id', photo.id);
    toast.success('תמונה נמחקה');
    fetchPhotos();
    fetchCommunityPhotos();
  };

  const myBefore = photos.filter(p => p.photo_type === 'before');
  const myAfter = photos.filter(p => p.photo_type === 'after');

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            תמונות התקדמות
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={viewMode === 'mine' ? 'default' : 'outline'}
              onClick={() => setViewMode('mine')}
            >
              <Lock className="w-3 h-3 ml-1" />
              שלי
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'community' ? 'default' : 'outline'}
              onClick={() => setViewMode('community')}
            >
              <Users className="w-3 h-3 ml-1" />
              קהילה
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'compare' ? 'default' : 'outline'}
              onClick={() => setViewMode('compare')}
              disabled={myBefore.length === 0 || myAfter.length === 0}
            >
              <SlidersHorizontal className="w-3 h-3 ml-1" />
              השוואה
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewMode === 'mine' && (
          <>
            {/* Upload section */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/20">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={uploadType === 'before' ? 'default' : 'outline'}
                    onClick={() => setUploadType('before')}
                  >
                    לפני
                  </Button>
                  <Button
                    size="sm"
                    variant={uploadType === 'after' ? 'default' : 'outline'}
                    onClick={() => setUploadType('after')}
                  >
                    אחרי
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  <span className="text-muted-foreground">{isPublic ? 'ציבורי' : 'פרטי'}</span>
                </div>
              </div>

              <Textarea
                placeholder="תיאור (אופציונלי)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="h-16 resize-none bg-background/50"
              />

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />

              {previews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/30">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePreview(i)}
                        className="absolute top-0.5 right-0.5 bg-destructive/80 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 ml-1" />
                  בחר תמונות
                </Button>
                {selectedFiles.length > 0 && (
                  <Button
                    size="sm"
                    onClick={uploadPhotos}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 ml-1" />
                    {uploading ? 'מעלה...' : `העלה ${selectedFiles.length} תמונות`}
                  </Button>
                )}
              </div>
            </div>

            {/* Before / After comparison */}
            {(myBefore.length > 0 || myAfter.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 text-center">📷 לפני</h4>
                  <div className="space-y-2">
                    {myBefore.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">אין עדיין</p>
                    ) : (
                      myBefore.slice(0, 6).map(photo => (
                        <PhotoCard key={photo.id} photo={photo} onToggle={togglePublic} onDelete={deletePhoto} showActions />
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 text-center">💪 אחרי</h4>
                  <div className="space-y-2">
                    {myAfter.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">אין עדיין</p>
                    ) : (
                      myAfter.slice(0, 6).map(photo => (
                        <PhotoCard key={photo.id} photo={photo} onToggle={togglePublic} onDelete={deletePhoto} showActions />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>עדיין אין תמונות התקדמות</p>
                <p className="text-sm">העלה תמונות לפני/אחרי כדי לעקוב אחרי ההתקדמות שלך</p>
              </div>
            )}
          </>
        )}

        {viewMode === 'compare' && (
          <div className="space-y-4">
            {/* Photo selection */}
            {(!compareBefore || !compareAfter) && (
              <div className="space-y-3">
                {!compareBefore && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">📷 בחר תמונת לפני:</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {myBefore.map(p => (
                        <button key={p.id} onClick={() => setCompareBefore(p)} className="rounded-lg overflow-hidden border-2 border-border/30 hover:border-primary transition-colors">
                          <img src={p.image_url} alt="" className="w-full aspect-square object-cover" />
                          <span className="text-[10px] text-muted-foreground block py-0.5">{p.photo_date}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {compareBefore && !compareAfter && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">💪 בחר תמונת אחרי:</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {myAfter.map(p => (
                        <button key={p.id} onClick={() => setCompareAfter(p)} className="rounded-lg overflow-hidden border-2 border-border/30 hover:border-primary transition-colors">
                          <img src={p.image_url} alt="" className="w-full aspect-square object-cover" />
                          <span className="text-[10px] text-muted-foreground block py-0.5">{p.photo_date}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Slider comparison */}
            {compareBefore && compareAfter && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">גרור את הסליידר להשוואה</span>
                  <Button size="sm" variant="ghost" onClick={() => { setCompareBefore(null); setCompareAfter(null); setAiAnalysis(''); setGoal(null); }}>
                    <X className="w-4 h-4 ml-1" />
                    בחר מחדש
                  </Button>
                </div>
                <BeforeAfterSlider before={compareBefore.image_url} after={compareAfter.image_url} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>📷 לפני — {compareBefore.photo_date}</span>
                  <span>💪 אחרי — {compareAfter.photo_date}</span>
                </div>

                <div className="space-y-2 bg-muted/20 border border-border/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">🎯 תמונת יעד <span className="text-muted-foreground text-xs font-normal">(אופציונלי)</span></p>
                    {targetImage && (
                      <Button size="sm" variant="ghost" onClick={() => setTargetImage(null)} className="h-6 px-2 text-xs">
                        <X className="w-3 h-3 ml-1" /> הסר
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">העלה תמונה של גוף שאתה רוצה להגיע אליו — ה-AI ינתח וכוון אותך אליו ספציפית.</p>
                  <input
                    type="file"
                    ref={targetInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleTargetSelect}
                  />
                  {targetImage ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-primary/40">
                      <img src={targetImage} alt="target" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => targetInputRef.current?.click()} className="w-full">
                      <ImagePlus className="w-4 h-4 ml-1" />
                      העלה תמונת יעד
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-center text-muted-foreground">בחר את המטרה שלך:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={goal === 'cut' ? 'default' : 'outline'}
                      onClick={() => analyzeProgress('cut')}
                      disabled={analyzing}
                      className="h-auto py-3 flex-col gap-1"
                    >
                      <Target className="w-4 h-4" />
                      <span className="text-sm font-bold">חיטוב</span>
                      <span className="text-[10px] opacity-80">ירידה באחוזי שומן</span>
                    </Button>
                    <Button
                      variant={goal === 'recomp' ? 'default' : 'outline'}
                      onClick={() => analyzeProgress('recomp')}
                      disabled={analyzing}
                      className="h-auto py-3 flex-col gap-1"
                    >
                      <Dumbbell className="w-4 h-4" />
                      <span className="text-sm font-bold">ריקומפוזיציה</span>
                      <span className="text-[10px] opacity-80">שריר + ירידה בשומן</span>
                    </Button>
                    <Button
                      variant={goal === 'bulk' ? 'default' : 'outline'}
                      onClick={() => analyzeProgress('bulk')}
                      disabled={analyzing}
                      className="h-auto py-3 flex-col gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-bold">העלאת מסה</span>
                      <span className="text-[10px] opacity-80">בניית שריר</span>
                    </Button>
                  </div>
                </div>

                {analyzing && (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">מנתח את ההתקדמות והכין תוכנית מותאמת אישית...</span>
                  </div>
                )}

                {aiAnalysis && !analyzing && (
                  <div className="space-y-3">
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                      <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowApplyDialog(true)} className="flex-1 bg-gradient-to-r from-primary to-accent">
                        <Sparkles className="w-4 h-4 ml-2" />
                        החל את התוכנית באפליקציה
                      </Button>
                      <Button variant="outline" onClick={() => setShowHistoryDialog(true)} title="היסטוריה">
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                    <ApplyPlanDialog open={showApplyDialog} onOpenChange={setShowApplyDialog} analysisText={aiAnalysis} />
                  </div>
                )}
                <PlanHistoryDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog} />
              </div>
            )}
          </div>
        )}

        {viewMode === 'community' && (
          <div>
            {communityPhotos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין עדיין תמונות ציבוריות</p>
                <p className="text-sm">היה הראשון לשתף את ההתקדמות שלך!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(() => {
                  const groups = new Map<string, { before?: ProgressPhoto; after?: ProgressPhoto; photos: ProgressPhoto[] }>();
                  communityPhotos.forEach(p => {
                    const key = `${p.user_id}_${p.photo_date}`;
                    if (!groups.has(key)) groups.set(key, { photos: [] });
                    const g = groups.get(key)!;
                    g.photos.push(p);
                    if (p.photo_type === 'before' && !g.before) g.before = p;
                    if (p.photo_type === 'after' && !g.after) g.after = p;
                  });
                  return Array.from(groups.entries()).map(([key, { before, after, photos }]) => (
                    <CommunityCard key={key} before={before} after={after} photos={photos} userId={user?.id} />
                  ));
                })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PhotoCard = ({
  photo,
  onToggle,
  onDelete,
  showActions = false,
}: {
  photo: ProgressPhoto;
  onToggle?: (p: ProgressPhoto) => void;
  onDelete?: (p: ProgressPhoto) => void;
  showActions?: boolean;
}) => (
  <div className="relative rounded-lg overflow-hidden border border-border/20 group">
    <img
      src={photo.image_url}
      alt={photo.caption || 'תמונת התקדמות'}
      className="w-full aspect-square object-cover"
      loading="lazy"
    />
    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline" className="text-[10px] bg-black/30 text-white border-white/20">
            {photo.photo_type === 'before' ? 'לפני' : 'אחרי'}
          </Badge>
          {photo.is_public && (
            <Badge variant="outline" className="text-[10px] bg-green-500/30 text-green-300 border-green-400/30 mr-1">
              ציבורי
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-white/70">{photo.photo_date}</span>
      </div>
      {photo.caption && (
        <p className="text-[11px] text-white/80 mt-1 line-clamp-2">{photo.caption}</p>
      )}
    </div>
    {showActions && (
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={() => onToggle?.(photo)}
          className="bg-black/60 rounded-full p-1.5 text-white hover:bg-black/80"
          title={photo.is_public ? 'הסתר' : 'פרסם'}
        >
          {photo.is_public ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button
          onClick={() => onDelete?.(photo)}
          className="bg-destructive/60 rounded-full p-1.5 text-white hover:bg-destructive/80"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )}
  </div>
);

const BeforeAfterSlider = ({ before, after }: { before: string; after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const onPointerDown = () => { isDragging.current = true; };
  const onPointerUp = () => { isDragging.current = false; };
  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-xl overflow-hidden cursor-col-resize select-none border border-border/30"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerMove={onPointerMove}
      onClick={(e) => handleMove(e.clientX)}
    >
      {/* After (full background) */}
      <img src={after} alt="אחרי" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={before} alt="לפני" className="absolute inset-0 w-full h-full object-cover" style={{ width: containerRef.current?.offsetWidth || '100%' }} />
      </div>

      {/* Slider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <SlidersHorizontal className="w-4 h-4 text-foreground" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">לפני</span>
      <span className="absolute top-2 left-2 text-xs bg-primary/80 text-white px-2 py-0.5 rounded">אחרי</span>
    </div>
  );
};

interface CommentData {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const CommunityCard = ({ before, after, photos, userId }: {
  before?: ProgressPhoto;
  after?: ProgressPhoto;
  photos: ProgressPhoto[];
  userId?: string;
}) => {
  const [likes, setLikes] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const photoIds = photos.map(p => p.id);
  const liked = userId ? likes.includes(userId) : false;

  useEffect(() => {
    fetchLikes();
    fetchComments();
  }, []);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('photo_likes')
      .select('user_id')
      .in('photo_id', photoIds);
    if (data) setLikes(data.map((d: any) => d.user_id));
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('photo_comments')
      .select('*')
      .in('photo_id', photoIds)
      .order('created_at', { ascending: true });
    if (data) setComments(data as CommentData[]);
  };

  const toggleLike = async () => {
    if (!userId || photoIds.length === 0) return;
    const targetId = photoIds[0];
    if (liked) {
      await supabase.from('photo_likes').delete().eq('user_id', userId).eq('photo_id', targetId);
    } else {
      await supabase.from('photo_likes').insert({ user_id: userId, photo_id: targetId });
    }
    fetchLikes();
  };

  const addComment = async () => {
    if (!userId || !newComment.trim() || photoIds.length === 0) return;
    await supabase.from('photo_comments').insert({
      user_id: userId,
      photo_id: photoIds[0],
      content: newComment.trim(),
    });
    setNewComment('');
    fetchComments();
  };

  return (
    <div className="rounded-xl border border-border/30 overflow-hidden bg-card/50">
      <div className="grid grid-cols-2 gap-0.5">
        <div className="relative">
          {before ? (
            <img src={before.image_url} alt="לפני" className="w-full aspect-square object-cover" loading="lazy" />
          ) : (
            <div className="w-full aspect-square bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">אין תמונת לפני</div>
          )}
          <span className="absolute top-1 right-1 text-[10px] bg-background/60 text-foreground px-1.5 py-0.5 rounded">לפני</span>
        </div>
        <div className="relative">
          {after ? (
            <img src={after.image_url} alt="אחרי" className="w-full aspect-square object-cover" loading="lazy" />
          ) : (
            <div className="w-full aspect-square bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">אין תמונת אחרי</div>
          )}
          <span className="absolute top-1 right-1 text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">אחרי</span>
        </div>
      </div>

      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggleLike} className="flex items-center gap-1 text-sm transition-colors">
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{likes.length}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-sm">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{comments.length}</span>
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">{(before || after)?.photo_date}</span>
        </div>

        {(before?.caption || after?.caption) && (
          <p className="text-xs text-muted-foreground">{before?.caption || after?.caption}</p>
        )}

        {showComments && (
          <div className="space-y-2 border-t border-border/20 pt-2">
            {comments.map(c => (
              <div key={c.id} className="text-xs text-foreground/80 bg-muted/20 rounded px-2 py-1">
                {c.content}
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="הוסף תגובה..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={addComment}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPhotos;
