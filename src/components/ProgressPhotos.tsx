import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Camera, Upload, Trash2, Eye, EyeOff, ImagePlus, Users, Lock, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchPhotos();
      fetchCommunityPhotos();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const fetchPhotos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('photo_date', { ascending: false });
    if (data) setPhotos(data as ProgressPhoto[]);
  };

  const fetchCommunityPhotos = async () => {
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setCommunityPhotos(data as ProgressPhoto[]);
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            תמונות התקדמות
          </CardTitle>
          <div className="flex gap-2">
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
                  // Group by user+date into before/after pairs
                  const groups = new Map<string, { before?: ProgressPhoto; after?: ProgressPhoto }>();
                  communityPhotos.forEach(p => {
                    const key = `${p.user_id}_${p.photo_date}`;
                    if (!groups.has(key)) groups.set(key, {});
                    const g = groups.get(key)!;
                    if (p.photo_type === 'before' && !g.before) g.before = p;
                    if (p.photo_type === 'after' && !g.after) g.after = p;
                  });
                  return Array.from(groups.entries()).map(([key, { before, after }]) => (
                    <div key={key} className="rounded-xl border border-border/30 overflow-hidden bg-card/50">
                      <div className="grid grid-cols-2 gap-0.5">
                        <div className="relative">
                          {before ? (
                            <img src={before.image_url} alt="לפני" className="w-full aspect-square object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full aspect-square bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">אין תמונת לפני</div>
                          )}
                          <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">לפני</span>
                        </div>
                        <div className="relative">
                          {after ? (
                            <img src={after.image_url} alt="אחרי" className="w-full aspect-square object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full aspect-square bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">אין תמונת אחרי</div>
                          )}
                          <span className="absolute top-1 right-1 text-[10px] bg-primary/80 text-white px-1.5 py-0.5 rounded">אחרי</span>
                        </div>
                      </div>
                      <div className="p-2 text-xs text-muted-foreground flex justify-between">
                        <span>{(before || after)?.photo_date}</span>
                        {(before?.caption || after?.caption) && (
                          <span className="text-foreground/70 truncate mr-2">{before?.caption || after?.caption}</span>
                        )}
                      </div>
                    </div>
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

export default ProgressPhotos;
