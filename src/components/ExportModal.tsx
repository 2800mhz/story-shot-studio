import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SceneCard, Character, Location, TimeContext } from '@/types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  projectTitle: string;
  episodeTitle: string;
  episodeId: string;
  episodePrompt?: string;
  episodePromptTr?: string;
}

export function ExportModal({ 
  open, 
  onClose, 
  sceneCards, 
  characters, 
  locations, 
  timeContexts, 
  projectTitle,
  episodeTitle, 
  episodeId,
  episodePrompt,
  episodePromptTr
}: ExportModalProps) {
  const filename = `${projectTitle.replace(/\s+/g, '_')}_${episodeTitle.replace(/\s+/g, '_')}_promptforge_${episodeId.substring(0, 8)}`;

  const getExportData = () => {
    return sceneCards.map(sc => {
      const pinnedPrompt = sc.prompts.find(p => p.isPinned) || sc.prompts[0];
      return {
        sceneNumber: sc.sceneNumber,
        text: sc.text,
        visualNote: sc.visualNote,
        visualStyle: sc.visualStyle || 'realistic',
        characterIds: sc.characterIds,
        locationIds: sc.locationIds,
        timeContextIds: sc.timeContextIds,
        activePrompt: pinnedPrompt ? {
          shotType: pinnedPrompt.shotType,
          promptText: pinnedPrompt.promptText,
          summary: pinnedPrompt.summary,
          isPinned: pinnedPrompt.isPinned
        } : null,
        allPrompts: sc.prompts.map(p => ({
          shotType: p.shotType,
          prompt: p.promptText,
          isPinned: p.isPinned
        }))
      };
    });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Scenes Sheet
    const data = getExportData();
    const sceneRows = data.map(d => ({
      'Sahne #': d.sceneNumber,
      'Stil': d.visualStyle,
      'Görsel Not': d.visualNote,
      'Orijinal Metin': d.text,
      'Aktif Shot Type': d.activePrompt?.shotType || '-',
      'Aktif Prompt': d.activePrompt?.promptText || '-'
    }));
    const wsScenes = XLSX.utils.json_to_sheet(sceneRows);
    XLSX.utils.book_append_sheet(wb, wsScenes, 'Sahneler');

    // 2. Entities Sheet
    const entityRows: any[] = [];
    characters.forEach(c => entityRows.push({ Tür: 'Karakter', İsim: c.name, Detay: c.visualDescription || c.role || '' }));
    locations.forEach(l => entityRows.push({ Tür: 'Mekan', İsim: l.name, Detay: l.visualDescription || '' }));
    timeContexts.forEach(t => entityRows.push({ Tür: 'Zaman', İsim: t.label, Detay: `${t.era || ''} ${t.timeOfDay || ''} ${t.lighting || ''}`.trim() }));
    const wsEntities = XLSX.utils.json_to_sheet(entityRows);
    XLSX.utils.book_append_sheet(wb, wsEntities, 'Varlıklar');

    // 3. Episode Style Sheet
    const styleRows = [
      { Alan: 'Bölüm Başlığı', İçerik: episodeTitle },
      { Alan: 'Bölüm Stili (EN)', İçerik: episodePrompt || '' },
      { Alan: 'Bölüm Stili (TR)', İçerik: episodePromptTr || '' }
    ];
    const wsStyle = XLSX.utils.json_to_sheet(styleRows);
    XLSX.utils.book_append_sheet(wb, wsStyle, 'Bölüm Stili');

    XLSX.writeFile(wb, `${filename}.xlsx`);
    onClose();
  };

  const exportTxt = () => {
    const data = getExportData();
    let content = `====================================================\n`;
    content += ` BÖLÜM DIŞA AKTARIMI: ${episodeTitle}\n`;
    content += `====================================================\n\n`;

    if (episodePrompt || episodePromptTr) {
      if (episodePromptTr) {
        content += `[BÖLÜM STİLİ - TR]\n${episodePromptTr}\n\n`;
      }
      if (episodePrompt) {
        content += `[BÖLÜM STİLİ - EN]\n${episodePrompt}\n\n`;
      }
      content += `----------------------------------------------------\n\n`;
    }

    if (characters.length > 0 || locations.length > 0 || timeContexts.length > 0) {
      content += `[VARLIKLAR]\n`;
      characters.forEach(c => content += `- KARAKTER: ${c.name} ${c.visualDescription ? `(${c.visualDescription})` : ''}\n`);
      locations.forEach(l => content += `- MEKAN: ${l.name} ${l.visualDescription ? `(${l.visualDescription})` : ''}\n`);
      timeContexts.forEach(t => content += `- ZAMAN: ${t.label}\n`);
      content += `\n----------------------------------------------------\n\n`;
    }
    
    data.forEach(d => {
      content += `=== SAHNE ${d.sceneNumber} ===\n`;
      content += `NOT: ${d.visualNote || '(Belirtilmedi)'}\n`;
      if (d.activePrompt) {
        content += `PROMPT [${d.activePrompt.shotType.toUpperCase()}]:\n${d.activePrompt.promptText}\n`;
      } else {
        content += `PROMPT: (Henüz üretilmedi)\n`;
      }
      content += `\n`;
    });

    if (data.length === 0) {
      content += `Bu bölümde henüz sahne bulunmuyor.\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.txt`; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportJson = () => {
    const data = {
      episodeId,
      episodeTitle,
      style: {
        en: episodePrompt,
        tr: episodePromptTr
      },
      entities: {
        characters,
        locations,
        timeContexts
      },
      scenes: getExportData()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.json`; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">Dışa Aktar</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button variant="outline" className="w-full justify-start gap-3" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 text-green-400" />
            Excel (.xlsx)
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={exportTxt}>
            <FileText className="h-4 w-4 text-blue-400" />
            Düz Metin (.txt)
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={exportJson}>
            <FileJson className="h-4 w-4 text-primary" />
            JSON (.json)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
