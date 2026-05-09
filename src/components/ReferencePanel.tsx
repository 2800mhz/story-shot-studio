import React, { useState, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Tag, Loader2, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { saveReference, deleteReference } from '@/lib/supabaseQueries';
import { analyzeReferenceImage } from '@/lib/referenceAnalyzer';
import type { AppAction, SceneCard, SceneReference } from '@/types';

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
  referenceType: 'subject' | 'style' | 'scene';
}

interface ReferencePanelProps {
  episodeId: string | null;
  references: SceneReference[];
  sceneCards: SceneCard[];
  dispatch: React.Dispatch<AppAction>;
  disabled?: boolean;
}

export function ReferencePanel({ episodeId, references, sceneCards, dispatch, disabled = false }: ReferencePanelProps) {
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled || acceptedFiles.length === 0) return;
    
    const newItems = acceptedFiles.filter(f => f.type.startsWith('image/')).map(file => {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        description: nameWithoutExt,
        referenceType: 'subject' as const
      };
    });
    
    if (newItems.length !== acceptedFiles.length) {
      toast({ title: 'Hatalı dosya formatı', description: 'Sadece resim dosyaları yüklenebilir.', variant: 'destructive' });
    }
    
    setUploadItems(prev => [...prev, ...newItems]);
  }, [disabled, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled,
  });

  const handleRemoveItem = (id: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleCreateReferences = async () => {
    if (uploadItems.length === 0) return;
    if (!episodeId) {
      toast({ title: 'Bölüm Bulunamadı', description: 'Referans eklemek için bir bölüm açık olmalıdır.', variant: 'destructive' });
      return;
    }
    
    setIsUploading(true);

    try {
      const results: SceneReference[] = [];

      for (const item of uploadItems) {
        toast({ title: 'Yükleniyor...', description: item.file.name });
        
        // 1. Upload to Supabase Storage
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${episodeId}/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('references')
          .upload(filePath, item.file);

        if (storageError) throw storageError;

        const { data: signedData, error: signedError } = await supabase.storage
          .from('references')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (signedError) throw signedError;
        const publicUrl = signedData.signedUrl;

        let aiAnalysis = '';
        let assignedSceneIds: string[] = [];

        if (sceneCards.length > 0) {
          toast({ title: 'Referans analiz ediliyor...', description: item.file.name });
          const base64 = await fileToBase64(item.file);
          const analysis = await analyzeReferenceImage(
            base64,
            item.file.type || 'image/jpeg',
            item.description,
            item.referenceType,
            sceneCards,
          );
          aiAnalysis = analysis.aiAnalysis;
          assignedSceneIds = analysis.assignedSceneIds;
        }

        // 3. Save to DB
        const refId = crypto.randomUUID();
        const newRef: SceneReference = {
          id: refId,
          episodeId: episodeId,
          filePath: filePath,
          fileUrl: publicUrl,
          description: item.description,
          referenceType: item.referenceType,
          aiAnalysis: aiAnalysis,
          assignedSceneIds: assignedSceneIds,
          createdAt: new Date().toISOString()
        };

        await saveReference(newRef);

        // 4. Update State
        dispatch({ type: 'ADD_REFERENCE', payload: newRef });
        results.push(newRef);
      }

      const totalAssigned = results.reduce((sum, ref) => sum + (ref.assignedSceneIds?.length ?? 0), 0);

      toast({ 
        title: 'Referanslar Eklendi ✨', 
        description: totalAssigned > 0
          ? `${results.length} fotoğraf yüklendi, ${totalAssigned} sahne ataması yapıldı.`
          : `${results.length} fotoğraf yüklendi. Sahne eşleşmesi bulunursa analiz sonrası atanacaklar.`
      });

      // Clear uploads
      uploadItems.forEach(i => URL.revokeObjectURL(i.previewUrl));
      setUploadItems([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Yükleme Hatası', description: 'Referanslar yüklenirken bir sorun oluştu.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      await supabase.storage.from('references').remove([filePath]);
      await deleteReference(id);
      dispatch({ type: 'REMOVE_REFERENCE', payload: id });
    } catch (error) {
      console.error('Delete error', error);
      toast({ title: 'Hata', description: 'Referans silinemedi.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border flex flex-col gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          Referanslar
        </h2>
        <p className="text-xs text-zinc-500">
          Karakter, mekan veya stil referansları ekle, AI otomatik sahnelere dağıtsın.
        </p>
      </div>

      <div className="p-4 border-b border-border flex flex-col gap-4">
        {uploadItems.length === 0 ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-8 h-8 text-zinc-500" />
            <span className="text-sm text-zinc-400 text-center">
              Resim sürükle veya <span className="text-indigo-400">seç</span><br/>
              <span className="text-[10px] text-zinc-500">(Çoklu dosya seçebilirsiniz)</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {uploadItems.map(item => (
                <div key={item.id} className="flex flex-col gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-800">
                      <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 font-medium text-xs text-zinc-300 truncate" title={item.file.name}>
                      {item.file.name}
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isUploading || disabled}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Listeden Çıkar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                      value={item.description}
                      onChange={e => handleUpdateItem(item.id, { description: e.target.value })}
                      placeholder="Kısa açıklama (hedef)"
                      className="h-8 flex-1 bg-zinc-950 border-zinc-800 text-xs"
                      disabled={isUploading || disabled}
                    />
                    <select 
                      value={item.referenceType}
                      onChange={e => handleUpdateItem(item.id, { referenceType: e.target.value as 'subject' | 'style' | 'scene' })}
                      className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300 w-full sm:w-24 flex-shrink-0 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={isUploading || disabled}
                    >
                      <option value="subject">Subject</option>
                      <option value="style">Style</option>
                      <option value="scene">Scene</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1 border-t border-zinc-800/50">
              <Button 
                onClick={() => {
                  uploadItems.forEach(i => URL.revokeObjectURL(i.previewUrl));
                  setUploadItems([]);
                }}
                disabled={isUploading || disabled}
                variant="outline"
                className="w-1/3 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                size="sm"
              >
                İptal Et
              </Button>
              <Button 
                onClick={handleCreateReferences}
                disabled={isUploading || disabled}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                size="sm"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Tümünü Yükle ({uploadItems.length})</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {references.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 flex flex-col items-center gap-2">
              <Tag className="w-6 h-6 opacity-30" />
              <p className="text-sm">Henüz referans eklenmedi.</p>
            </div>
          ) : (
            references.map(ref => {
              const assignedCount = ref.assignedSceneIds?.length ?? 0;

              return (
              <div key={ref.id} className="group relative flex gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/80 hover:border-zinc-700/50 transition-colors">
                
                <div className="w-16 h-16 rounded-md overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-800">
                  <img src={ref.fileUrl} alt="Ref" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col flex-1 justify-center min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      ref.referenceType === 'subject' ? 'bg-amber-500/20 text-amber-300' :
                      ref.referenceType === 'style' ? 'bg-fuchsia-500/20 text-fuchsia-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {ref.referenceType}
                    </span>
                    <span className="truncate text-zinc-500" title={ref.description}>{ref.description || 'İsimsiz'}</span>
                  </div>
                  
                  <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${assignedCount > 0 ? 'text-indigo-300' : 'text-zinc-500'}`}>
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span title={ref.aiAnalysis || undefined}>{assignedCount} sahneye atandı</span>
                  </div>
                </div>

                <button
                  onClick={() => !disabled && handleDelete(ref.id, ref.filePath)}
                  className="absolute top-2 right-2 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
