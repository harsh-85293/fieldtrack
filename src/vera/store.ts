import type {
  ContextEnvelope,
  MerchantPayload,
  CustomerPayload,
  Trigger,
  Action,
  ConversationEntry,
  CategoryId,
} from './types';

interface MerchantState {
  context_id: string;
  version: number;
  payload: MerchantPayload;
  delivered_at: string;
  stored_at: string;
  actions: Action[];
  conversation: ConversationEntry[];
  last_tick_at: string | null;
}

interface CustomerState {
  context_id: string;
  version: number;
  payload: CustomerPayload;
  delivered_at: string;
  stored_at: string;
}

interface StateShape {
  merchants: Map<string, MerchantState>;
  customers: Map<string, CustomerState>;
  triggers: Trigger[];
  processed_triggers: Set<string>;
  started_at: number;
}

const state: StateShape = {
  merchants: new Map(),
  customers: new Map(),
  triggers: [],
  processed_triggers: new Set(),
  started_at: Date.now(),
};

function ackId(): string {
  return `ack_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function actionId(): string {
  return `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function ingestContext(envelope: ContextEnvelope): { ack_id: string; stored_at: string } {
  const stored_at = new Date().toISOString();

  if (envelope.scope === 'merchant') {
    const existing = state.merchants.get(envelope.context_id);
    if (existing && existing.version >= envelope.version) {
      return { ack_id: ackId(), stored_at: existing.stored_at };
    }
    state.merchants.set(envelope.context_id, {
      context_id: envelope.context_id,
      version: envelope.version,
      payload: envelope.payload as MerchantPayload,
      delivered_at: envelope.delivered_at,
      stored_at,
      actions: existing?.actions ?? [],
      conversation: (envelope.payload as MerchantPayload).conversation_history ?? existing?.conversation ?? [],
      last_tick_at: existing?.last_tick_at ?? null,
    });
  } else {
    const existing = state.customers.get(envelope.context_id);
    if (existing && existing.version >= envelope.version) {
      return { ack_id: ackId(), stored_at: existing.stored_at };
    }
    state.customers.set(envelope.context_id, {
      context_id: envelope.context_id,
      version: envelope.version,
      payload: envelope.payload as CustomerPayload,
      delivered_at: envelope.delivered_at,
      stored_at,
    });
  }

  return { ack_id: ackId(), stored_at };
}

export function ingestTrigger(trigger: Trigger): string {
  const id = `${trigger.type}:${trigger.merchant_id ?? ''}:${trigger.customer_id ?? ''}:${trigger.delivered_at ?? Date.now()}`;
  if (!state.processed_triggers.has(id)) {
    state.triggers.push({ ...trigger, delivered_at: trigger.delivered_at ?? new Date().toISOString() });
    state.processed_triggers.add(id);
  }
  return id;
}

export function getMerchant(context_id: string): MerchantState | undefined {
  return state.merchants.get(context_id);
}

export function getCustomer(context_id: string): CustomerState | undefined {
  return state.customers.get(context_id);
}

export function getAllMerchants(): MerchantState[] {
  return Array.from(state.merchants.values());
}

export function getPendingTriggers(merchant_id?: string): Trigger[] {
  if (merchant_id) {
    return state.triggers.filter((t) => t.merchant_id === merchant_id);
  }
  return [...state.triggers];
}

export function clearTriggers(merchant_id?: string): void {
  if (merchant_id) {
    state.triggers = state.triggers.filter((t) => t.merchant_id !== merchant_id);
  } else {
    state.triggers = [];
  }
}

export function addAction(merchant_id: string, action: Action): void {
  const merchant = state.merchants.get(merchant_id);
  if (merchant) {
    merchant.actions.push(action);
  }
}

export function getActions(merchant_id: string): Action[] {
  return state.merchants.get(merchant_id)?.actions ?? [];
}

export function getAction(action_id: string): Action | undefined {
  for (const m of state.merchants.values()) {
    const found = m.actions.find((a) => a.action_id === action_id);
    if (found) return found;
  }
  return undefined;
}

export function appendConversation(merchant_id: string, entry: ConversationEntry): void {
  const merchant = state.merchants.get(merchant_id);
  if (merchant) {
    merchant.conversation.push(entry);
  }
}

export function getConversation(merchant_id: string): ConversationEntry[] {
  return state.merchants.get(merchant_id)?.conversation ?? [];
}

export function setLastTick(merchant_id: string, time: string): void {
  const merchant = state.merchants.get(merchant_id);
  if (merchant) {
    merchant.last_tick_at = time;
  }
}

export function nextActionId(): string {
  return actionId();
}

export function getStats() {
  return {
    merchants_tracked: state.merchants.size,
    customers_tracked: state.customers.size,
    pending_triggers: state.triggers.length,
    total_actions: Array.from(state.merchants.values()).reduce((s, m) => s + m.actions.length, 0),
    uptime: Date.now() - state.started_at,
  };
}

export function getMerchantByCategory(category: CategoryId): MerchantState[] {
  return getAllMerchants().filter((m) => m.payload.identity?.category === category);
}
