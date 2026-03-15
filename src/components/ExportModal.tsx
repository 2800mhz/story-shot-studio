import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SceneCard } from '@/types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sceneCards: SceneCard[];
  episodeTitle: string;
  episodeId: string;
}

export function ExportModal({ open, onClose, sceneCards, episodeTitle, episodeId }: ExportModalProps) {
  const filename = `${episodeTitle.replace(/\s+/g, '_')}_promptforge_${episodeId.substring(0, 8)}`;

  const getExportData = () => {
    return sceneCards
      .filter(sc => sc.prompts.length > 0)
      .map(sc => {
        const pinnedPrompt = sc.prompts.find(p => p.isPinned) || sc.prompts[0];
        return {
          sceneNumber: sc.sceneNumber,
          text: sc.text,
          visualNote: sc.visualNote,
          shotType: pinnedPrompt?.shotType || '',
          prompt: pinnedPrompt?.promptText || '',
          summary: pinnedPrompt?.summary || '',
          isPinned: !!sc.prompts.find(p => p.isPinned),
          allPrompts: sc.prompts.map(p => ({
            shotType: p.shotType,
            prompt: p.promptText,
            isPinned: p.isPinned
          }))
        };
      });
  };

  const exportExcel = () => {
    const data = getExportData();
    const rows = data.map(d => ({
      'Sahne #': d.sceneNumber,
      'Görsel Not': d.visualNote,
      'Shot Type': d.shotType,
      'Prompt': d.prompt,
      'Pinli mi': d.isPinned ? 'Evet' : 'Hayır'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prompts');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    onClose();
  };

  const exportTxt = () => {
    const data = getExportData();
    let content = `EXPORTS FOR: ${episodeTitle}\nID: ${episodeId}\n-----------------------------------\n\n`;
    
    data.forEach(d => {
      content += `=== SAHNE ${d.sceneNumber} ===\n`;
      content += `GÖRSEL NOT: ${d.visualNote}\n`;
      content += `METİN ÖZETİ: ${d.text}\n`;
      content += `AKTİF PROMPT [${d.shotType}]:\n${d.prompt}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.txt`; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportJson = () => {
    const data = getExportData();
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
