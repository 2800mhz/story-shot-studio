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

export function ReferencePanel() {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [refType, setRefType] = useState<'subject' | 'style' | 'scene'>('subject');
  const [description, setDescription] = useState('');
  
  const activeEpisode = state.episodes.find(e => e.id === state.episodes[0]?.id); // We'll just grab the first one if active isn't tracked globally for now, or you can add to AppState. Assuming single-episode view mostly.
  const episodeId = activeEpisode?.id;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Hatalı dosya', description: 'Sadece resim yükleyebilirsiniz.', variant: 'destructive' });
      return;
    }
    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const clearUpload = useCallback(() => {
    setUploadFile(null);
    setDescription('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

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

  const handleCreateReference = async () => {
    if (!uploadFile) return;
    if (!episodeId) {
      toast({ title: 'Bölüm Bulunamadı', description: 'Referans eklemek için bir bölüm açık olmalıdır.', variant: 'destructive' });
      return;
    }
    
    setIsUploading(true);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${episodeId}/${fileName}`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('references')
        .upload(filePath, uploadFile);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('references')
        .getPublicUrl(filePath);

      // 2. Read as base64 and analyze with AI
      toast({ title: 'AI Analizi Başladı', description: 'Fotoğraf sahnelerle eşleştiriliyor...' });
      
      const base64 = await fileToBase64(uploadFile);
      const aiResult = await analyzeReferenceImage(
        base64,
        uploadFile.type,
        description,
        refType,
        state.sceneCards
      );

      // 3. Save to DB
      const refId = crypto.randomUUID();
      const newRef = {
        id: refId,
        episodeId: episodeId,
        filePath: filePath,
        fileUrl: publicUrl,
        description: description,
        referenceType: refType,
        aiAnalysis: aiResult.aiAnalysis,
        assignedSceneIds: aiResult.assignedSceneIds,
        createdAt: new Date().toISOString()
      };

      await saveReference(newRef);

      // 4. Update Redux State
      dispatch({ type: 'ADD_REFERENCE', payload: newRef });

      toast({ 
        title: 'Referans Eklendi ✨', 
        description: `Yapay zeka bu referansı ${aiResult.assignedSceneIds.length} sahneyle eşleştirdi.` 
      });

      clearUpload();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Yükleme Hatası', description: 'Referans yüklenirken bir sorun oluştu.', variant: 'destructive' });
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
        {!uploadFile ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-8 h-8 text-zinc-500" />
            <span className="text-sm text-zinc-400 text-center">
              Resim sürükle veya <span className="text-indigo-400">seç</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
              <img src={previewUrl!} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={clearUpload}
                disabled={isUploading}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition text-zinc-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-zinc-500">Tür</Label>
                <RadioGroup 
                  value={refType} 
                  onValueChange={(v: any) => setRefType(v)}
                  className="flex gap-4"
                  disabled={isUploading}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="subject" id="r-sub" />
                    <Label htmlFor="r-sub" className="text-sm font-normal cursor-pointer text-zinc-300">Subject</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="style" id="r-sty" />
                    <Label htmlFor="r-sty" className="text-sm font-normal cursor-pointer text-zinc-300">Style</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scene" id="r-sce" />
                    <Label htmlFor="r-sce" className="text-sm font-normal cursor-pointer text-zinc-300">Scene</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-zinc-500">Açıklama / Hedef</Label>
                <Input 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="örn. Yaşlı derviş karakteri..."
                  className="bg-zinc-900/50 border-zinc-800 h-8"
                  disabled={isUploading}
                />
              </div>

              <Button 
                onClick={handleCreateReference}
                disabled={isUploading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                size="sm"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz Ediliyor...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Kaydet & Eşleştir</>
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
