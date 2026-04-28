import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Download, Film, Upload, Info, Video, ChevronDown, FolderUp } from 'lucide-react';
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
  onImport: (fileContent: string) => void;
  onSettings: () => void;
  onInfo: () => void;
  mainFileName: string;
  disabledActions?: boolean;
}

export function Header({ onUploadMain, onUploadScript, onExport, onImport, onSettings, onInfo, mainFileName, disabledActions = false }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onImport(content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <header className="film-grain flex items-center justify-between border-b bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <Film className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">
            Prompt Forge 4.1.0
          </h1>
          <p className="text-xs text-muted-foreground">Görsel Prompt Üretici</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
        
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabledActions}>
          <FolderUp className="mr-1.5 h-3.5 w-3.5" />
          İçe Aktar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[200px]" disabled={disabledActions}>
              <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{mainFileName || 'Metin Yükle'}</span>
              <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUploadMain} disabled={disabledActions}>
              📄 Seslendirme Metni
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUploadScript} disabled={disabledActions}>
              🎬 Senaryo (.docx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={onExport} disabled={disabledActions}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Dışa Aktar
        </Button>
        <Link to="/motion-prompt">
          <Button variant="outline" size="sm" disabled={disabledActions}>
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
