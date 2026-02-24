import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ExtractedEntity } from '@/types';

interface EntityManagerProps {
  entities: ExtractedEntity[];
  onUpdateEntity: (entityId: string, updates: Partial<ExtractedEntity>) => void;
}

function EntityCard({ entity, onUpdate }: { entity: ExtractedEntity; onUpdate: (updates: Partial<ExtractedEntity>) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(entity.visualDescription);

  const handleSave = () => {
    onUpdate({ visualDescription: editText });
    setEditing(false);
  };

  const handleEdit = () => {
    setEditText(entity.visualDescription);
    setEditing(true);
  };

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{entity.name}</div>
          <div className="text-xs text-muted-foreground">
            Appears in {entity.sceneIds.length} scene(s)
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleEdit}>
          Edit
        </Button>
      </div>
      {editing ? (
        <div>
          <Textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="mb-2 text-xs"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{entity.visualDescription}</p>
      )}
    </Card>
  );
}

export function EntityManager({ entities, onUpdateEntity }: EntityManagerProps) {
  const characters = entities.filter(e => e.type === 'character');
  const locations = entities.filter(e => e.type === 'location');
  const objects = entities.filter(e => e.type === 'object');

  if (entities.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">🤖 AI-Detected Entities</h2>
        <p className="text-sm text-muted-foreground text-center py-8">
          No entities detected yet. Upload a document to start AI analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">🤖 AI-Detected Entities</h2>

      {characters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">👤 Characters ({characters.length})</h3>
          <div className="space-y-2">
            {characters.map(entity => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onUpdate={(updates) => onUpdateEntity(entity.id, updates)}
              />
            ))}
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">📍 Locations ({locations.length})</h3>
          <div className="space-y-2">
            {locations.map(entity => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onUpdate={(updates) => onUpdateEntity(entity.id, updates)}
              />
            ))}
          </div>
        </div>
      )}

      {objects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">🎭 Objects ({objects.length})</h3>
          <div className="space-y-2">
            {objects.map(entity => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onUpdate={(updates) => onUpdateEntity(entity.id, updates)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 pt-2">
        {entities.map(entity => (
          <Badge
            key={entity.id}
            variant={entity.type === 'character' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {entity.type === 'character' ? '👤' : entity.type === 'location' ? '📍' : '🎭'} {entity.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
