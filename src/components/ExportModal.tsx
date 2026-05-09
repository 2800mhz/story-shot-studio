import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  ListChecks,
  PackageCheck,
} from 'lucide-react';
import { strToU8, zipSync } from 'fflate';
import * as XLSX from 'xlsx';
import type { Character, Location, SceneCard, TimeContext } from '@/types';

type ExportFormat = 'xlsx' | 'json' | 'txt' | 'csv' | 'zip';
type ExportScope = 'all' | 'ready' | 'withPrompts';
type ExportPresetId = 'custom' | 'promptPack' | 'productionBible' | 'motionHandoff' | 'fullBackup';
type ExportSection =
  | 'episodeStyle'
  | 'entities'
  | 'scenes'
  | 'activePrompt'
  | 'allPrompts'
  | 'cameraSlots'
  | 'analysis';

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

interface ExportPrompt {
  id?: string;
  label?: string;
  shotType: string;
  summary: string;
  explanation?: string;
  promptText: string;
  aspectRatio?: string;
  generationType?: string;
  revisionPrompt?: string;
  isPinned?: boolean;
  isStale?: boolean;
  staleReason?: string;
  slotId?: string;
}

interface ExportScene {
  id?: string;
  sceneNumber: number;
  status: string;
  text?: string;
  visualNote?: string;
  visualStyle?: string;
  characterIds?: string[];
  locationIds?: string[];
  timeContextIds?: string[];
  activePrompt?: ExportPrompt | null;
  allPrompts?: ExportPrompt[];
  cameraSlots?: Array<{
    id?: string;
    slotIndex: number;
    promptGroup: 'generated' | 'alternative';
    status: 'empty' | 'generating' | 'generated';
    label: string;
    shotType: string;
    focalLength: string;
    angleDeg: string;
    technique: string;
    framing: string;
    rationale: string;
    promptId?: string;
    prompt?: ExportPrompt | null;
  }>;
  analysis?: SceneCard['analysis'];
  optimizations?: string[];
  staleReasons?: string[];
}

interface ExportPayload {
  meta: {
    projectTitle: string;
    episodeTitle: string;
    episodeId?: string;
    exportedAt: string;
    formatVersion: string;
    scope: ExportScope;
    sections: ExportSection[];
    includeIds: boolean;
  };
  episodeStyle?: {
    en?: string;
    tr?: string;
  };
  entities?: {
    characters: Character[];
    locations: Location[];
    timeContexts: TimeContext[];
  };
  scenes?: ExportScene[];
}

const FORMAT_OPTIONS: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
}> = [
  {
    id: 'xlsx',
    label: 'Excel workbook',
    description: 'Sahneler, promptlar ve varliklar ayri sheet olarak iner.',
    icon: FileSpreadsheet,
    iconClass: 'text-emerald-400',
  },
  {
    id: 'json',
    label: 'Structured JSON',
    description: 'Pipeline veya tekrar import icin makine okunabilir paket.',
    icon: FileJson,
    iconClass: 'text-amber-300',
  },
  {
    id: 'txt',
    label: 'Readable text',
    description: 'Okuma, paylasma ve hizli review icin duz metin.',
    icon: FileText,
    iconClass: 'text-sky-400',
  },
  {
    id: 'csv',
    label: 'CSV table',
    description: 'Tablo/pipeline icin tek CSV dosyasi.',
    icon: FileSpreadsheet,
    iconClass: 'text-cyan-300',
  },
  {
    id: 'zip',
    label: 'Delivery ZIP',
    description: 'JSON, TXT, CSV ve XLSX birlikte teslim paketi.',
    icon: PackageCheck,
    iconClass: 'text-violet-300',
  },
];

