import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Plus, Check } from 'lucide-react';
import { ToolRecommendation } from '@/lib/stackAiApi';

interface ToolCardProps {
  tool: ToolRecommendation;
  added: boolean;
  onAdd: (tool: ToolRecommendation) => void;
  index: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Backend: 'text-green-400 bg-green-500/10 border-green-500/30',
  Database: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  Auth: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  Hosting: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'CI/CD': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  Monitoring: 'text-red-400 bg-red-500/10 border-red-500/30',
  Storage: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  General: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
};

function categoryStyle(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General'];
}

export function ToolCard({ tool, added, onAdd, index }: ToolCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.25 }}
      className="group relative rounded-xl border border-white/8 bg-white/4 p-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-foreground text-sm">{tool.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${categoryStyle(tool.category)}`}>
              {tool.category}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {tool.description}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              ✓ {tool.freeTier}
            </span>
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAdd(tool)}
            disabled={added}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              added
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 hover:text-violet-200'
            }`}
          >
            {added ? (
              <>
                <Check className="h-3 w-3" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Add
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
