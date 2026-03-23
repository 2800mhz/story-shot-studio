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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity } from 'lucide-react';

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
  const [logs, setLogs] = useState<{
    operation_type: string;
    provider: string;
    prompt_tokens: number;
    completion_tokens: number;
    created_at: string;
    model?: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

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

      const { data: logData } = await supabase
        .from('api_key_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1000);
      setLogs(logData || []);
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

  // --- Bilanço Hesaplamaları ---
  const filteredLogs = logs.filter(log => {
    if (timeFilter === 'all') return true;
    const logDate = new Date(log.created_at);
    const now = new Date();
    if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= weekAgo;
    }
    if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return logDate >= monthAgo;
    }
    return true;
  });

  const totalRequests = filteredLogs.length;
  const totalInputTokens = filteredLogs.reduce((sum, log) => sum + (log.prompt_tokens || 0), 0);
  const totalOutputTokens = filteredLogs.reduce((sum, log) => sum + (log.completion_tokens || 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;

  const operationTypeStats = filteredLogs.reduce((acc, log) => {
    const type = log.operation_type || 'unknown';
    const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0);
    acc[type] = (acc[type] || 0) + tokens;
    return acc;
  }, {} as Record<string, number>);

  const modelStats = filteredLogs.reduce((acc, log) => {
    const model = log.model || 'Bilinmiyor';
    const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0);
    acc[model] = (acc[model] || 0) + tokens;
    return acc;
  }, {} as Record<string, number>);

  const maxOperationTokens = Math.max(...Object.values(operationTypeStats), 1);
  const maxModelTokens = Math.max(...Object.values(modelStats), 1);

  // Chart Data (Son 7 gün)
  const chartDataMap = filteredLogs.reduce((acc, log) => {
    const dateStr = new Date(log.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    const input = log.prompt_tokens || 0;
    const output = log.completion_tokens || 0;
    if (!acc[dateStr]) acc[dateStr] = { total: 0, input: 0, output: 0 };
    acc[dateStr].total += (input + output);
    acc[dateStr].input += input;
    acc[dateStr].output += output;
    return acc;
  }, {} as Record<string, { total: number, input: number, output: number }>);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  }).reverse();

  const chartData = last7Days.map(date => ({
    date,
    tokens: chartDataMap[date]?.total || 0,
    input: chartDataMap[date]?.input || 0,
    output: chartDataMap[date]?.output || 0
  }));

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
                                      
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-help" title="Input (Prompt) Tokens">
                                        📥 {(key.total_prompt_tokens || 0).toLocaleString('tr-TR')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-help" title="Output (Completion) Tokens">
                                        📤 {(key.total_completion_tokens || 0).toLocaleString('tr-TR')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/20 px-1.5 py-0.5 rounded ml-1 cursor-help" title="Total Tokens Used">
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

        {/* ── API Bilanço Section ── */}
        <div className="pt-8 border-t">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              API Bilanço
            </h2>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Zaman:</Label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as 'all' | 'week' | 'month')}
                className="px-3 py-1.5 border rounded-md bg-background text-sm"
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="month">Bu Ay</option>
                <option value="week">Bu Hafta</option>
              </select>
            </div>
          </div>

          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">Top. İstek Sayısı</span>
              <span className="text-2xl font-bold">{totalRequests.toLocaleString('tr-TR')}</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">Top. Input Token</span>
              <span className="text-2xl font-bold text-blue-600">{totalInputTokens.toLocaleString('tr-TR')}</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">Top. Output Token</span>
              <span className="text-2xl font-bold text-green-600">{totalOutputTokens.toLocaleString('tr-TR')}</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">Toplam Token</span>
              <span className="text-2xl font-bold text-primary">{totalTokens.toLocaleString('tr-TR')}</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Operation Type Dağılımı */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground/80">İşlem Tipi Dağılımı</h3>
              {Object.keys(operationTypeStats).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">Veri bulunamadı.</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(operationTypeStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, tokens]) => (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{type}</span>
                          <span className="text-muted-foreground">{tokens.toLocaleString('tr-TR')} token</span>
                        </div>
                        <Progress value={(tokens / maxOperationTokens) * 100} className="h-2" />
                      </div>
                    ))}
                </div>
              )}
            </Card>

            {/* Model Dağılımı */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground/80">Model Dağılımı</h3>
              {Object.keys(modelStats).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">Veri bulunamadı.</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(modelStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([model, tokens]) => (
                      <div key={model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate mr-2" title={model}>{model}</span>
                          <span className="text-muted-foreground whitespace-nowrap">{tokens.toLocaleString('tr-TR')} token</span>
                        </div>
                        <Progress value={(tokens / maxModelTokens) * 100} className="h-2" />
                      </div>
                    ))}
                </div>
              )}
            </Card>

            {/* Günlük Token Kullanımı (Line Chart) */}
            <Card className="p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 text-foreground/80">Kullanım Trendi (Giriş vs Çıkış)</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`} width={40} />
                    <RechartsTooltip 
                      formatter={(value: number) => [value.toLocaleString('tr-TR'), 'Token']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line name="Giriş (Input)" type="monotone" dataKey="input" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    <Line name="Çıkış (Output)" type="monotone" dataKey="output" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Toplam Günlük Kullanım (Bar Chart) */}
            <Card className="p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 text-foreground/80">Günlük Toplam Kullanım (Son 7 Gün)</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.5} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`} width={40} />
                    <RechartsTooltip 
                      formatter={(value: number) => [value.toLocaleString('tr-TR'), 'Token']}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar name="Toplam Token" dataKey="tokens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Son İşlem Tablosu */}
          <Card className="p-6 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4 text-foreground/80">Son 20 İşlem</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Sağlayıcı</TableHead>
                    <TableHead>İşlem Tipi</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 20).map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('tr-TR', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {log.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">{log.operation_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]" title={log.model}>{log.model || '-'}</TableCell>
                      <TableCell className="text-right text-xs text-blue-600">{(log.prompt_tokens || 0).toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right text-xs text-green-600">{(log.completion_tokens || 0).toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-foreground">
                        {((log.prompt_tokens || 0) + (log.completion_tokens || 0)).toLocaleString('tr-TR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Henüz işlem bulunmuyor.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}