const PRESET_OPTIONS: Array<{
  id: ExportPresetId;
  label: string;
  description: string;
  format: ExportFormat;
  scope: ExportScope;
  sections: ExportSection[];
  includeIds: boolean;
}> = [
  {
    id: 'promptPack',
    label: 'Prompt Paketi',
    description: 'Sahneler, aktif prompt ve tum varyasyonlar.',
    format: 'xlsx',
    scope: 'withPrompts',
    sections: ['scenes', 'activePrompt', 'allPrompts', 'cameraSlots'],
    includeIds: false,
  },
  {
    id: 'productionBible',
    label: 'Production Bible',
    description: 'Stil, varliklar, sahne kartlari ve analiz notlari.',
    format: 'xlsx',
    scope: 'all',
    sections: ['episodeStyle', 'entities', 'scenes', 'analysis'],
    includeIds: false,
  },
  {
    id: 'motionHandoff',
    label: 'Motion Handoff',
    description: 'Prompt, kamera slotlari ve shot hareket aktarimi.',
    format: 'csv',
    scope: 'withPrompts',
    sections: ['scenes', 'activePrompt', 'cameraSlots', 'analysis'],
    includeIds: true,
  },
  {
    id: 'fullBackup',
    label: 'Full Backup',
    description: 'Her sey, teknik IDlerle birlikte ZIP paketi.',
    format: 'zip',
    scope: 'all',
    sections: ['episodeStyle', 'entities', 'scenes', 'activePrompt', 'allPrompts', 'cameraSlots', 'analysis'],
    includeIds: true,
  },
];

const SECTION_OPTIONS: Array<{
  id: ExportSection;
  label: string;
  description: string;
}> = [
  {
    id: 'episodeStyle',
    label: 'Episode style',
    description: 'Bolum stili ve aciklama metinleri.',
  },
  {
    id: 'entities',
    label: 'Characters / locations / time',
    description: 'Karakter, mekan ve zaman baglami.',
  },
  {
    id: 'scenes',
    label: 'Scene cards',
    description: 'Sahne numarasi, metin ve gorsel notlar.',
  },
  {
    id: 'activePrompt',
    label: 'Active prompt',
    description: 'Pinli prompt veya ilk prompt.',
  },
  {
    id: 'allPrompts',
    label: 'All prompt variants',
    description: 'Uretilen tum prompt varyasyonlari.',
  },
  {
    id: 'cameraSlots',
    label: 'Camera angle slots',
    description: '3 ana + 3 alternatif aci; uretilmisse prompt icerigiyle.',
  },
  {
    id: 'analysis',
    label: 'Analysis notes',
    description: 'Zorluk, uretim notlari ve stale nedenleri.',
  },
];

const DEFAULT_SECTIONS: ExportSection[] = [
  'episodeStyle',
  'entities',
  'scenes',
  'activePrompt',
  'allPrompts',
];

function cleanFilePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'export';
}

function promptToExport(prompt: SceneCard['prompts'][number]): ExportPrompt {
  return {
    id: prompt.id,
    label: prompt.label,
    shotType: prompt.shotType,
    summary: prompt.summary,
    explanation: prompt.explanation,
    promptText: prompt.promptText,
    aspectRatio: prompt.aspectRatio,
    generationType: prompt.generationType,
    revisionPrompt: prompt.revisionPrompt,
    isPinned: prompt.isPinned,
    isStale: prompt.isStale,
    staleReason: prompt.staleReason,
    slotId: prompt.slotId,
  };
}

