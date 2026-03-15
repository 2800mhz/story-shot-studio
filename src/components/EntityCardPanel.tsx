import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Character, Location, TimeContext } from '@/types';

// ── Normalization helpers ────────────────────────────────────────────────────

function normalizeCharName(name: string): string {
  let n = name.toLocaleLowerCase('tr-TR').trim();
  n = n.replace(/(.{3,})(lar|ler)$/, '$1');
  n = n.replace(/\s+/g, ' ');
  return n;
}

/** Returns a Set of character IDs that have a similar-named counterpart. */
function computeDuplicateCharIds(characters: Character[]): Set<string> {
  const normToIds = new Map<string, string[]>();
  characters.forEach(char => {
    const norm = normalizeCharName(char.name);
    const existing = normToIds.get(norm) ?? [];
    existing.push(char.id);
    normToIds.set(norm, existing);
  });

  const duplicateIds = new Set<string>();
  const norms = Array.from(normToIds.keys());

  norms.forEach(norm => {
    const ids = normToIds.get(norm)!;
    // Exact-match duplicates
    if (ids.length > 1) {
      ids.forEach(id => duplicateIds.add(id));
    }
    // Prefix-match duplicates (e.g. "sultan" ↔ "sultan ahmet")
    norms.forEach(other => {
      if (other !== norm && (other.startsWith(norm + ' ') || norm.startsWith(other + ' '))) {
        ids.forEach(id => duplicateIds.add(id));
        (normToIds.get(other) ?? []).forEach(id => duplicateIds.add(id));
      }
    });
  });

  return duplicateIds;
}

interface EntityCardPanelProps {
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  onUpsertCharacter: (c: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onUpsertLocation: (l: Location) => void;
  onDeleteLocation: (id: string) => void;
  onAddTimeContext: (t: TimeContext) => void;
  onUpdateTimeContext: (t: TimeContext) => void;
  onDeleteTimeContext: (id: string) => void;
}

// ── Character Editor ─────────────────────────────────────────────────────────

interface CharacterEditorProps {
  initial: Character;
  onSave: (c: Character) => void;
  onCancel: () => void;
}

function CharacterEditor({ initial, onSave, onCancel }: CharacterEditorProps) {
  const [form, setForm] = useState<Character>({ ...initial });
  const set = (field: keyof Character, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-2 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-amber-300">İsim *</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Karakter adı"
          />
        </div>
        <div>
          <Label className="text-xs text-amber-300">Rol</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.role ?? ''}
            onChange={e => set('role', e.target.value)}
            placeholder="Osmanlı Sultanı"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-amber-300">Yaş / Dönem</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.age ?? ''}
            onChange={e => set('age', e.target.value)}
            placeholder="Örn: 40'lı yaşlar, Genç"
          />
        </div>
        <div>
          <Label className="text-xs text-amber-300">Etnisite / Fenotip</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.ethnicity ?? ''}
            onChange={e => set('ethnicity', e.target.value)}
            placeholder="Örn: Orta Asya Türk"
          />
        </div>
        <div>
          <Label className="text-xs text-amber-300">Giyim / Kostüm</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.clothing ?? ''}
            onChange={e => set('clothing', e.target.value)}
            placeholder="Örn: Kaftan, Börk"
          />
        </div>
        <div>
          <Label className="text-xs text-amber-300">Fiziksel Özellikler</Label>
          <Input
            className="h-7 text-xs bg-background border-amber-800/50"
            value={form.physicalFeatures ?? ''}
            onChange={e => set('physicalFeatures', e.target.value)}
            placeholder="Örn: Elmacık kemikleri belirgin"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-amber-300">Görsel Betimleme (AI tarafından otomatik doldurulur)</Label>
        <Textarea
          className="text-xs bg-background border-amber-800/50 min-h-[96px] resize-none font-mono"
          value={form.visualDescription ?? ''}
          onChange={e => set('visualDescription', e.target.value)}
          placeholder="80-100 kelimelik İngilizce görsel betim (analiz sırasında AI otomatik üretir, manuel de girilebilir)..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>İptal</Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => onSave(form)} disabled={!form.name.trim()}>Kaydet</Button>
      </div>
    </div>
  );
}

// ── Location Editor ──────────────────────────────────────────────────────────

