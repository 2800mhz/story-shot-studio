import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Scene, ConsistencyGroup } from '@/types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
}

export function ExportModal({ open, onClose, scenes, consistencyGroups }: ExportModalProps) {
  const getGroupLabel = (scene: Scene) => {
    if (!scene.consistencyGroupIds || scene.consistencyGroupIds.length === 0) return '';
    const labels = scene.consistencyGroupIds
      .map(gId => consistencyGroups.find(gr => gr.id === gId))
      .filter(Boolean)
      .map(g => `Grup ${g!.label}`);
    return labels.join(', ');
  };

  const exportExcel = () => {
    const rows = scenes.flatMap((scene, si) =>
      scene.prompts.map(p => ({
        'Sahne #': si + 1,
        'Bölüm': scene.episodeTitle,
        'Türkçe Metin': scene.segments.map(s => s.text).join(' '),
        'Shot Type': p.shotType,
        'Prompt': p.text,
        'Grup': getGroupLabel(scene),
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prompts');
    XLSX.writeFile(wb, 'prompts.xlsx');
    onClose();
  };

  const exportTxt = () => {
    let content = '';
    scenes.forEach((scene, si) => {
      content += `\n=== SAHNE ${si + 1} — ${scene.episodeTitle} ===\n`;
      const gl = getGroupLabel(scene);
      if (gl) content += `[${gl}]\n`;
      content += `Metin: ${scene.segments.map(s => s.text).join(' ')}\n\n`;
      scene.prompts.forEach((p, pi) => {
        content += `PROMPT ${pi + 1} [${p.shotType}]:\n${p.text}\n\n`;
      });
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prompts.txt'; a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportJson = () => {
    const data = scenes.map((scene, si) => ({
      sceneNumber: si + 1,
      episodeTitle: scene.episodeTitle,
      consistencyGroup: getGroupLabel(scene),
      segments: scene.segments,
      subjectReferences: scene.subjectReferences,
      prompts: scene.prompts.map(p => ({ shotType: p.shotType, text: p.text, versions: p.versions })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prompts.json'; a.click();
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
