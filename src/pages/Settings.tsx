import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Upload, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

interface LogRecord {
  id?: string;
  operation_type: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
  model?: string;
}

// ─── Model Pricing (per 1M tokens, in USD) ───────────────────────────────────

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Gemini
  'gemini-2.5-pro-exp-03-25':     { input: 1.25,   output: 10.00  },
  'gemini-2.5-flash-preview-04-17': { input: 0.15,  output: 0.60   },
  'gemini-2.5-flash':             { input: 0.10,   output: 0.40   },
  'gemini-2.5-flash-lite':        { input: 0.075,  output: 0.30   },
  'gemini-3-flash':               { input: 0.10,   output: 0.40   },
  'gemini-3.1-flash-lite':        { input: 0.075,  output: 0.30   },
  'gemini-2.0-flash':             { input: 0.10,   output: 0.40   },
  'gemini-2.0-flash-lite':        { input: 0.075,  output: 0.30   },
  'gemini-1.5-pro':               { input: 1.25,   output: 5.00   },
  'gemini-1.5-flash':             { input: 0.075,  output: 0.30   },
  'gemini-1.5-flash-8b':          { input: 0.0375, output: 0.15   },
  // OpenAI
  'gpt-4-turbo-preview':          { input: 10.00,  output: 30.00  },
  'gpt-4o':                       { input: 2.50,   output: 10.00  },
  'gpt-4o-mini':                  { input: 0.15,   output: 0.60   },
  'gpt-3.5-turbo':                { input: 0.50,   output: 1.50   },
  // Anthropic
  'claude-3-sonnet-20240229':     { input: 3.00,   output: 15.00  },
  'claude-3-haiku-20240307':      { input: 0.25,   output: 1.25   },
  'claude-3-opus-20240229':       { input: 15.00,  output: 75.00  },
  'claude-3-5-sonnet-20241022':   { input: 3.00,   output: 15.00  },
};

const DEFAULT_PRICING = { input: 0.10, output: 0.40 }; // fallback

