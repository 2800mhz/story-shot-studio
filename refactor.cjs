const fs = require('fs');

const file = 'c:/Users/emreg/OneDrive/Desktop/deneme/story-shot-studio/src/hooks/useAppState.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { produce } from \'immer\'')) {
  code = code.replace(/import \{ useReducer, useCallback, useRef \} from 'react';/, 
    "import { useReducer, useCallback, useRef } from 'react';\nimport { produce } from 'immer';");
}

code = code.replace(/function reducerCore\(state: AppState, action: InternalAction\): AppState \{\n  switch \(action\.type\) \{/, 
  'function reducerCore(state: AppState, action: InternalAction): AppState {\n  return produce(state, (draft) => {\n    switch (action.type) {');

code = code.replace(/    default:\n      return state;\n  \}\n\}/, 
  '    default:\n      break;\n    }\n  });\n}');

// Basic replacements
code = code.replace(/return \{ \.\.\.state, ([a-zA-Z0-9_]+): action\.payload \};/g, 'draft.$1 = action.payload;\n      break;');
code = code.replace(/return \{ \.\.\.state, /g, 'Object.assign(draft, { ');
code = code.replace(/ \};/g, ' });\n      break;');

// I will just use regex to convert `return { ...state, key: val }` to `draft.key = val; break;` 
// But a safer approach is `Object.assign(draft, { key: val }); break;` which works directly for the top-level changes without nested drafting, but it STILL achieves structural sharing because Immer proxies top-level assignments!

fs.writeFileSync('c:/Users/emreg/OneDrive/Desktop/deneme/story-shot-studio/src/hooks/useAppState_immer.ts', code);
console.log('Done');
