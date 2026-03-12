import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { encryptKey, maskKey } from '@/lib/encryption';

interface APIKeyRecord {
  id: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  api_key: string;
  label: string | null;
  is_active: boolean;
  usage_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  last_used_at: string | null;
  rate_limited_until: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [keys, setKeys] = useState<APIKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  const [newProvider, setNewProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkProvider, setBulkProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    loadKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadKeys() {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKey() {
    if (!newKey.trim()) {
      toast({ title: 'API anahtarı gerekli', variant: 'destructive' });
      return;
    }

    try {
      setAdding(true);
      const encrypted = encryptKey(newKey.trim());

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user?.id,
          provider: newProvider,
          api_key: encrypted,
          label: newLabel.trim() || null
        });

      if (error) throw error;

      toast({ title: '✅ API anahtarı eklendi' });
      setNewKey('');
      setNewLabel('');
      loadKeys();
    } catch (error) {
      console.error('Error adding key:', error);
      toast({ title: 'API anahtarı eklenemedi', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  async function handleBulkAdd() {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      toast({ title: 'Eklenecek anahtar bulunamadı', variant: 'destructive' });
      return;
    }

    try {
      setBulkAdding(true);
      const inserts = lines.map(key => ({
        user_id: user?.id,
        provider: bulkProvider,
        api_key: encryptKey(key),
        label: null as string | null,
      }));

      const { error } = await supabase.from('api_keys').insert(inserts);

      if (error) throw error;

      toast({ title: `✅ ${lines.length} anahtar eklendi` });
      setBulkText('');
      loadKeys();
    } catch (error) {
      console.error('Error bulk adding keys:', error);
      toast({ title: 'Toplu ekleme başarısız', variant: 'destructive' });
    } finally {
      setBulkAdding(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm('Bu API anahtarını silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({ title: 'API anahtarı silindi' });
      loadKeys();
    } catch (error) {
      console.error('Error deleting key:', error);
      toast({ title: 'Anahtar silinemedi', variant: 'destructive' });
    }
  }

  async function handleToggleActive(keyId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId);

      if (error) throw error;
      loadKeys();
    } catch (error) {
      console.error('Error toggling key:', error);
    }
  }

  function toggleShowKey(keyId: string) {
    const newSet = new Set(showKeys);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setShowKeys(newSet);
  }

  const providerLabels = {
    gemini: '🤖 Google Gemini',
    openai: '🧠 OpenAI',
    anthropic: '🔮 Anthropic Claude'
  };

  const activeGeminiCount = keys.filter(k => k.provider === 'gemini' && k.is_active).length;
  const rateLimitedCount = keys.filter(k => k.rate_limited_until && new Date(k.rate_limited_until) > new Date()).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Ayarlar</h1>
            <p className="text-sm text-muted-foreground">API anahtarları ve tercihler</p>
          </div>
          {/* Active key summary */}
          <div className="flex items-center gap-3">
            {activeGeminiCount > 0 ? (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                ✅ {activeGeminiCount} aktif Gemini anahtarı
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                ⚠️ Gemini anahtarı yok
              </Badge>
            )}
            {rateLimitedCount > 0 && (
              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                ⚠️ {rateLimitedCount} rate-limited
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── API Anahtarları Section ── */}
        <div>
          <h2 className="text-xl font-bold mb-4">API Anahtarları</h2>

          {/* Toplu Ekle */}
          <Card className="p-6 mb-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Toplu Ekle
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Her satıra bir API anahtarı gelecek şekilde yapıştırın (30 anahtar bir seferde ekleyebilirsiniz).
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Sağlayıcı</Label>
                <select
                  value={bulkProvider}
                  onChange={(e) => setBulkProvider(e.target.value as 'gemini' | 'openai' | 'anthropic')}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">API Anahtarları (her satıra bir anahtar)</Label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`AIzaSy...\nAIzaSy...\nAIzaSy...`}
                  className="mt-1 font-mono text-xs min-h-[100px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {bulkText.split('\n').filter(l => l.trim()).length} anahtar girildi
                </span>
                <Button onClick={handleBulkAdd} disabled={bulkAdding || !bulkText.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {bulkAdding ? 'Ekleniyor...' : 'Toplu Ekle'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Tekli Ekle */}
          <Card className="p-6 mb-6">
            <h3 className="text-base font-semibold mb-4">Tek Anahtar Ekle</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Sağlayıcı</Label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value as 'gemini' | 'openai' | 'anthropic')}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <Label className="text-sm">API Anahtarı</Label>
                <Input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="AIzaSy... veya sk-..."
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                />
              </div>

              <div>
                <Label className="text-sm">Etiket (isteğe bağlı)</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Örn: Birincil anahtar, Proje A"
                  className="mt-1"
                />
              </div>

              <Button onClick={handleAddKey} disabled={adding}>
                <Plus className="mr-2 h-4 w-4" />
                {adding ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </div>
          </Card>

          {/* Mevcut Anahtarlar */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Mevcut API Anahtarları</h3>

            {loading ? (
              <div className="text-center py-12">Yükleniyor...</div>
            ) : keys.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Henüz API anahtarı eklenmedi. Yukarıdan ekleyin.</p>
              </Card>
            ) : (
              <>
                {(['gemini', 'openai', 'anthropic'] as const).map(provider => {
                  const providerKeys = keys.filter(k => k.provider === provider);
                  if (providerKeys.length === 0) return null;
                  const activeCount = providerKeys.filter(k => k.is_active).length;

                  return (
                    <Card key={provider} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-semibold">
                          {providerLabels[provider]}
                        </h4>
                        <Badge variant="outline" className={activeCount > 0 ? 'text-green-700 border-green-300' : 'text-gray-500'}>
                          {activeCount} aktif / {providerKeys.length} toplam
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {providerKeys.map(key => {
                          const isRateLimited = key.rate_limited_until && new Date(key.rate_limited_until) > new Date();
                          return (
                            <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Switch
                                  checked={key.is_active}
                                  onCheckedChange={(checked) => handleToggleActive(key.id, checked)}
                                />
                                <div className="min-w-0">
                                  <div className="font-mono text-sm truncate">
                                    {showKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                  </div>
                                  {key.label && (
                                    <div className="text-xs text-muted-foreground">{key.label}</div>
                                  )}
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      <span className="text-xs text-muted-foreground mr-2">
                                        {key.usage_count} istek
                                      </span>
                                      
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600/80 bg-blue-50/50 px-1.5 py-0.5 rounded cursor-help" title="Input (Prompt) Tokens">
                                        📥 {(key.total_prompt_tokens || 0).toLocaleString('tr-TR')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600/80 bg-green-50/50 px-1.5 py-0.5 rounded cursor-help" title="Output (Completion) Tokens">
                                        📤 {(key.total_completion_tokens || 0).toLocaleString('tr-TR')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600/80 bg-purple-50/50 px-1.5 py-0.5 rounded ml-1 cursor-help" title="Total Tokens Used">
                                        ∑ {((key.total_prompt_tokens || 0) + (key.total_completion_tokens || 0)).toLocaleString('tr-TR')}
                                      </span>

                                      {key.last_used_at && (
                                        <span className="text-[10px] text-muted-foreground ml-2">
                                          · Son: {new Date(key.last_used_at).toLocaleDateString('tr-TR')}
                                        </span>
                                      )}
                                      {isRateLimited && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-[10px] px-1 py-0 ml-1">
                                          ⚠️ Rate limited
                                        </Badge>
                                      )}
                                    </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleShowKey(key.id)}
                                >
                                  {showKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteKey(key.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
