import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Download, Film, Upload, Info, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onUploadMain: () => void;
  onUploadScript: () => void;
  onExport: () => void;
  onSettings: () => void;
  onInfo: () => void;
  mainFileName: string;
}

export function Header({ onUploadMain, onUploadScript, onExport, onSettings, onInfo, mainFileName }: HeaderProps) {
  return (
    <header className="film-grain flex items-center justify-between border-b bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <Film className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">
            Story Shot Studio
          </h1>
          <p className="text-xs text-muted-foreground">Görsel Prompt Üretici</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[200px]">
              <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{mainFileName || 'Metin Yükle'}</span>
              <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUploadMain}>
              📄 Seslendirme Metni
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUploadScript}>
              🎬 Senaryo (.docx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
