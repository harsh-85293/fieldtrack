import { useState, useEffect, useCallback } from 'react';

interface HealthData {
  status: string;
  uptime: number;
  merchants_tracked: number;
  customers_tracked: number;
  pending_actions: number;
}

interface MetadataData {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  max_actions_per_tick: number;
  categories: string[];
  triggers: string[];
}

interface MerchantListItem {
  context_id: string;
  name: string;
  category: string;
  area: string;
  version: number;
  action_count: number;
  conversation_count: number;
}

interface Action {
  action_id: string;
  message: string;
  cta: string;
  send_as: string;
  suppression_key: string;
  rationale: string;
  trigger_type: string;
  target: string;
  merchant_id: string;
  customer_id?: string;
  created_at: string;
}

interface ConversationEntry {
  role: string;
  message: string;
  timestamp?: string;
  action_id?: string;
}

const API_BASE = '/v1';

async function apiCall(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metadata, setMetadata] = useState<MetadataData | null>(null);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingActions, setLoadingActions] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [contextInput, setContextInput] = useState('');
  const [triggerInput, setTriggerInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'context' | 'trigger' | 'actions'>('dashboard');

  const refreshHealth = useCallback(async () => {
    try {
      const data = await apiCall('/healthz');
      setHealth(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshMerchants = useCallback(async () => {
    try {
      const data = await apiCall('/merchants');
      setMerchants(data.merchants || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    apiCall('/metadata').then(setMetadata).catch(console.error);
    refreshMerchants();
    const interval = setInterval(() => {
      refreshHealth();
      refreshMerchants();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshHealth, refreshMerchants]);

  const selectMerchant = async (id: string) => {
    setSelectedMerchant(id);
    setLoadingActions(true);
    try {
      const data = await apiCall(`/actions/${id}`);
      setActions(data.actions || []);
      setConversation(data.conversation || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingActions(false);
  };

  const handleTick = async () => {
    const body = selectedMerchant ? JSON.stringify({ merchant_id: selectedMerchant }) : '{}';
    try {
      const data = await apiCall('/tick', { method: 'POST', body });
      setTickResult(`Tick ${data.tick_id}: ${data.count} actions generated`);
      if (selectedMerchant) await selectMerchant(selectedMerchant);
      refreshHealth();
      refreshMerchants();
    } catch (e) {
      setTickResult(`Error: ${e}`);
    }
  };

  const handleReply = async () => {
    if (!selectedMerchant || !replyText.trim()) return;
    try {
      await apiCall('/reply', {
        method: 'POST',
        body: JSON.stringify({ merchant_id: selectedMerchant, reply: replyText }),
      });
      setReplyText('');
      await selectMerchant(selectedMerchant);
    } catch (e) {
      console.error(e);
    }
  };

  const handleContextSubmit = async () => {
    if (!contextInput.trim()) return;
    try {
      const parsed = JSON.parse(contextInput);
      await apiCall('/context', { method: 'POST', body: JSON.stringify(parsed) });
      setContextInput('');
      refreshHealth();
      refreshMerchants();
      setTickResult('Context accepted');
    } catch (e) {
      setTickResult(`Error: ${e}`);
    }
  };

  const handleTriggerSubmit = async () => {
    if (!triggerInput.trim()) return;
    try {
      const parsed = JSON.parse(triggerInput);
      await apiCall('/trigger', { method: 'POST', body: JSON.stringify(parsed) });
      setTriggerInput('');
      refreshHealth();
      setTickResult('Trigger ingested — run a tick to generate actions');
    } catch (e) {
      setTickResult(`Error: ${e}`);
    }
  };

  const fmtTime = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  const triggerColors: Record<string, string> = {
    recall: 'bg-amber-100 text-amber-700 border-amber-200',
    spike: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dip: 'bg-rose-100 text-rose-700 border-rose-200',
    research: 'bg-blue-100 text-blue-700 border-blue-200',
    festival: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vera</h1>
              <p className="text-xs text-gray-500">Message Engine by magicpin</p>
          </div>
          </div>
          <div className="flex items-center gap-4">
            {health && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-gray-600">{health.status}</span>
                <span className="text-xs text-gray-400">· {fmtTime(health.uptime)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {(['dashboard', 'context', 'trigger', 'actions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Merchants Tracked" value={health?.merchants_tracked ?? 0} icon="🏪" />
              <StatCard label="Customers Tracked" value={health?.customers_tracked ?? 0} icon="👥" />
              <StatCard label="Pending Triggers" value={health?.pending_actions ?? 0} icon="⚡" />
              <StatCard label="Uptime" value={health ? fmtTime(health.uptime) : '—'} icon="⏱" />
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Engine Metadata</h2>
                <p className="text-sm text-gray-600 mb-4">{metadata.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {metadata.categories.map((c) => (
                        <span key={c} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {metadata.triggers.map((t) => (
                        <span key={t} className={`px-3 py-1 rounded-full text-xs font-medium border ${triggerColors[t] || 'bg-gray-100 text-gray-700'}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {metadata.capabilities.map((c) => (
                      <span key={c} className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Merchants list */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tracked Merchants</h2>
                <button
                  onClick={handleTick}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Run Tick
                </button>
              </div>
              {merchants.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No merchants yet. Push context via the Context tab to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {merchants.map((m) => (
                    <button
                      key={m.context_id}
                      onClick={() => selectMerchant(m.context_id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedMerchant === m.context_id
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{m.name || m.context_id}</p>
                          <p className="text-xs text-gray-500">
                            {m.category} · {m.area || 'No area'} · v{m.version}
                          </p>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>{m.action_count} actions</span>
                          <span>{m.conversation_count} msgs</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {tickResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                {tickResult}
              </div>
            )}
          </div>
        )}

        {/* Context Tab */}
        {activeTab === 'context' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Push Context</h2>
              <p className="text-sm text-gray-500 mb-4">
                Paste a context envelope (merchant or customer). The engine stores it idempotently by scope + context_id + version.
              </p>
              <textarea
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder={`{
  "scope": "merchant",
  "context_id": "m_001_drmeera",
  "version": 1,
  "payload": {
    "identity": { "name": "Dr. Meera Dental Clinic", "category": "dentists", "area": "Koramangala" },
    "performance": { "active_customers": 120, "rating": 4.6 },
    "offers": [{ "id": "o1", "title": "Dental Check-up at ₹299", "active": true }]
  },
  "delivered_at": "2026-08-22T10:00:00Z"
}`}
                className="w-full h-80 p-4 rounded-lg border border-gray-200 font-mono text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
              />
              <button
                onClick={handleContextSubmit}
                className="mt-4 px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Submit Context
              </button>
            </div>
            {tickResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                {tickResult}
              </div>
            )}
          </div>
        )}

        {/* Trigger Tab */}
        {activeTab === 'trigger' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Inject Trigger</h2>
              <p className="text-sm text-gray-500 mb-4">
                Push a trigger for a tracked merchant. Then run a tick to compose messages.
              </p>
              <textarea
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                placeholder={`{
  "type": "recall",
  "merchant_id": "m_001_drmeera",
  "data": { "days_inactive": 45, "last_service": "scaling" }
}`}
                className="w-full h-64 p-4 rounded-lg border border-gray-200 font-mono text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleTriggerSubmit}
                  className="px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Inject Trigger
                </button>
                <button
                  onClick={handleTick}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Run Tick
                </button>
              </div>
            </div>

            {/* Quick trigger buttons */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { type: 'recall', label: 'Recall — 45 days inactive', data: { type: 'recall', data: { days_inactive: 45, last_service: 'check-up' } } },
                  { type: 'spike', label: 'Spike — 60% search increase', data: { type: 'spike', data: { metric: 'searches', change_pct: 60, search_term: 'teeth whitening', absolute_value: 190 } } },
                  { type: 'dip', label: 'Dip — 25% orders down', data: { type: 'dip', data: { drop_pct: 25, competitor_name: 'SmileCare', competitor_offer: 'Free consultation' } } },
                  { type: 'research', label: 'Research — 500 searches/mo', data: { type: 'research', data: { insight: 'root canal', search_volume: 500, search_trend_pct: 15, competitor_count: 2, opportunity: 'No competitor targets this' } } },
                  { type: 'festival', label: 'Festival — Diwali in 7 days', data: { type: 'festival', data: { festival_name: 'Diwali', days_until: 7, relevant_searches: 320 } } },
                ].map((tpl) => (
                  <button
                    key={tpl.type}
                    onClick={() => setTriggerInput(JSON.stringify({ ...tpl.data, merchant_id: selectedMerchant || 'm_001' }, null, 2))}
                    className={`p-3 rounded-lg border text-left text-sm transition-all hover:bg-gray-50 ${triggerColors[tpl.type] || 'border-gray-200'}`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            {tickResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                {tickResult}
              </div>
            )}
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {!selectedMerchant ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400">Select a merchant from the Dashboard to view actions and conversation.</p>
              </div>
            ) : (
              <>
                {/* Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Composed Actions</h2>
                    <button
                      onClick={handleTick}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                    >
                      Run Tick
                    </button>
                  </div>
                  {loadingActions ? (
                    <p className="text-sm text-gray-400 py-4">Loading...</p>
                  ) : actions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">
                      No actions yet. Inject a trigger and run a tick to compose messages.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((a) => (
                        <div key={a.action_id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${triggerColors[a.trigger_type] || 'bg-gray-100'}`}>
                              {a.trigger_type}
                            </span>
                            <span className="text-xs text-gray-400">{a.target}</span>
                            <span className="text-xs text-gray-400 ml-auto">{new Date(a.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">{a.message}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-500">CTA:</span>
                            <span className="text-xs text-gray-700">{a.cta}</span>
                          </div>
                          <div className="text-xs text-gray-500 bg-white rounded-md p-2 border border-gray-100">
                            <span className="font-medium">Rationale: </span>{a.rationale}
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-gray-400">
                            <span>send_as: {a.send_as}</span>
                            <span>key: {a.suppression_key.slice(0, 40)}...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conversation */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
                  {conversation.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No messages yet.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {conversation.map((c, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-sm ${
                            c.role === 'vera'
                              ? 'bg-gray-100 text-gray-800'
                              : c.role === 'merchant'
                              ? 'bg-blue-50 text-blue-900'
                              : 'bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          <span className="text-xs font-medium opacity-60 mr-2">{c.role}:</span>
                          {c.message}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      placeholder="Reply as merchant (yes/no/free text)..."
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <button
                      onClick={handleReply}
                      className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
