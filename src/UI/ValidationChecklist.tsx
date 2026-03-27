import React from 'react';
import { Check, AlertTriangle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ValidationReport, ValidationWarning, ValidationBlocker } from '../Types/Narrative.types';

interface ValidationChecklistProps {
  report: ValidationReport;
  onDismissWarning?: (code: string) => void;
}

function WarningRow({ warning, onDismiss }: { warning: ValidationWarning; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-yellow-950/30 border border-yellow-800/40 px-2 py-1.5">
      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-yellow-200 leading-snug">{warning.message}</p>
        {warning.sceneId && (
          <p className="text-[10px] text-yellow-500 mt-0.5">Sahne: {warning.sceneId}</p>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-yellow-500 hover:text-yellow-300 shrink-0">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function BlockerRow({ blocker }: { blocker: ValidationBlocker }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-red-950/30 border border-red-800/40 px-2 py-1.5">
      <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-red-200 leading-snug font-medium">{blocker.message}</p>
        {blocker.sceneId && (
          <p className="text-[10px] text-red-500 mt-0.5">Sahne: {blocker.sceneId}</p>
        )}
        <Badge variant="outline" className="text-[9px] mt-1 border-red-800 text-red-400">
          {blocker.code}
        </Badge>
      </div>
    </div>
  );
}

export function ValidationChecklist({ report, onDismissWarning }: ValidationChecklistProps) {
  const [showWarnings, setShowWarnings] = React.useState(true);
  const [showBlockers, setShowBlockers] = React.useState(true);

  const hasIssues = report.warnings.length > 0 || report.blockers.length > 0;

  return (
    <div className="space-y-2">
      {/* Overall status */}
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 ${
          report.passed
            ? 'bg-green-950/30 border border-green-800/40'
            : 'bg-red-950/30 border border-red-800/40'
        }`}
      >
        {report.passed ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <X className="h-4 w-4 text-red-400" />
        )}
        <span className={`text-xs font-medium ${report.passed ? 'text-green-300' : 'text-red-300'}`}>
          {report.passed
            ? 'Tüm doğrulama kontrolleri geçti.'
            : `${report.blockers.length} engel tespit edildi.`}
        </span>
      </div>

      {!hasIssues && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Hiçbir sorun tespit edilmedi.
        </p>
      )}

      <ScrollArea className="max-h-52">
        <div className="space-y-2 pr-1">
          {/* Blockers */}
          {report.blockers.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1"
                onClick={() => setShowBlockers(b => !b)}
              >
                {showBlockers ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Engeller ({report.blockers.length})
              </button>
              {showBlockers && (
                <div className="space-y-1">
                  {report.blockers.map((b, i) => (
                    <BlockerRow key={i} blocker={b} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-400 mb-1"
                onClick={() => setShowWarnings(b => !b)}
              >
                {showWarnings ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Uyarılar ({report.warnings.length})
              </button>
              {showWarnings && (
                <div className="space-y-1">
                  {report.warnings.map((w, i) => (
                    <WarningRow
                      key={i}
                      warning={w}
                      onDismiss={onDismissWarning ? () => onDismissWarning(w.code) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
