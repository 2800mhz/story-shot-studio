import React from 'react';
import { Settings, Download, Film, Upload, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onUploadMain: () => void;
  onUpload5N1K: () => void;
  onExport: () => void;
  onSettings: () => void;
  onInfo: () => void;
  mainFileName: string;
  n1kFileName: string;
}

export function Header({ onUploadMain, onUpload5N1K, onExport, onSettings, onInfo, mainFileName, n1kFileName }: HeaderProps) {
  return (
    <header className="film-grain flex items-center justify-between border-b bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <Film className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">
            Bir Mekan Bir Hikaye
          </h1>
          <p className="text-xs text-muted-foreground">Görsel Prompt Üretici</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onUploadMain} className="max-w-[180px]">
          <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{mainFileName || 'Ana Metin'}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onUpload5N1K} className="max-w-[180px]">
          <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{n1kFileName || '5N1K'}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Dışa Aktar
        </Button>
        <Button variant="ghost" size="icon" onClick={onInfo} title="Nasıl Çalışır?">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
