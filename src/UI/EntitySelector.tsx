import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EntityCatalogItem } from '../Types/Entity.types';

interface EntitySelectorProps {
  items: EntityCatalogItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  character: '👤',
  location: '📍',
  object: '🎭',
  architecture: '🏛️',
  environment: '🌿',
};

const TYPE_LABELS: Record<string, string> = {
  character: 'Karakter',
  location: 'Mekan',
  object: 'Nesne',
  architecture: 'Mimari',
  environment: 'Ortam',
};

export function EntitySelector({ items, selectedId, onSelect, onClear }: EntitySelectorProps) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.canonicalDescription || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // Group by type
  const grouped = React.useMemo(() => {
    const map: Record<string, EntityCatalogItem[]> = {};
    for (const item of filtered) {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Varlık ara..."
          className="pl-7 h-8 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3 pr-2">
          {Object.entries(grouped).map(([type, typeItems]) => (
            <div key={type}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">
                {TYPE_ICONS[type] || '◆'} {TYPE_LABELS[type] || type}
              </div>
              <div className="space-y-0.5">
                {typeItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (selectedId === item.id) {
                        onClear();
                      } else {
                        onSelect(item.id);
                      }
                    }}
                    className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors ${
                      selectedId === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.isProtected && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            🔒
                          </Badge>
                        )}
                        <Badge
                          variant={selectedId === item.id ? 'secondary' : 'outline'}
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          {item.appearances.length} sahne
                        </Badge>
                      </div>
                    </div>
                    {item.canonicalDescription && (
                      <p className="text-[10px] opacity-60 mt-0.5 line-clamp-1">
                        {item.canonicalDescription}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {search ? 'Eşleşen varlık bulunamadı.' : 'Varlık kataloğu boş.'}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
