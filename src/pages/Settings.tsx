import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
      toast({ title: 'API key is required', variant: 'destructive' });
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

      toast({ title: 'API key added successfully' });
      setNewKey('');
      setNewLabel('');
      loadKeys();
    } catch (error) {
      console.error('Error adding key:', error);
      toast({ title: 'Failed to add API key', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm('Delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast({ title: 'API key deleted' });
      loadKeys();
    } catch (error) {
      console.error('Error deleting key:', error);
      toast({ title: 'Failed to delete key', variant: 'destructive' });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage API keys and preferences</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Add New Key */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Add API Key</h2>

          <div className="space-y-4">
            <div>
              <Label>Provider</Label>
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as 'gemini' | 'openai' | 'anthropic')}
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-..."
                className="mt-2"
              />
            </div>

            <div>
              <Label>Label (optional)</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="My primary key"
                className="mt-2"
              />
            </div>

            <Button onClick={handleAddKey} disabled={adding}>
              <Plus className="mr-2 h-4 w-4" />
              {adding ? 'Adding...' : 'Add Key'}
            </Button>
          </div>
        </Card>

        {/* Existing Keys */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your API Keys</h2>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : keys.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No API keys yet. Add one above to get started.</p>
            </Card>
          ) : (
            <>
              {(['gemini', 'openai', 'anthropic'] as const).map(provider => {
                const providerKeys = keys.filter(k => k.provider === provider);
                if (providerKeys.length === 0) return null;

                return (
                  <Card key={provider} className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {providerLabels[provider]}
                    </h3>
                    <div className="space-y-3">
                      {providerKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={key.is_active}
                                onCheckedChange={(checked) => handleToggleActive(key.id, checked)}
                              />
                              <div>
                                <div className="font-mono text-sm">
                                  {showKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                </div>
                                {key.label && (
                                  <div className="text-xs text-muted-foreground">{key.label}</div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  Used {key.usage_count} times
                                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleString()}`}
                                  {key.rate_limited_until && new Date(key.rate_limited_until) > new Date() && (
                                    <span className="text-yellow-600 ml-2">⚠️ Rate limited</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleShowKey(key.id)}
                            >
                              {showKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteKey(key.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
