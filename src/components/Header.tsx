import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Download, Film, Upload, Info, Video, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onUploadMain: () => void;
  onExport: () => void;
  onImport: (fileContent: string) => void;
  onSettings: () => void;
  onInfo: () => void;
  mainFileName: string;
  disabledActions?: boolean;
}

export function Header({
  onUploadMain,
  onExport,
  onImport,
  onSettings,
  onInfo,
  mainFileName,
  disabledActions = false,
}: HeaderProps) {
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
    <header className="flex items-center justify-between border-b border-border/70 bg-card/95 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Film className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">Prompt Forge</h1>
          <p className="text-xs text-muted-foreground">Episode workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-2 py-2">
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabledActions}>
            <FolderUp className="mr-1.5 h-3.5 w-3.5" />
            Ice aktar
          </Button>

          <Button variant="ghost" size="sm" className="max-w-[240px]" disabled={disabledActions} onClick={onUploadMain}>
            <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mainFileName || 'Metin yukle'}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={onExport} disabled={disabledActions}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Disa aktar
          </Button>
        </div>

        <Link to="/motion-prompt">
          <Button variant="outline" size="sm" disabled={disabledActions}>
            <Video className="mr-1.5 h-3.5 w-3.5" />
            Motion
          </Button>
        </Link>

        <Button variant="ghost" size="icon" onClick={onInfo} title="Nasil calisir?">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