function calcCost(model: string | undefined, inputTokens: number, outputTokens: number): number {
  const pricing = (model && MODEL_PRICING[model]) ? MODEL_PRICING[model] : DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

function formatCost(usd: number): string {
  if (usd < 0.001) return '< $0.001';
  return `$${usd.toFixed(4)}`;
}

const LOG_PAGE_SIZE = 25;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [keys, setKeys] = useState<APIKeyRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [trueTotalRequests, setTrueTotalRequests] = useState<number>(0);

  // ── API Key Form State ──
  const [newProvider, setNewProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProvider, setBulkProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [bulkAdding, setBulkAdding] = useState(false);

  // ── Billing Filters ──
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');

  // ── Table Pagination ──
  const [tablePage, setTablePage] = useState(1);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [keysRes, logsRes, countRes] = await Promise.all([
        supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('api_key_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('api_key_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (keysRes.error) throw keysRes.error;
      setKeys(keysRes.data || []);
      setLogs(logsRes.data || []);
      setTrueTotalRequests(countRes.count || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // ─── API Key Operations ──────────────────────────────────────────────────

  async function handleAddKey() {
    if (!newKey.trim()) {
      toast({ title: 'API anahtarı gerekli', variant: 'destructive' });
      return;
    }
    try {
      setAdding(true);
      const encrypted = encryptKey(newKey.trim());
      const { error } = await supabase.from('api_keys').insert({
        user_id: user?.id,
        provider: newProvider,
        api_key: encrypted,
        label: newLabel.trim() || null,
      });
      if (error) throw error;
      toast({ title: '✅ API anahtarı eklendi' });
      setNewKey('');
      setNewLabel('');
      loadData();
    } catch (error) {
      console.error('Error adding key:', error);
      toast({ title: 'API anahtarı eklenemedi', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  async function handleBulkAdd() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
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
      loadData();
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
      const { error } = await supabase.from('api_keys').delete().eq('id', keyId);
      if (error) throw error;
      toast({ title: 'API anahtarı silindi' });
      loadData();
    } catch (error) {
      console.error('Error deleting key:', error);
      toast({ title: 'Anahtar silinemedi', variant: 'destructive' });
    }
  }

  async function handleToggleActive(keyId: string, isActive: boolean) {
    try {
      const { error } = await supabase.from('api_keys').update({ is_active: isActive }).eq('id', keyId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling key:', error);
    }
  }

  function toggleShowKey(keyId: string) {
    const newSet = new Set(showKeys);
    if (newSet.has(keyId)) newSet.delete(keyId);
    else newSet.add(keyId);
    setShowKeys(newSet);
  }

  // ─── Billing Computations ────────────────────────────────────────────────

  const { filteredLogs, uniqueModels, uniqueOperations, uniqueProviders } = useMemo(() => {
    const uModels = [...new Set(logs.map(l => l.model || 'Bilinmiyor'))];
    const uOps = [...new Set(logs.map(l => l.operation_type || 'unknown'))];
    const uProvs = [...new Set(logs.map(l => l.provider || 'unknown'))];

    const filtered = logs.filter(log => {
      const logDate = new Date(log.created_at);
      const now = new Date();

      // Time filter
      if (timeFilter === 'week') {
        if (logDate < new Date(now.getTime() - 7 * 86400_000)) return false;
      } else if (timeFilter === 'month') {
        if (logDate < new Date(now.getTime() - 30 * 86400_000)) return false;
      } else if (timeFilter === 'custom') {
        if (customStart && logDate < new Date(customStart)) return false;
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
      }

      // Provider filter
      if (filterProvider !== 'all' && log.provider !== filterProvider) return false;

      // Model filter
      if (filterModel !== 'all' && (log.model || 'Bilinmiyor') !== filterModel) return false;

      // Operation filter
      if (filterOperation !== 'all' && log.operation_type !== filterOperation) return false;

      return true;
    });

    return { filteredLogs: filtered, uniqueModels: uModels, uniqueOperations: uOps, uniqueProviders: uProvs };
  }, [logs, timeFilter, customStart, customEnd, filterProvider, filterModel, filterOperation]);

  const billingStats = useMemo(() => {
    const totalRequests = timeFilter === 'all' && filterProvider === 'all' && filterModel === 'all' && filterOperation === 'all'
      ? trueTotalRequests
      : filteredLogs.length;

    const totalInputTokens = filteredLogs.reduce((s, l) => s + (l.prompt_tokens || 0), 0);
    const totalOutputTokens = filteredLogs.reduce((s, l) => s + (l.completion_tokens || 0), 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = filteredLogs.reduce((s, l) => s + calcCost(l.model, l.prompt_tokens || 0, l.completion_tokens || 0), 0);
    const avgTokensPerRequest = filteredLogs.length > 0 ? Math.round(totalTokens / filteredLogs.length) : 0;
    const avgCostPerRequest = filteredLogs.length > 0 ? totalCost / filteredLogs.length : 0;

    // Operation stats
    const operationStats: Record<string, { tokens: number; cost: number; count: number }> = {};
    filteredLogs.forEach(log => {
      const type = log.operation_type || 'unknown';
      if (!operationStats[type]) operationStats[type] = { tokens: 0, cost: 0, count: 0 };
      operationStats[type].tokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
      operationStats[type].cost += calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0);
      operationStats[type].count++;
    });

    // Model stats
    const modelStats: Record<string, { tokens: number; cost: number; count: number; inputTokens: number; outputTokens: number }> = {};
    filteredLogs.forEach(log => {
      const model = log.model || 'Bilinmiyor';
      if (!modelStats[model]) modelStats[model] = { tokens: 0, cost: 0, count: 0, inputTokens: 0, outputTokens: 0 };
      modelStats[model].inputTokens += log.prompt_tokens || 0;
      modelStats[model].outputTokens += log.completion_tokens || 0;
      modelStats[model].tokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
      modelStats[model].cost += calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0);
      modelStats[model].count++;
    });

    // Provider stats
    const providerStats: Record<string, { tokens: number; cost: number; count: number }> = {};
    filteredLogs.forEach(log => {
      const prov = log.provider || 'unknown';
      if (!providerStats[prov]) providerStats[prov] = { tokens: 0, cost: 0, count: 0 };
      providerStats[prov].tokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
      providerStats[prov].cost += calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0);
      providerStats[prov].count++;
    });

    // Efficiency: Tokens per USD
    const efficiency = totalCost > 0 ? totalTokens / totalCost : 0;
    
    // Projection: Cost if usage continues at same rate until end of month
    const daysPassedInMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedCost = (totalCost / daysPassedInMonth) * daysInMonth;

    return {
      totalRequests, totalInputTokens, totalOutputTokens, totalTokens,
      totalCost, avgTokensPerRequest, avgCostPerRequest,
      operationStats, modelStats, providerStats, efficiency, projectedCost
    };
  }, [filteredLogs, trueTotalRequests, timeFilter, filterProvider, filterModel, filterOperation]);

  // ─── Chart Data (Daily — last 14 days) ──────────────────────────────────
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  const modelPieData = useMemo(() => {
    return Object.entries(billingStats.modelStats).map(([name, stat]) => ({
      name,
      value: stat.cost
    })).sort((a, b) => b.value - a.value);
  }, [billingStats.modelStats]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    });

    const map: Record<string, { input: number; output: number; cost: number; count: number }> = {};
    filteredLogs.forEach(log => {
      const key = new Date(log.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
      if (!map[key]) map[key] = { input: 0, output: 0, cost: 0, count: 0 };
      map[key].input += log.prompt_tokens || 0;
      map[key].output += log.completion_tokens || 0;
      map[key].cost += calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0);
      map[key].count++;
    });

    return days.map(date => ({
      date,
      input: map[date]?.input || 0,
      output: map[date]?.output || 0,
      total: (map[date]?.input || 0) + (map[date]?.output || 0),
      cost: parseFloat((map[date]?.cost || 0).toFixed(6)),
      count: map[date]?.count || 0,
    }));
  }, [filteredLogs]);

  // ─── Pagination ──────────────────────────────────────────────────────────

  const pagedLogs = useMemo(() => {
    const start = (tablePage - 1) * LOG_PAGE_SIZE;
    return filteredLogs.slice(start, start + LOG_PAGE_SIZE);
  }, [filteredLogs, tablePage]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE));

  // ─── CSV Export ──────────────────────────────────────────────────────────

  function exportCSV() {
    const headers = ['Tarih', 'Sağlayıcı', 'İşlem Tipi', 'Model', 'Input Token', 'Output Token', 'Toplam Token', 'Tahmini Maliyet ($)'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('tr-TR'),
      log.provider,
      log.operation_type,
      log.model || '-',
      log.prompt_tokens || 0,
      log.completion_tokens || 0,
      (log.prompt_tokens || 0) + (log.completion_tokens || 0),
      calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0).toFixed(6),
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_bilanco_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Derived display helpers ──────────────────────────────────────────────

  const activeGeminiCount = keys.filter(k => k.provider === 'gemini' && k.is_active).length;
  const rateLimitedCount = keys.filter(k => k.rate_limited_until && new Date(k.rate_limited_until) > new Date()).length;
  const providerLabels: Record<string, string> = {
    gemini: '🤖 Google Gemini',
    openai: '🧠 OpenAI',
    anthropic: '🔮 Anthropic Claude',
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Ayarlar</h1>
            <p className="text-sm text-muted-foreground">API anahtarları ve tercihler</p>
          </div>
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ══════════════════════ API KEYS SECTION ══════════════════════ */}
        <section>
          <h2 className="text-xl font-bold mb-4">API Anahtarları</h2>

          {/* Bulk Add */}
          <Card className="p-6 mb-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Toplu Ekle
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Her satıra bir API anahtarı gelecek şekilde yapıştırın.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Sağlayıcı</Label>
                <select
                  value={bulkProvider}
                  onChange={e => setBulkProvider(e.target.value as typeof bulkProvider)}
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
                  onChange={e => setBulkText(e.target.value)}
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

          {/* Single Add */}
          <Card className="p-6 mb-6">
            <h3 className="text-base font-semibold mb-4">Tek Anahtar Ekle</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Sağlayıcı</Label>
                <select
                  value={newProvider}
                  onChange={e => setNewProvider(e.target.value as typeof newProvider)}
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
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="AIzaSy... veya sk-..."
                  className="mt-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddKey()}
                />
              </div>
              <div>
                <Label className="text-sm">Etiket (isteğe bağlı)</Label>
                <Input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
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

          {/* Existing Keys */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Mevcut API Anahtarları</h3>
            {loading ? (
              <div className="text-center py-12">Yükleniyor...</div>
            ) : keys.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Henüz API anahtarı eklenmedi.</p>
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
                        <h4 className="text-base font-semibold">{providerLabels[provider]}</h4>
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
                                <Switch checked={key.is_active} onCheckedChange={checked => handleToggleActive(key.id, checked)} />
                                <div className="min-w-0">
                                  <div className="font-mono text-sm truncate">
                                    {showKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                  </div>
                                  {key.label && <div className="text-xs text-muted-foreground">{key.label}</div>}
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <span className="text-xs text-muted-foreground mr-2">{key.usage_count} istek</span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded" title="Input Tokens">
                                      📥 {(key.total_prompt_tokens || 0).toLocaleString('tr-TR')}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded" title="Output Tokens">
                                      📤 {(key.total_completion_tokens || 0).toLocaleString('tr-TR')}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/20 px-1.5 py-0.5 rounded ml-1" title="Total">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleShowKey(key.id)}>
                                  {showKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteKey(key.id)}>
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
        </section>

        {/* ════════════════════ API BİLANÇO SECTION ════════════════════ */}
        <section className="pt-8 border-t">
          {/* Billing Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              API Bilanço
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Yenile
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredLogs.length === 0} className="gap-1">
                <Download className="h-3.5 w-3.5" />
                CSV İndir
              </Button>
            </div>
          </div>

          {/* ── Filters ── */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Time */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Zaman Aralığı</Label>
                <select
                  value={timeFilter}
                  onChange={e => { setTimeFilter(e.target.value as typeof timeFilter); setTablePage(1); }}
                  className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                >
                  <option value="all">Tüm Zamanlar</option>
                  <option value="month">Son 30 Gün</option>
                  <option value="week">Son 7 Gün</option>
                  <option value="custom">Özel Aralık</option>
                </select>
              </div>

              {/* Provider */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Sağlayıcı</Label>
                <select
                  value={filterProvider}
                  onChange={e => { setFilterProvider(e.target.value); setTablePage(1); }}
                  className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                >
                  <option value="all">Tümü</option>
                  {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Model */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Model</Label>
                <select
                  value={filterModel}
                  onChange={e => { setFilterModel(e.target.value); setTablePage(1); }}
                  className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                >
                  <option value="all">Tümü</option>
                  {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Operation */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">İşlem Tipi</Label>
                <select
                  value={filterOperation}
                  onChange={e => { setFilterOperation(e.target.value); setTablePage(1); }}
                  className="w-full px-2 py-1.5 border rounded-md bg-background text-sm"
                >
                  <option value="all">Tümü</option>
                  {uniqueOperations.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {timeFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Başlangıç Tarihi</Label>
                  <Input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setTablePage(1); }} className="text-sm h-8" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Bitiş Tarihi</Label>
                  <Input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setTablePage(1); }} className="text-sm h-8" />
                </div>
              </div>
            )}

            {/* Active filter badges */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{filteredLogs.length.toLocaleString('tr-TR')} kayıt gösteriliyor</span>
              {filterProvider !== 'all' && <Badge variant="secondary" className="text-xs">{filterProvider}</Badge>}
              {filterModel !== 'all' && <Badge variant="secondary" className="text-xs">{filterModel}</Badge>}
              {filterOperation !== 'all' && <Badge variant="secondary" className="text-xs">{filterOperation}</Badge>}
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-5 border-primary/10 bg-card/60 backdrop-blur-md shadow-xl">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Toplam İstek</p>
              <p className="text-3xl font-serif font-bold text-foreground">{billingStats.totalRequests.toLocaleString('tr-TR')}</p>
              <p className="text-[10px] text-green-600 font-medium mt-1">Son 30 gün verisi</p>
            </Card>
            <Card className="p-5 border-primary/10 bg-card/60 backdrop-blur-md shadow-xl">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Toplam Token</p>
              <p className="text-3xl font-serif font-bold text-primary">{billingStats.totalTokens.toLocaleString('tr-TR')}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded">IN: {billingStats.totalInputTokens.toLocaleString('tr-TR')}</span>
                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1 rounded">OUT: {billingStats.totalOutputTokens.toLocaleString('tr-TR')}</span>
              </div>
            </Card>
            <Card className="p-5 border-amber-200 bg-amber-50/30 backdrop-blur-md shadow-xl overflow-hidden relative group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity className="h-20 w-20" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-amber-700/60 mb-1">Toplam Maliyet</p>
              <p className="text-3xl font-serif font-bold text-amber-600">{formatCost(billingStats.totalCost)}</p>
              <p className="text-[10px] text-amber-800/50 font-medium mt-1">Projeksiyon: {formatCost(billingStats.projectedCost)}/ay</p>
            </Card>
            <Card className="p-5 border-violet-200 bg-violet-50/30 backdrop-blur-md shadow-xl">
              <p className="text-[10px] uppercase font-bold tracking-widest text-violet-700/60 mb-1">Verimlilik</p>
              <p className="text-3xl font-serif font-bold text-violet-600">{(billingStats.efficiency / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-violet-800/50 font-medium mt-1">Token / $1.00</p>
            </Card>
          </div>

          {/* ── Charts Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* Token Trend */}
            <Card className="p-6 md:col-span-2">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">Token Kullanım Trendi (Son 14 Gün)</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} width={38} />
                    <RechartsTooltip formatter={(value: number) => [value.toLocaleString('tr-TR'), 'Token']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area name="Giriş (Input)" type="monotone" dataKey="input" stroke="#3b82f6" fill="url(#inputGrad)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                    <Area name="Çıkış (Output)" type="monotone" dataKey="output" stroke="#10b981" fill="url(#outputGrad)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Cost Trend & Model Distribution */}
            <Card className="p-6 md:col-span-1">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">Model Harcama Dağılımı</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelPieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {modelPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [formatCost(value), 'Harcanan']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {modelPieData.slice(0, 3).map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium truncate max-w-[120px]">{m.name}</span>
                    </div>
                    <span>{formatCost(m.value)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 md:col-span-1">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">Günlük Harcama Trendi</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(2)}`} width={40} />
                    <RechartsTooltip formatter={(value: number) => [`$${value.toFixed(5)}`, 'Maliyet']} />
                    <Bar name="Maliyet ($)" dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Operation Stats */}
            <Card className="p-6">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">İşlem Tipi Kırılımı</h3>
              {Object.keys(billingStats.operationStats).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">Veri bulunamadı.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(billingStats.operationStats)
                    .sort(([, a], [, b]) => b.tokens - a.tokens)
                    .map(([type, stat]) => {
                      const maxTokens = Math.max(...Object.values(billingStats.operationStats).map(s => s.tokens), 1);
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium truncate max-w-[60%]" title={type}>{type}</span>
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {stat.tokens.toLocaleString('tr-TR')} tok · {formatCost(stat.cost)}
                            </span>
                          </div>
                          <Progress value={(stat.tokens / maxTokens) * 100} className="h-1.5" />
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>

            {/* Model Stats */}
            <Card className="p-6">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">Model Kırılımı</h3>
              {Object.keys(billingStats.modelStats).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">Veri bulunamadı.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(billingStats.modelStats)
                    .sort(([, a], [, b]) => b.tokens - a.tokens)
                    .map(([model, stat]) => {
                      const maxTokens = Math.max(...Object.values(billingStats.modelStats).map(s => s.tokens), 1);
                      return (
                        <div key={model}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium truncate max-w-[55%]" title={model}>{model}</span>
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {stat.tokens.toLocaleString('tr-TR')} tok · {formatCost(stat.cost)}
                            </span>
                          </div>
                          <Progress value={(stat.tokens / maxTokens) * 100} className="h-1.5" />
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>

            {/* Provider Stats */}
            <Card className="p-6 md:col-span-2">
              <h3 className="text-base font-semibold mb-4 text-foreground/80">Sağlayıcı Karşılaştırması</h3>
              {Object.keys(billingStats.providerStats).length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">Veri bulunamadı.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(billingStats.providerStats)
                    .sort(([, a], [, b]) => b.tokens - a.tokens)
                    .map(([prov, stat]) => (
                      <div key={prov} className="border rounded-lg p-4">
                        <div className="font-semibold text-sm capitalize mb-2">{providerLabels[prov] || prov}</div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>İstek: <span className="font-medium text-foreground">{stat.count.toLocaleString('tr-TR')}</span></div>
                          <div>Token: <span className="font-medium text-foreground">{stat.tokens.toLocaleString('tr-TR')}</span></div>
                          <div>Maliyet: <span className="font-medium text-amber-600">{formatCost(stat.cost)}</span></div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Detailed Transaction Table ── */}
          <Card className="p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground/80">
                İşlem Geçmişi
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredLogs.length.toLocaleString('tr-TR')} kayıt)
                </span>
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>{tablePage} / {totalPages}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tablePage >= totalPages}
                  onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tarih</TableHead>
                    <TableHead className="text-xs">Sağlayıcı</TableHead>
                    <TableHead className="text-xs">İşlem Tipi</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-right text-xs text-blue-600">Input</TableHead>
                    <TableHead className="text-right text-xs text-green-600">Output</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Toplam</TableHead>
                    <TableHead className="text-right text-xs text-amber-600">Maliyet ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLogs.map((log, i) => {
                    const cost = calcCost(log.model, log.prompt_tokens || 0, log.completion_tokens || 0);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{log.provider}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{log.operation_type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]" title={log.model}>
                          {log.model || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-blue-600">{(log.prompt_tokens || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell className="text-right text-xs text-green-600">{(log.completion_tokens || 0).toLocaleString('tr-TR')}</TableCell>
                        <TableCell className="text-right text-xs font-bold">
                          {((log.prompt_tokens || 0) + (log.completion_tokens || 0)).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-amber-700">
                          {formatCost(cost)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pagedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Filtrelere uygun işlem bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>
                  {((tablePage - 1) * LOG_PAGE_SIZE + 1).toLocaleString('tr-TR')} –{' '}
                  {Math.min(tablePage * LOG_PAGE_SIZE, filteredLogs.length).toLocaleString('tr-TR')}{' '}
                  / {filteredLogs.length.toLocaleString('tr-TR')} kayıt
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={tablePage <= 1} onClick={() => setTablePage(1)} className="h-7 text-xs px-2">İlk</Button>
                  <Button variant="outline" size="sm" disabled={tablePage <= 1} onClick={() => setTablePage(p => p - 1)} className="h-7 text-xs px-2">‹ Önceki</Button>
                  <Button variant="outline" size="sm" disabled={tablePage >= totalPages} onClick={() => setTablePage(p => p + 1)} className="h-7 text-xs px-2">Sonraki ›</Button>
                  <Button variant="outline" size="sm" disabled={tablePage >= totalPages} onClick={() => setTablePage(totalPages)} className="h-7 text-xs px-2">Son</Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
