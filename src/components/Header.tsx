import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Download, Film, Upload, Info, Video, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user, signOut } = useAuth();

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

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
