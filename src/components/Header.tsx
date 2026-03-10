import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Download, Film, Upload, Info, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onUploadMain: () => void;
  onExport: () => void;
  onSettings: () => void;
  onInfo: () => void;
  mainFileName: string;
}

export function Header({ onUploadMain, onExport, onSettings, onInfo, mainFileName }: HeaderProps) {
  return (
    <header className="film-grain flex items-center justify-between border-b bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <Film className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">
            Prompt Forge 2.3.73
          </h1>
          <p className="text-xs text-muted-foreground">Görsel Prompt Üretici</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onUploadMain} className="max-w-[180px]">
          <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{mainFileName || 'Ana Metin'}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Dışa Aktar
        </Button>
        <Link to="/motion-prompt">
          <Button variant="outline" size="sm">
            <Video className="mr-1.5 h-3.5 w-3.5" />
            Motion
          </Button>
        </Link>
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
