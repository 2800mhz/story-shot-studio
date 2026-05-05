import sys

filepath = 'src/components/SceneCard.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          <div className="text-xs font-semibold text-muted-foreground mb-1">Üretilen Promptlar:</div>
          {scene.prompts.map(prompt => (
            <InlinePromptCard
              key={prompt.id}
              prompt={prompt}
              sceneId={scene.id}
              onRevise={onRevisePrompt}
              onDelete={onDeletePrompt}
              onPin={onSetPinnedPrompt}
            />
          ))}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onAddVariation?.(scene.id)}
              disabled={scene.status === 'generating' || isBulkGenerating}
            >
              <Plus className="h-3 w-3 mr-1" />
              Yeni Varyasyon
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onRegenerateAll?.(scene.id)}
              disabled={scene.status === 'generating' || isBulkGenerating}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tümünü Yenile
            </Button>
          </div>
        </div>
      ) : ("""

replacement = """          {scene.cameraAngleSlots && scene.cameraAngleSlots.length > 0 ? (
            <div className="mb-3">
              <div className="flex border-b">
                <button
                  className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'generated' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('generated')}
                >
                  📸 Üretilenler
                </button>
                <button
                  className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'slots' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('slots')}
                >
                  🎬 Kamera Açıları
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs font-semibold text-muted-foreground mb-1">Üretilen Promptlar:</div>
          )}

          {activeTab === 'generated' ? (
            <>
              {scene.prompts.map(prompt => (
                <InlinePromptCard
                  key={prompt.id}
                  prompt={prompt}
                  sceneId={scene.id}
                  onRevise={onRevisePrompt}
                  onDelete={onDeletePrompt}
                  onPin={onSetPinnedPrompt}
                />
              ))}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onAddVariation?.(scene.id)}
                  disabled={scene.status === 'generating' || isBulkGenerating}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Yeni Varyasyon
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onRegenerateAll?.(scene.id)}
                  disabled={scene.status === 'generating' || isBulkGenerating}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Tümünü Yenile
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {scene.cameraAngleSlots?.filter(slot => !slot.promptId).map((slot, index) => (
                <div key={slot.id} className="border rounded-md p-3 bg-muted/20 relative">
                  {slot.isGenerating && (
                    <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-md">
                      <span className="text-xs font-medium animate-pulse text-primary">Üretiliyor...</span>
                    </div>
                  )}
                  <div className="text-xs font-medium text-foreground mb-1">
                    Slot {scene.prompts.length + index + 1}: {slot.label}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {slot.focalLength} • {slot.angleDeg} • {slot.technique}
                  </div>
                  <div className="text-xs italic text-muted-foreground mb-3">
                    {slot.rationale}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => {
                      if (onGenerateSlotPrompt) {
                        onGenerateSlotPrompt(scene.id, slot.id);
                      }
                    }}
                    disabled={slot.isGenerating || scene.status === 'generating'}
                  >
                    Bu Açı İçin Prompt Üret
                  </Button>
                </div>
              ))}
              {scene.cameraAngleSlots?.filter(slot => !slot.promptId).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4 italic">
                  Tüm kamera açıları için prompt üretildi.
                </div>
              )}
            </div>
          )}
        </div>
      ) : ("""

if target in content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print("Replaced successfully")
else:
    print("Target not found")
