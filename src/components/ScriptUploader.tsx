import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneCard, Character, Location, TimeContext } from '@/types';
import { parseDocxFile, parseScriptText, chunkScriptScenes } from '@/lib/scriptParser';
import { analyzeFullScript } from '@/lib/scriptSceneAnalyzer';

interface ScriptUploaderProps {
  onComplete: (result: {
    sceneCards: SceneCard[];
    characters: Character[];
    locations: Location[];
    suggestedTimeContexts: TimeContext[];
  }) => void;
  onProgress: (msg: string) => void;
  onClose: () => void;
}

export function ScriptUploader({ onComplete, onProgress, onClose }: ScriptUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseInfo, setParseInfo] = useState<{ perdeCount: number; blockCount: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-20), msg]);
    onProgress(msg);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    setFile(f);
    setError(null);
    setParseInfo(null);
    setLogs([]);

    try {
      addLog('📄 Dosya okunuyor...');
      const rawText = await parseDocxFile(f);
      addLog(`✅ ${rawText.length} karakter metin okundu`);

      const scenes = parseScriptText(rawText);
      const perdeCount = new Set(scenes.map(s => s.perdeNo)).size;
      const blockCount = scenes.length;

      setParseInfo({ perdeCount, blockCount });
      addLog(`🎬 ${perdeCount} perde, ${blockCount} görüntü bloğu tespit edildi`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      addLog('🔍 Senaryo ayrıştırılıyor...');
      const rawText = await parseDocxFile(file);
      const scenes = parseScriptText(rawText);
      const chunks = chunkScriptScenes(scenes, 6);
      addLog(`📦 ${chunks.length} parçaya bölündü, analiz başlıyor...`);

      const result = await analyzeFullScript(chunks, addLog);

      addLog(`✅ Analiz tamamlandı! ${result.sceneCards.length} sahne, ${result.characters.length} karakter, ${result.locations.length} mekan`);
      onComplete(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analiz başarısız';
      setError(msg);
      addLog(`❌ Hata: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Senaryo Yükle (.docx)</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-primary font-medium">Dosyayı buraya bırakın</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  {file ? file.name : 'Senaryo dosyasını sürükleyin veya tıklayın'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">.docx formatı desteklenir</p>
              </>
            )}
          </div>

          {/* Parse Info */}
          {parseInfo && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-sm font-medium text-primary">
                🎬 {parseInfo.perdeCount} perde, {parseInfo.blockCount} görüntü bloğu tespit edildi
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">❌ {error}</p>
            </div>
          )}

          {/* Progress Log */}
          {logs.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 max-h-40 overflow-y-auto space-y-1">
              {logs.slice(-8).map((log, i) => (
                <p key={i} className={`text-xs font-mono ${i === logs.slice(-8).length - 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {log}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isAnalyzing}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={!file || !parseInfo || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analiz Başlat
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
