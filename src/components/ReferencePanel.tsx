import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, Tag, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { analyzeReferenceImage } from '@/lib/referenceAnalyzer';
import { saveReference, deleteReference } from '@/lib/supabaseQueries';
import { useAppState } from '@/hooks/useAppState';

interface ReferencePanelProps {
  episodeId: string | null;
}

export function ReferencePanel({ episodeId }: ReferencePanelProps) {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  
  interface UploadItem {
    id: string;
    file: File;
    previewUrl: string;
    description: string;
    referenceType: 'subject' | 'style' | 'scene';
  }

  const [isUploading, setIsUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const newItems = acceptedFiles.filter(f => f.type.startsWith('image/')).map(file => {
      // Get filename without extension for default description
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
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
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

  // Read file as base64 for Gemini Vision
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip out the data:image/jpeg;base64, prefix
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
      const results = [];
      const hasSceneCards = state.sceneCards.length > 0;

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

        const { data: { publicUrl } } = supabase.storage
          .from('references')
          .getPublicUrl(filePath);

        let aiAnalysis = '';
        let assignedSceneIds: string[] = [];

        // 2. Yalnızca sahne kartları mevcutsa anında AI analizi yap
        if (hasSceneCards) {
          toast({ title: 'AI Analizi Başladı', description: `${item.file.name} eşleştiriliyor...` });
          
          const base64 = await fileToBase64(item.file);
          const aiResult = await analyzeReferenceImage(
            base64,
            item.file.type,
            item.description,
            item.referenceType,
            state.sceneCards
          );
          aiAnalysis = aiResult.aiAnalysis;
          assignedSceneIds = aiResult.assignedSceneIds;
        }

        // 3. Save to DB
        const refId = crypto.randomUUID();
        const newRef = {
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

        // 4. Update Redux State
        dispatch({ type: 'ADD_REFERENCE', payload: newRef });
        results.push(newRef);
      }

      toast({ 
        title: 'Referanslar Eklendi ✨', 
        description: `${results.length} fotoğraf yüklendi${hasSceneCards ? ' ve sahnelerle eşleştirildi.' : '. Sahne analizi sonrasında eşleştirilecekler.'}` 
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
      // Optimistic URL delete isn't strictly necessary but good practice
      await supabase.storage.from('references').remove([filePath]);
      await deleteReference(id);
      dispatch({ type: 'REMOVE_REFERENCE', payload: id });
    } catch (error) {
      console.error('Delete error', error);
      toast({ title: 'Hata', description: 'Referans silinemedi.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-sm border-r border-zinc-800/80">
      <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
          <ImageIcon className="w-5 h-5 text-indigo-400" />
          Referanslar
        </h2>
        <p className="text-xs text-zinc-500">
          Karakter, mekan veya stil referansları ekle, AI otomatik sahnelere dağıtsın.
        </p>
      </div>

      <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-4">
        {/* Uploader UI */}
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
                      disabled={isUploading}
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
                      disabled={isUploading}
                    />
                    <select 
                      value={item.referenceType}
                      onChange={e => handleUpdateItem(item.id, { referenceType: e.target.value as 'subject' | 'style' | 'scene' })}
                      className="h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300 w-full sm:w-24 flex-shrink-0 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={isUploading}
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
                disabled={isUploading}
                variant="outline"
                className="w-1/3 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                size="sm"
              >
                İptal Et
              </Button>
              <Button 
                onClick={handleCreateReferences}
                disabled={isUploading}
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
          {state.references.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 flex flex-col items-center gap-2">
              <Tag className="w-6 h-6 opacity-30" />
              <p className="text-sm">Henüz referans eklenmedi.</p>
            </div>
          ) : (
            state.references.map(ref => (
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
                  
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>{ref.assignedSceneIds.length} sahneye atandı</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(ref.id, ref.filePath)}
                  className="absolute top-2 right-2 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