interface LocationEditorProps {
  initial: Location;
  onSave: (l: Location) => void;
  onCancel: () => void;
}

function LocationEditor({ initial, onSave, onCancel }: LocationEditorProps) {
  const [form, setForm] = useState<Location>({ ...initial });
  const set = (field: keyof Location, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-2 p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg">
      <div>
        <Label className="text-xs text-blue-300">Mekan Adı *</Label>
        <Input
          className="h-7 text-xs bg-background border-blue-800/50"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Topkapı Sarayı"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-blue-300">Dönem</Label>
          <Input
            className="h-7 text-xs bg-background border-blue-800/50"
            value={form.period ?? ''}
            onChange={e => set('period', e.target.value)}
            placeholder="Örn: 13. Yüzyıl"
          />
        </div>
        <div>
          <Label className="text-xs text-blue-300">Coğrafya</Label>
          <Input
            className="h-7 text-xs bg-background border-blue-800/50"
            value={form.geography ?? ''}
            onChange={e => set('geography', e.target.value)}
            placeholder="Örn: İç Anadolu Stepleri"
          />
        </div>
        <div>
          <Label className="text-xs text-blue-300">Mimari Stil</Label>
          <Input
            className="h-7 text-xs bg-background border-blue-800/50"
            value={form.architecture ?? ''}
            onChange={e => set('architecture', e.target.value)}
            placeholder="Örn: Selçuklu Mimarisi"
          />
        </div>
        <div>
          <Label className="text-xs text-blue-300">Atmosfer</Label>
          <Input
            className="h-7 text-xs bg-background border-blue-800/50"
            value={form.atmosphere ?? ''}
            onChange={e => set('atmosphere', e.target.value)}
            placeholder="Örn: Tozlu ve Sıcak"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-blue-300">Görsel Betimleme (AI tarafından otomatik doldurulur)</Label>
        <Textarea
          className="text-xs bg-background border-blue-800/50 min-h-[96px] resize-none font-mono"
          value={form.visualDescription ?? ''}
          onChange={e => set('visualDescription', e.target.value)}
          placeholder="80-100 kelimelik İngilizce görsel betim (analiz sırasında AI otomatik üretir, manuel de girilebilir)..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>İptal</Button>
        <Button size="sm" className="h-7 text-xs" onClick={() => onSave(form)} disabled={!form.name.trim()}>Kaydet</Button>
      </div>
    </div>
  );
}

// ── Time Context Editor ──────────────────────────────────────────────────────

interface TimeContextEditorProps {
  initial: TimeContext;
  onSave: (t: TimeContext) => void;
  onCancel: () => void;
}

