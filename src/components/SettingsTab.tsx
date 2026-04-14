import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';

const SettingsTab = () => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">⚙️ הגדרות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">אפקטי סאונד</div>
              <div className="text-xs text-muted-foreground">צלילים בעת סימון משימות, טיימר והישגים</div>
            </div>
            <Button
              variant={soundOn ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                const newVal = !soundOn;
                setSoundEnabled(newVal);
                setSoundOn(newVal);
              }}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundOn ? 'מופעל' : 'מושבת'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
