import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface PillGroupProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function PillGroup({ questions, onSelect, disabled }: PillGroupProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-violet-400" />
        Refine your stack
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <motion.button
            key={`${q}-${i}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full text-sm border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