function TimeContextEditor({ initial, onSave, onCancel }: TimeContextEditorProps) {
  const [form, setForm] = useState<TimeContext>({ ...initial });
  const set = (field: keyof TimeContext, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-2 p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-purple-300">Etiket *</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.label}
            onChange={e => set('label', e.target.value)}
            placeholder="Selçuklu Dönemi"
          />
        </div>
        <div>
          <Label className="text-xs text-purple-300">Çağ / Yıl</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.era ?? ''}
            onChange={e => set('era', e.target.value)}
            placeholder="1100-1200 AD"
          />
        </div>
        <div>
          <Label className="text-xs text-purple-300">Mevsim</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.season ?? ''}
            onChange={e => set('season', e.target.value)}
            placeholder="Kış"
          />
        </div>
        <div>
          <Label className="text-xs text-purple-300">Günün Saati</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.timeOfDay ?? ''}
            onChange={e => set('timeOfDay', e.target.value)}
            placeholder="Sabah ışığı, altın saat"
          />
        </div>
        <div>
          <Label className="text-xs text-purple-300">Işık</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.lighting ?? ''}
            onChange={e => set('lighting', e.target.value)}
            placeholder="Alçak açılı güneş, uzun gölgeler"
          />
        </div>
        <div>
          <Label className="text-xs text-purple-300">Hava Durumu</Label>
          <Input
            className="h-7 text-xs bg-background border-purple-800/50"
            value={form.weather ?? ''}
            onChange={e => set('weather', e.target.value)}
            placeholder="Açık gökyüzü, tozlu sis"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-purple-300">Tarihsel Notlar</Label>
        <Textarea
          className="text-xs bg-background border-purple-800/50 min-h-[56px] resize-none"
          value={form.historicalNotes ?? ''}
          onChange={e => set('historicalNotes', e.target.value)}
          placeholder="Moğol öncesi dönem, İpek Yolu'nun zirvesi..."
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel}>İptal</Button>
        <Button
          size="sm"
          className="h-6 text-xs bg-purple-700 hover:bg-purple-600 text-white"
          onClick={() => form.label.trim() && onSave(form)}
        >
          Kaydet
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function EntityCardPanel({
  characters,
  locations,
  timeContexts,
  onUpsertCharacter,
  onDeleteCharacter,
  onUpsertLocation,
  onDeleteLocation,
  onAddTimeContext,
  onUpdateTimeContext,
  onDeleteTimeContext,
}: EntityCardPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['characters', 'locations', 'timeContexts']));
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingTcId, setEditingTcId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const newBlankCharacter = (): Character => ({
    id: `char-${crypto.randomUUID()}`,
    name: '',
    role: '',
    isCrowd: false,
    visualDescription: '',
  });

  const newBlankLocation = (): Location => ({
    id: `loc-${crypto.randomUUID()}`,
    name: '',
    visualDescription: '',
  });

  const newBlankTimeContext = (): TimeContext => ({
    id: `tc-${crypto.randomUUID()}`,
    label: '',
    era: '',
    season: '',
    timeOfDay: '',
    lighting: '',
    weather: '',
    historicalNotes: '',
  });

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto scrollbar-thin">
      {/* ── Characters ── */}
      <Card className="border-amber-800/40 bg-card">
        <CardHeader
          className="py-2 px-3 cursor-pointer select-none flex flex-row items-center justify-between"
          onClick={() => toggleSection('characters')}
        >
          <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
            🧑 Karakterler
            <span className="inline-flex items-center justify-center rounded-full bg-amber-900/50 text-amber-300 text-xs px-2 py-0.5 font-normal">
              {characters.filter(c => !c.isCrowd).length}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{openSections.has('characters') ? '▲' : '▼'}</span>
        </CardHeader>
        {openSections.has('characters') && (
          <CardContent className="px-3 pb-3 space-y-2">
            {(() => {
              const duplicateCharIds = computeDuplicateCharIds(characters);
              return characters.filter(c => !c.isCrowd).map(char => (
                <div key={char.id}>
                  {editingCharId === char.id ? (
                    <CharacterEditor
                      initial={char}
                      onSave={c => { onUpsertCharacter(c); setEditingCharId(null); }}
                      onCancel={() => setEditingCharId(null)}
                    />
                  ) : (
                    <div className={`group flex items-start justify-between gap-2 p-2 rounded-lg border transition-colors ${duplicateCharIds.has(char.id) ? 'border-yellow-600/50 bg-yellow-950/20 hover:border-yellow-500/60' : 'border-amber-800/30 bg-amber-950/20 hover:border-amber-700/50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-amber-200">{char.name}</span>
                          {char.role && <span className="text-xs text-amber-400/70">({char.role})</span>}
                          {char.age && <span className="text-xs text-muted-foreground">{char.age}</span>}
                          {duplicateCharIds.has(char.id) && (
                            <span
                              className="text-[10px] px-1 py-0.5 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-700/50"
                              title="Benzer isimli karakter mevcut"
                              aria-label="Benzer isimli karakter mevcut"
                            >
                              ⚠ benzer
                            </span>
                          )}
                        </div>
                        {(char.ethnicity || char.clothing) && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {[char.ethnicity, char.clothing].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {char.physicalFeatures && (
                          <div className="text-xs text-muted-foreground/70 truncate">{char.physicalFeatures}</div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-amber-400 hover:text-amber-200 hover:bg-amber-900/40"
                          onClick={() => setEditingCharId(char.id)}
                        >
                          ✏️
                        </Button>
                        {confirmDeleteId === char.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1"
                              onClick={() => { onDeleteCharacter(char.id); setConfirmDeleteId(null); }}
                            >
                              Sil
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-1"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              ✕
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-900/30"
                            onClick={() => setConfirmDeleteId(char.id)}
                          >
                            🗑
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
            {editingCharId === '__new__' ? (
              <CharacterEditor
                initial={newBlankCharacter()}
                onSave={c => { onUpsertCharacter(c); setEditingCharId(null); }}
                onCancel={() => setEditingCharId(null)}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-7 text-xs border border-dashed border-amber-800/50 text-amber-400 hover:border-amber-600 hover:text-amber-300 hover:bg-amber-950/30"
                onClick={() => setEditingCharId('__new__')}
              >
                ➕ Yeni Karakter
              </Button>
            )}

            {/* ── Crowd Characters subsection ── */}
            {characters.some(c => c.isCrowd) && (
              <>
                <div className="pt-1 border-t border-amber-800/20">
                  <div className="text-xs font-semibold text-amber-400/70 mb-1.5 flex items-center gap-1">
                    👥 Kalabalıklar
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-900/40 text-amber-300 text-xs px-1.5 py-0.5 font-normal">
                      {characters.filter(c => c.isCrowd).length}
                    </span>
                  </div>
                  {characters.filter(c => c.isCrowd).map(char => (
                    <div key={char.id} className="mb-1.5">
                      {editingCharId === char.id ? (
                        <CharacterEditor
                          initial={char}
                          onSave={c => { onUpsertCharacter(c); setEditingCharId(null); }}
                          onCancel={() => setEditingCharId(null)}
                        />
                      ) : (
                        <div className="group flex items-start justify-between gap-2 p-2 rounded-lg border border-amber-700/40 bg-amber-900/20 hover:border-amber-600/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-amber-300">👥 {char.name}</span>
                            </div>
                            {char.visualDescription && (
                              <div className="text-xs text-muted-foreground/70 line-clamp-2">{char.visualDescription}</div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-amber-400 hover:text-amber-200 hover:bg-amber-900/40"
                              onClick={() => setEditingCharId(char.id)}
                            >
                              ✏️
                            </Button>
                            {confirmDeleteId === char.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1"
                                  onClick={() => { onDeleteCharacter(char.id); setConfirmDeleteId(null); }}
                                >
                                  Sil
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs px-1"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  ✕
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-900/30"
                                onClick={() => setConfirmDeleteId(char.id)}
                              >
                                🗑
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Locations ── */}
      <Card className="border-blue-800/40 bg-card">
        <CardHeader
          className="py-2 px-3 cursor-pointer select-none flex flex-row items-center justify-between"
          onClick={() => toggleSection('locations')}
        >
          <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
            🏛 Mekanlar
            <span className="inline-flex items-center justify-center rounded-full bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 font-normal">
              {locations.length}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{openSections.has('locations') ? '▲' : '▼'}</span>
        </CardHeader>
        {openSections.has('locations') && (
          <CardContent className="px-3 pb-3 space-y-2">
            {(() => {
              // Compute duplicate location set: locations whose normalized root name appears more than once
              const normalizeLocName = (name: string) => {
                let n = name.toLocaleLowerCase('tr-TR').trim();
                n = n.replace(/(.{3,})(lar|ler)$/, '$1');
                n = n.replace(/camii$/, 'cami');
                n = n.replace(/\s+/g, ' ');
                return n;
              };
              const normalizedCounts = new Map<string, number>();
              locations.forEach(loc => {
                const norm = normalizeLocName(loc.name);
                normalizedCounts.set(norm, (normalizedCounts.get(norm) ?? 0) + 1);
              });
              // Flag locations whose normalized name exactly matches another (count > 1),
              // OR whose normalized name is a prefix of another (shorter name first, e.g. "cami" prefix of "cami avlusu")
              const isDuplicate = (loc: Location) => {
                const norm = normalizeLocName(loc.name);
                if ((normalizedCounts.get(norm) ?? 0) > 1) return true;
                const otherNorms = Array.from(normalizedCounts.keys()).filter(k => k !== norm);
                // Flag if this name is a prefix of another (e.g. "cami" → "cami avlusu")
                // or another is a prefix of this name (e.g. "cami avlusu" → "cami")
                return otherNorms.some(k => k.startsWith(norm + ' ') || norm.startsWith(k + ' '));
              };
              return locations.map(loc => (
                <div key={loc.id}>
                  {editingLocId === loc.id ? (
                    <LocationEditor
                      initial={loc}
                      onSave={l => { onUpsertLocation(l); setEditingLocId(null); }}
                      onCancel={() => setEditingLocId(null)}
                    />
                  ) : (
                    <div className={`group flex items-start justify-between gap-2 p-2 rounded-lg border transition-colors ${isDuplicate(loc) ? 'border-yellow-600/50 bg-yellow-950/20 hover:border-yellow-500/60' : 'border-blue-800/30 bg-blue-950/20 hover:border-blue-700/50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-blue-200">{loc.name}</span>
                          {loc.period && <span className="text-xs text-blue-400/70">({loc.period})</span>}
                          {isDuplicate(loc) && (
                            <span
                              className="text-[10px] px-1 py-0.5 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-700/50"
                              title="Benzer isimli mekan mevcut"
                              aria-label="Benzer isimli mekan mevcut"
                            >
                              ⚠ benzer
                            </span>
                          )}
                        </div>
                        {(loc.geography || loc.architecture) && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {[loc.geography, loc.architecture].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {loc.atmosphere && (
                          <div className="text-xs text-muted-foreground/70 truncate">{loc.atmosphere}</div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-blue-400 hover:text-blue-200 hover:bg-blue-900/40"
                          onClick={() => setEditingLocId(loc.id)}
                        >
                          ✏️
                        </Button>
                        {confirmDeleteId === loc.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1"
                              onClick={() => { onDeleteLocation(loc.id); setConfirmDeleteId(null); }}
                            >
                              Sil
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-1"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              ✕
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-900/30"
                            onClick={() => setConfirmDeleteId(loc.id)}
                          >
                            🗑
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
            {editingLocId === '__new__' ? (
              <LocationEditor
                initial={newBlankLocation()}
                onSave={l => { onUpsertLocation(l); setEditingLocId(null); }}
                onCancel={() => setEditingLocId(null)}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-7 text-xs border border-dashed border-blue-800/50 text-blue-400 hover:border-blue-600 hover:text-blue-300 hover:bg-blue-950/30"
                onClick={() => setEditingLocId('__new__')}
              >
                ➕ Yeni Mekan
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Time Contexts ── */}
      <Card className="border-purple-800/40 bg-card">
        <CardHeader
          className="py-2 px-3 cursor-pointer select-none flex flex-row items-center justify-between"
          onClick={() => toggleSection('timeContexts')}
        >
          <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
            🕰 Zaman Bağlamı
            <span className="inline-flex items-center justify-center rounded-full bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 font-normal">
              {timeContexts.length}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{openSections.has('timeContexts') ? '▲' : '▼'}</span>
        </CardHeader>
        {openSections.has('timeContexts') && (
          <CardContent className="px-3 pb-3 space-y-2">
            {timeContexts.map(tc => (
              <div key={tc.id}>
                {editingTcId === tc.id ? (
                  <TimeContextEditor
                    initial={tc}
                    onSave={t => { onUpdateTimeContext(t); setEditingTcId(null); }}
                    onCancel={() => setEditingTcId(null)}
                  />
                ) : (
                  <div className="group flex items-start justify-between gap-2 p-2 rounded-lg border border-purple-800/30 bg-purple-950/20 hover:border-purple-700/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-purple-200">{tc.label}</span>
                        {tc.era && <span className="text-xs text-purple-400/70">({tc.era})</span>}
                      </div>
                      {(tc.season || tc.timeOfDay) && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[tc.season, tc.timeOfDay].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {tc.historicalNotes && (
                        <div className="text-xs text-muted-foreground/70 line-clamp-1">{tc.historicalNotes}</div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-purple-400 hover:text-purple-200 hover:bg-purple-900/40"
                        onClick={() => setEditingTcId(tc.id)}
                      >
                        ✏️
                      </Button>
                      {confirmDeleteId === tc.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1"
                            onClick={() => { onDeleteTimeContext(tc.id); setConfirmDeleteId(null); }}
                          >
                            Sil
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-1"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            ✕
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-900/30"
                          onClick={() => setConfirmDeleteId(tc.id)}
                        >
                          🗑
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {editingTcId === '__new__' ? (
              <TimeContextEditor
                initial={newBlankTimeContext()}
                onSave={t => { onAddTimeContext(t); setEditingTcId(null); }}
                onCancel={() => setEditingTcId(null)}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-7 text-xs border border-dashed border-purple-800/50 text-purple-400 hover:border-purple-600 hover:text-purple-300 hover:bg-purple-950/30"
                onClick={() => setEditingTcId('__new__')}
              >
                ➕ Yeni Zaman Bağlamı
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
