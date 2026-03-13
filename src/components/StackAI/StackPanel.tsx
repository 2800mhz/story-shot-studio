import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Layers, ExternalLink } from 'lucide-react';
import { ToolRecommendation } from '@/lib/stackAiApi';

interface StackPanelProps {
  tools: ToolRecommendation[];
  onRemove: (name: string) => void;
  onExport: () => void;
}

export function StackPanel({ tools, onRemove, onExport }: StackPanelProps) {
  const grouped = tools.reduce<Record<string, ToolRecommendation[]>>((acc, tool) => {
    const cat = tool.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-sm text-foreground">My Stack</span>
          {tools.length > 0 && (
            <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
              {tools.length}
            </span>
          )}
        </div>
        {tools.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 hover:text-violet-200 transition-all"
          >
            <Download className="h-3 w-3" />
            Export
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
              <Layers className="h-5 w-5 text-violet-400/50" />
            </div>
            <p className="text-sm text-muted-foreground">Your stack is empty</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add tools from recommendations
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, catTools]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {category}
              </p>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {catTools.map((tool) => (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/4 border border-white/8 px-3 py-2 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tool.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tool.freeTier}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() => onRemove(tool.name)}
                          className="p-1 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
