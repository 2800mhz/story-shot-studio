import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit2, Trash2, Check, X } from 'lucide-react';
import type { SceneCard as SceneCardType, Character, Location } from '@/types';

interface SceneCardProps {
  scene: SceneCardType;
  characters: Character[];
  locations: Location[];
  onUpdateNote: (sceneId: string, note: string) => void;
  onGeneratePrompts: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onRemoveCharacter: (sceneId: string, characterId: string) => void;
  onRemoveLocation: (sceneId: string, locationId: string) => void;
}

export function SceneCard({
  scene,
  characters,
  locations,
  onUpdateNote,
  onGeneratePrompts,
  onDeleteScene,
  onRemoveCharacter,
  onRemoveLocation,
}: SceneCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState(scene.visualNote);

  const handleSaveNote = () => {
    onUpdateNote(scene.id, editedNote);
    setIsEditingNote(false);
  };

  const hasPrompts = scene.prompts.length > 0;

  return (
    <div className="mb-4 rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Sahne {scene.sceneNumber}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                scene.status === 'ready' ? 'bg-green-500/20 text-green-600' :
                scene.status === 'generating' ? 'bg-yellow-500/20 text-yellow-600' :
                'bg-secondary text-secondary-foreground'
              }`}>
                {scene.status === 'analyzed' && '📋 Analiz Tamamlandı'}
                {scene.status === 'generating' && '⏳ Prompt Üretiliyor...'}
                {scene.status === 'ready' && '✅ Hazır'}
              </span>
            </div>

            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={editedNote}
                  onChange={e => setEditedNote(e.target.value)}
                  placeholder="Türkçe görsel açıklama..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveNote}>
                    <Check className="h-3 w-3 mr-1" /> Kaydet
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setIsEditingNote(false); setEditedNote(scene.visualNote); }}>
                    <X className="h-3 w-3 mr-1" /> İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-base font-medium flex-1">"{scene.visualNote}"</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setIsEditingNote(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive shrink-0 ml-1"
            onClick={() => onDeleteScene(scene.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
            Sahne metni (tıkla göster)
          </summary>
          <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded leading-relaxed">
            {scene.text}
          </p>
        </details>
      </div>

      {/* Entities */}
      <div className="border-b p-3 space-y-2 bg-muted/10">
        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">👤 Karakterler:</div>
          <div className="flex flex-wrap gap-1">
            {characters.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Henüz karakter yok</span>
            ) : (
              characters.map(char => (
                <span key={char.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {char.name}
                  <button
                    onClick={() => onRemoveCharacter(scene.id, char.id)}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">📍 Mekanlar:</div>
          <div className="flex flex-wrap gap-1">
            {locations.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Henüz mekan yok</span>
            ) : (
              locations.map(loc => (
                <span key={loc.id} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                  {loc.name}
                  <button
                    onClick={() => onRemoveLocation(scene.id, loc.id)}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Prompts */}
      {hasPrompts ? (
        <div className="p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Üretilen Promptlar:</div>
          {scene.prompts.map(prompt => (
            <div key={prompt.id} className="border rounded-md p-3 bg-muted/20">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="text-xs font-semibold text-primary">{prompt.summary}</div>
                  <div className="text-xs text-muted-foreground">{prompt.shotType}</div>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground px-1"
                  onClick={() => navigator.clipboard.writeText(prompt.promptText)}
                  title="Kopyala"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded leading-relaxed">
                {prompt.promptText}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Prompt'lar henüz üretilmedi</p>
          <Button
            size="sm"
            onClick={() => onGeneratePrompts(scene.id)}
            disabled={scene.status === 'generating'}
            className="h-8 text-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {scene.status === 'generating' ? 'Üretiliyor...' : 'Promptları Üret'}
          </Button>
        </div>
      )}
    </div>
  );
}