function getSlotPrompt(
  scene: SceneCard,
  slot: NonNullable<SceneCard['cameraAngleSlots']>[number],
): SceneCard['prompts'][number] | undefined {
  if (slot.promptId) {
    const promptById = scene.prompts.find((prompt) => prompt.id === slot.promptId);
    if (promptById) return promptById;
  }

  return scene.prompts.find((prompt) => prompt.slotId === slot.id);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function joinList(values?: string[]) {
  return Array.isArray(values) && values.length > 0 ? values.join(', ') : '';
}

function shouldStripIdKey(key: string): boolean {
  return key === 'id' || /Id$/.test(key) || /Ids$/.test(key);
}

function stripInternalIds<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripInternalIds(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !shouldStripIdKey(key))
        .map(([key, item]) => [key, stripInternalIds(item)]),
    ) as T;
  }

  return value;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) || (typeof value === 'object' && value !== null)
    ? JSON.stringify(value)
    : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (headers.length === 0) return '';
  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\n');
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
  episodePromptTr,
}: ExportModalProps) {
  const [format, setFormat] = React.useState<ExportFormat>('xlsx');
  const [scope, setScope] = React.useState<ExportScope>('all');
  const [sections, setSections] = React.useState<ExportSection[]>(DEFAULT_SECTIONS);
  const [preset, setPreset] = React.useState<ExportPresetId>('custom');
  const [includeIds, setIncludeIds] = React.useState(true);

  const selectedScenes = React.useMemo(() => {
    if (scope === 'ready') return sceneCards.filter((scene) => scene.status === 'ready');
    if (scope === 'withPrompts') return sceneCards.filter((scene) => scene.prompts.length > 0);
    return sceneCards;
  }, [sceneCards, scope]);

  const filenameBase = React.useMemo(
    () => `${cleanFilePart(projectTitle)}_${cleanFilePart(episodeTitle)}_promptforge_${episodeId.substring(0, 8) || 'episode'}`,
    [episodeId, episodeTitle, projectTitle],
  );

  const hasSection = React.useCallback((section: ExportSection) => sections.includes(section), [sections]);

  const buildScene = React.useCallback(
    (scene: SceneCard): ExportScene => {
      const pinnedPrompt = scene.prompts.find((prompt) => prompt.isPinned) || scene.prompts[0] || null;
      const item: ExportScene = {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        status: scene.status,
      };

      if (hasSection('scenes')) {
        item.text = scene.text;
        item.visualNote = scene.visualNote;
        item.visualStyle = (scene.visualStyle as string) === 'realistic'
          ? 'cinematic'
          : scene.visualStyle || 'cinematic';
        item.characterIds = scene.characterIds;
        item.locationIds = scene.locationIds;
        item.timeContextIds = scene.timeContextIds;
      }

      if (hasSection('activePrompt')) {
        item.activePrompt = pinnedPrompt ? promptToExport(pinnedPrompt) : null;
      }

      if (hasSection('allPrompts')) {
        item.allPrompts = scene.prompts.map(promptToExport);
      }

      if (hasSection('cameraSlots')) {
        item.cameraSlots = (scene.cameraAngleSlots || []).map((slot, index) => {
          const slotPrompt = getSlotPrompt(scene, slot);
          const exportedPrompt = slotPrompt ? promptToExport(slotPrompt) : null;

          return {
            id: slot.id,
            slotIndex: index + 1,
            promptGroup: index < 3 ? 'generated' : 'alternative',
            status: slotPrompt ? 'generated' : slot.isGenerating ? 'generating' : 'empty',
            label: slot.label,
            shotType: slotPrompt?.shotType || slot.label,
            focalLength: slot.focalLength,
            angleDeg: slot.angleDeg,
            technique: slot.technique,
            framing: slot.framing,
            rationale: slot.rationale,
            promptId: slotPrompt?.id || slot.promptId,
            prompt: exportedPrompt,
          };
        });
      }

      if (hasSection('analysis')) {
        item.analysis = scene.analysis;
        item.optimizations = scene.optimizations;
        item.staleReasons = scene.staleReasons;
      }

      return item;
    },
    [hasSection],
  );

  const buildPayload = React.useCallback((): ExportPayload => {
    const payload: ExportPayload = {
      meta: {
        projectTitle,
        episodeTitle,
        episodeId,
        exportedAt: new Date().toISOString(),
        formatVersion: '2.1',
        scope,
        sections,
        includeIds,
      },
    };

    if (hasSection('episodeStyle')) {
      payload.episodeStyle = {
        en: episodePrompt || '',
        tr: episodePromptTr || '',
      };
    }

    if (hasSection('entities')) {
      payload.entities = {
        characters,
        locations,
        timeContexts,
      };
    }

    if (
      hasSection('scenes') ||
      hasSection('activePrompt') ||
      hasSection('allPrompts') ||
      hasSection('cameraSlots') ||
      hasSection('analysis')
    ) {
      payload.scenes = selectedScenes.map(buildScene);
    }

    return includeIds ? payload : stripInternalIds(payload);
  }, [
    buildScene,
    characters,
    episodeId,
    episodePrompt,
    episodePromptTr,
    episodeTitle,
    hasSection,
    locations,
    projectTitle,
    includeIds,
    scope,
    sections,
    selectedScenes,
    timeContexts,
  ]);

  function toggleSection(section: ExportSection) {
    setPreset('custom');
    setSections((current) => {
      if (current.includes(section)) {
        const next = current.filter((item) => item !== section);
        return next.length > 0 ? next : current;
      }
      return [...current, section];
    });
  }

  function applyPreset(option: (typeof PRESET_OPTIONS)[number]) {
    setPreset(option.id);
    setFormat(option.format);
    setScope(option.scope);
    setSections(option.sections);
    setIncludeIds(option.includeIds);
  }

  function exportJson(payload: ExportPayload) {
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
      `${filenameBase}.json`,
    );
  }

  function buildText(payload: ExportPayload) {
    const lines: string[] = [];
    lines.push('PROMPT FORGE EXPORT');
    lines.push(`Project: ${payload.meta.projectTitle}`);
    lines.push(`Episode: ${payload.meta.episodeTitle}`);
    if (payload.meta.episodeId) lines.push(`Episode ID: ${payload.meta.episodeId}`);
    lines.push(`Scope: ${payload.meta.scope}`);
    lines.push(`Exported: ${payload.meta.exportedAt}`);
    lines.push('');

    if (payload.episodeStyle) {
      lines.push('== EPISODE STYLE ==');
      if (payload.episodeStyle.tr) lines.push(`[TR]\n${payload.episodeStyle.tr}`);
      if (payload.episodeStyle.en) lines.push(`[EN]\n${payload.episodeStyle.en}`);
      lines.push('');
    }

    if (payload.entities) {
      lines.push('== ENTITIES ==');
      payload.entities.characters.forEach((character) => {
        lines.push(`CHARACTER: ${character.name}${character.visualDescription ? ` - ${character.visualDescription}` : ''}`);
      });
      payload.entities.locations.forEach((location) => {
        lines.push(`LOCATION: ${location.name}${location.visualDescription ? ` - ${location.visualDescription}` : ''}`);
      });
      payload.entities.timeContexts.forEach((timeContext) => {
        lines.push(`TIME: ${timeContext.label}`);
      });
      lines.push('');
    }

    if (payload.scenes) {
      lines.push('== SCENES ==');
      payload.scenes.forEach((scene) => {
        lines.push(`--- Scene ${scene.sceneNumber} (${scene.status}) ---`);
        if (scene.visualStyle) lines.push(`Style: ${scene.visualStyle}`);
        if (scene.visualNote) lines.push(`Visual note: ${scene.visualNote}`);
        if (scene.text) lines.push(`Text: ${scene.text}`);
        if (scene.activePrompt) {
          lines.push(`Active prompt: ${scene.activePrompt.shotType}`);
          lines.push(scene.activePrompt.promptText);
        }
        if (scene.allPrompts && scene.allPrompts.length > 0) {
          lines.push('All prompts:');
          scene.allPrompts.forEach((prompt, index) => {
            lines.push(`${index + 1}. ${prompt.shotType}${prompt.isPinned ? ' [PINNED]' : ''}`);
            lines.push(prompt.promptText);
          });
        }
        if (scene.cameraSlots && scene.cameraSlots.length > 0) {
          lines.push('Camera slots:');
          scene.cameraSlots.forEach((slot) => {
            const groupLabel = slot.promptGroup === 'generated' ? 'main' : 'alternative';
            lines.push(`${slot.slotIndex}. [${groupLabel} / ${slot.status}] ${slot.shotType} - ${slot.focalLength}, ${slot.framing}, ${slot.technique}`);
            if (slot.prompt?.promptText) lines.push(slot.prompt.promptText);
          });
        }
        if (scene.analysis) {
          lines.push(`Analysis: ${scene.analysis.complexity || ''} / ${scene.analysis.difficultyScore ?? ''}`);
          if (scene.analysis.productionNotes?.length) lines.push(`Notes: ${scene.analysis.productionNotes.join(' | ')}`);
        }
        lines.push('');
      });
    }

    if (lines.length <= 6) lines.push('No selected export content.');

    return lines.join('\n');
  }

  function exportTxt(payload: ExportPayload) {
    downloadBlob(new Blob([buildText(payload)], { type: 'text/plain;charset=utf-8' }), `${filenameBase}.txt`);
  }

  function buildWorkbook(payload: ExportPayload) {
    const workbook = XLSX.utils.book_new();

    const metaRows = [
      { Field: 'Project', Value: payload.meta.projectTitle },
      { Field: 'Episode', Value: payload.meta.episodeTitle },
      ...(payload.meta.episodeId ? [{ Field: 'Episode ID', Value: payload.meta.episodeId }] : []),
      { Field: 'Scope', Value: payload.meta.scope },
      { Field: 'Sections', Value: payload.meta.sections.join(', ') },
      { Field: 'Internal IDs', Value: payload.meta.includeIds ? 'included' : 'hidden' },
      { Field: 'Exported', Value: payload.meta.exportedAt },
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metaRows), 'Overview');

    if (payload.episodeStyle) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          { Field: 'Episode style EN', Content: payload.episodeStyle.en || '' },
          { Field: 'Episode style TR', Content: payload.episodeStyle.tr || '' },
        ]),
        'Episode Style',
      );
    }

    if (payload.entities) {
      const rows = [
        ...payload.entities.characters.map((character) => ({
          Type: 'Character',
          Name: character.name,
          Detail: character.visualDescription || character.role || '',
        })),
        ...payload.entities.locations.map((location) => ({
          Type: 'Location',
          Name: location.name,
          Detail: location.visualDescription || '',
        })),
        ...payload.entities.timeContexts.map((timeContext) => ({
          Type: 'Time',
          Name: timeContext.label,
          Detail: [timeContext.era, timeContext.timeOfDay, timeContext.lighting].filter(Boolean).join(' '),
        })),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Type: '', Name: '', Detail: '' }]), 'Entities');
    }

    if (payload.scenes) {
      const sceneRows = payload.scenes.map((scene) => ({
        Scene: scene.sceneNumber,
        Status: scene.status,
        Style: scene.visualStyle || '',
        'Visual note': scene.visualNote || '',
        Text: scene.text || '',
        Characters: joinList(scene.characterIds),
        Locations: joinList(scene.locationIds),
        Time: joinList(scene.timeContextIds),
        'Active shot': scene.activePrompt?.shotType || '',
        'Active prompt': scene.activePrompt?.promptText || '',
        Complexity: scene.analysis?.complexity || '',
        Difficulty: scene.analysis?.difficultyScore ?? '',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sceneRows.length ? sceneRows : [{ Scene: '', Status: '' }]), 'Scenes');

      if (hasSection('allPrompts') || hasSection('activePrompt')) {
        const promptRows = payload.scenes.flatMap((scene) => {
          const prompts = hasSection('allPrompts')
            ? scene.allPrompts || []
            : scene.activePrompt
              ? [scene.activePrompt]
              : [];
          return prompts.map((prompt) => ({
            Scene: scene.sceneNumber,
            ...(prompt.id ? { 'Prompt ID': prompt.id } : {}),
            Label: prompt.label || '',
            Shot: prompt.shotType,
            Summary: prompt.summary,
            'Aspect ratio': prompt.aspectRatio || '',
            Pinned: prompt.isPinned ? 'yes' : '',
            Stale: prompt.isStale ? 'yes' : '',
            Prompt: prompt.promptText,
          }));
        });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(promptRows.length ? promptRows : [{ Scene: '', Prompt: '' }]), 'Prompts');
      }

      if (hasSection('cameraSlots')) {
        const slotRows = payload.scenes.flatMap((scene) =>
          (scene.cameraSlots || []).map((slot) => ({
            Scene: scene.sceneNumber,
            Slot: slot.slotIndex,
            Group: slot.promptGroup,
            Status: slot.status,
            Label: slot.label,
            Shot: slot.shotType,
            Focal: slot.focalLength,
            Angle: slot.angleDeg,
            Technique: slot.technique,
            Framing: slot.framing,
            Rationale: slot.rationale,
            Prompt: slot.prompt?.promptText || '',
            ...(slot.id ? { 'Slot ID': slot.id } : {}),
            ...(slot.promptId ? { 'Prompt ID': slot.promptId } : {}),
          })),
        );
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(slotRows.length ? slotRows : [{ Scene: '', Slot: '' }]), 'Camera Slots');
      }
    }

    return workbook;
  }

  function exportExcel(payload: ExportPayload) {
    XLSX.writeFile(buildWorkbook(payload), `${filenameBase}.xlsx`);
  }

  function buildCsvRows(payload: ExportPayload): Array<Record<string, unknown>> {
    const rows: Array<Record<string, unknown>> = [
      { table: 'meta', field: 'projectTitle', value: payload.meta.projectTitle },
      { table: 'meta', field: 'episodeTitle', value: payload.meta.episodeTitle },
      ...(payload.meta.episodeId ? [{ table: 'meta', field: 'episodeId', value: payload.meta.episodeId }] : []),
      { table: 'meta', field: 'scope', value: payload.meta.scope },
      { table: 'meta', field: 'sections', value: payload.meta.sections.join('|') },
      { table: 'meta', field: 'includeIds', value: payload.meta.includeIds ? 'yes' : 'no' },
      { table: 'meta', field: 'exportedAt', value: payload.meta.exportedAt },
    ];

    if (payload.episodeStyle) {
      rows.push({ table: 'episodeStyle', field: 'en', value: payload.episodeStyle.en || '' });
      rows.push({ table: 'episodeStyle', field: 'tr', value: payload.episodeStyle.tr || '' });
    }

    if (payload.entities) {
      payload.entities.characters.forEach((character) => {
        rows.push({
          table: 'entities',
          type: 'character',
          id: 'id' in character ? character.id : undefined,
          name: character.name,
          detail: character.visualDescription || character.role || '',
        });
      });
      payload.entities.locations.forEach((location) => {
        rows.push({
          table: 'entities',
          type: 'location',
          id: 'id' in location ? location.id : undefined,
          name: location.name,
          detail: location.visualDescription || '',
        });
      });
      payload.entities.timeContexts.forEach((timeContext) => {
        rows.push({
          table: 'entities',
          type: 'time',
          id: 'id' in timeContext ? timeContext.id : undefined,
          name: timeContext.label,
          detail: [timeContext.era, timeContext.timeOfDay, timeContext.lighting].filter(Boolean).join(' '),
        });
      });
    }

    payload.scenes?.forEach((scene) => {
      rows.push({
        table: 'scenes',
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        status: scene.status,
        style: scene.visualStyle || '',
        visualNote: scene.visualNote || '',
        text: scene.text || '',
        characterIds: joinList(scene.characterIds),
        locationIds: joinList(scene.locationIds),
        timeContextIds: joinList(scene.timeContextIds),
        activeShot: scene.activePrompt?.shotType || '',
        activePrompt: scene.activePrompt?.promptText || '',
        complexity: scene.analysis?.complexity || '',
        difficulty: scene.analysis?.difficultyScore ?? '',
      });

      const prompts = scene.allPrompts || (scene.activePrompt ? [scene.activePrompt] : []);
      prompts.forEach((prompt) => {
        rows.push({
          table: 'prompts',
          sceneNumber: scene.sceneNumber,
          id: prompt.id,
          label: prompt.label || '',
          shotType: prompt.shotType,
          summary: prompt.summary,
          aspectRatio: prompt.aspectRatio || '',
          pinned: prompt.isPinned ? 'yes' : '',
          stale: prompt.isStale ? 'yes' : '',
          prompt: prompt.promptText,
        });
      });

      scene.cameraSlots?.forEach((slot) => {
        rows.push({
          table: 'cameraSlots',
          sceneNumber: scene.sceneNumber,
          id: slot.id,
          slot: slot.slotIndex,
          group: slot.promptGroup,
          status: slot.status,
          label: slot.label,
          shotType: slot.shotType,
          focalLength: slot.focalLength,
          angle: slot.angleDeg,
          technique: slot.technique,
          framing: slot.framing,
          rationale: slot.rationale,
          promptId: slot.promptId || '',
          prompt: slot.prompt?.promptText || '',
        });
      });
    });

    return rows.map((row) =>
      Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)),
    );
  }

  function buildCsv(payload: ExportPayload) {
    return rowsToCsv(buildCsvRows(payload));
  }

  function exportCsv(payload: ExportPayload) {
    downloadBlob(new Blob([buildCsv(payload)], { type: 'text/csv;charset=utf-8' }), `${filenameBase}.csv`);
  }

  function exportZip(payload: ExportPayload) {
    const workbookArray = XLSX.write(buildWorkbook(payload), { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const zipData: Record<string, Uint8Array> = {
      'data.json': strToU8(JSON.stringify(payload, null, 2)),
      'review.txt': strToU8(buildText(payload)),
      'tables.csv': strToU8(buildCsv(payload)),
      'workbook.xlsx': new Uint8Array(workbookArray),
    };

    const zipped = zipSync(zipData);
    downloadBlob(new Blob([zipped], { type: 'application/zip' }), `${filenameBase}.zip`);
  }

  function handleExport() {
    const payload = buildPayload();
    if (format === 'xlsx') exportExcel(payload);
    if (format === 'json') exportJson(payload);
    if (format === 'txt') exportTxt(payload);
    if (format === 'csv') exportCsv(payload);
    if (format === 'zip') exportZip(payload);
    onClose();
  }

  const selectedPromptCount = selectedScenes.reduce((total, scene) => total + scene.prompts.length, 0);
  const selectedSectionLabels = sections
    .map((section) => SECTION_OPTIONS.find((option) => option.id === section)?.label)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[92vh] border-border bg-card p-0 sm:max-w-[96vw] xl:max-w-6xl">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <PackageCheck className="h-5 w-5 text-primary" />
            Export paketi hazirla
          </DialogTitle>
          <DialogDescription>
            Dosya turunu, sahne kapsamini ve pakete girecek icerigi sec.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-0 overflow-y-auto scrollbar-thin md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 p-5 md:border-b-0 md:border-r">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ozet</div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <div className="text-2xl font-semibold">{selectedScenes.length}</div>
                <div className="text-xs text-muted-foreground">secili sahne</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <div className="text-2xl font-semibold">{selectedPromptCount}</div>
                <div className="text-xs text-muted-foreground">prompt varyasyonu</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <div className="text-sm font-medium">{episodeTitle}</div>
                <div className="mt-1 text-xs text-muted-foreground">{projectTitle}</div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icerik</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]">
                {preset === 'custom' ? 'Custom' : PRESET_OPTIONS.find((option) => option.id === preset)?.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {includeIds ? 'IDs included' : 'Human readable'}
              </Badge>
              {selectedSectionLabels.map((label) => (
                <Badge key={label} variant="outline" className="text-[10px]">
                  {label}
                </Badge>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-6 p-5">
            <section>
              <div className="mb-3 text-sm font-semibold">Presetler</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESET_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      'rounded-lg border border-border/70 bg-background/40 p-3 text-left transition-colors hover:border-primary/35',
                      preset === option.id && 'border-primary/60 bg-primary/[0.04]',
                    )}
                    onClick={() => applyPreset(option)}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" />
                Dosya turu
              </div>
              <RadioGroup
                value={format}
                onValueChange={(value: ExportFormat) => {
                  setPreset('custom');
                  setFormat(value);
                }}
                className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
              >
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'min-w-0 cursor-pointer rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/35',
                        format === option.id && 'border-primary/60 bg-primary/[0.04]',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <RadioGroupItem value={option.id} />
                        <Icon className={cn('h-4 w-4', option.iconClass)} />
                        <span className="min-w-0 truncate text-sm font-medium">{option.label}</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">{option.description}</div>
                    </label>
                  );
                })}
              </RadioGroup>
            </section>

            <section>
              <div className="mb-3 text-sm font-semibold">Kapsam</div>
              <RadioGroup
                value={scope}
                onValueChange={(value: ExportScope) => {
                  setPreset('custom');
                  setScope(value);
                }}
                className="grid gap-2 sm:grid-cols-3"
              >
                {[
                  { id: 'all', label: 'Tum sahneler', description: `${sceneCards.length} sahne` },
                  { id: 'ready', label: 'Hazir sahneler', description: `${sceneCards.filter((scene) => scene.status === 'ready').length} sahne` },
                  { id: 'withPrompts', label: 'Promptlu sahneler', description: `${sceneCards.filter((scene) => scene.prompts.length > 0).length} sahne` },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      'cursor-pointer rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/35',
                      scope === option.id && 'border-primary/60 bg-primary/[0.04]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={option.id} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/35">
                <Checkbox
                  checked={includeIds}
                  onCheckedChange={(checked) => {
                    setPreset('custom');
                    setIncludeIds(checked === true);
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Include internal IDs</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Pipeline/backup icin teknik scene, prompt ve entity id alanlarini dosyaya koy.
                  </span>
                </span>
              </label>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-4 w-4 text-primary" />
                Pakete dahil edilecekler
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECTION_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/35"
                  >
                    <Checkbox
                      checked={sections.includes(option.id)}
                      onCheckedChange={() => toggleSection(option.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Vazgec
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            {format === 'zip' ? 'ZIP paketi indir' : `${format.toUpperCase()} indir`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
