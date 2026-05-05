import sys

filepath = 'src/components/RightPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  isLoading?: boolean;
}"""
replacement1 = """  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  onGenerateSlotPrompt?: (sceneId: string, slotId: string) => void;
  isLoading?: boolean;
}"""

target2 = """  isBulkGeneratingPrompts, bulkPromptsProgress, onCancelBulkPrompts,
  onSetPinnedPrompt,
  isLoading,"""
replacement2 = """  isBulkGeneratingPrompts, bulkPromptsProgress, onCancelBulkPrompts,
  onSetPinnedPrompt, onGenerateSlotPrompt,
  isLoading,"""

target3 = """                  onDeletePrompt={onDeletePrompt}
                  onRestorePreviousPrompt={onRestorePreviousPrompt_}
                  onSetPinnedPrompt={onSetPinnedPrompt}
                  isBulkGenerating={isBulkGeneratingPrompts}
                />"""
replacement3 = """                  onDeletePrompt={onDeletePrompt}
                  onRestorePreviousPrompt={onRestorePreviousPrompt_}
                  onSetPinnedPrompt={onSetPinnedPrompt}
                  onGenerateSlotPrompt={onGenerateSlotPrompt}
                  isBulkGenerating={isBulkGeneratingPrompts}
                />"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)
content = content.replace(target3, replacement3)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("RightPanel updated.")
