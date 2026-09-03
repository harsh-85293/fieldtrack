// ---- Context envelope (POST /v1/context) ----
export interface ContextEnvelope {
  scope: 'merchant' | 'customer';
  context_id: string;
  version: number;
  payload: MerchantPayload | CustomerPayload;
  delivered_at: string;
}

export interface MerchantPayload {
  identity: MerchantIdentity;
  performance: PerformanceMetrics;
  offers: Offer[];
  conversation_history?: ConversationEntry[];
  digests?: DigestItem[];
}

export interface MerchantIdentity {
  name: string;
  category: CategoryId;
  city?: string;
  area?: string;
  address?: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  established_year?: number;
  speciality?: string[];
}

export interface PerformanceMetrics {
  rating?: number;
  reviews?: number;
  orders_this_week?: number;
  orders_last_week?: number;
  searches_this_week?: number;
  searches_last_week?: number;
  revenue_this_month?: number;
  revenue_last_month?: number;
  active_customers?: number;
  repeat_rate?: number;
  cancellation_rate?: number;
  avg_order_value?: number;
  response_time_hours?: number;
  trend?: 'up' | 'down' | 'flat';
  trend_pct?: number;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  type?: string;
  discount_pct?: number;
  flat_amount?: number;
  valid_until?: string;
  active?: boolean;
  usage_count?: number;
}

export interface DigestItem {
  id: string;
  type: string;
  title: string;
  data?: Record<string, unknown>;
  delivered_at?: string;
}

export interface ConversationEntry {
  role: 'vera' | 'merchant' | 'customer';
  message: string;
  timestamp?: string;
  action_id?: string;
}

export interface CustomerPayload {
  identity: {
    name?: string;
    phone?: string;
    email?: string;
  };
  relationship: {
    first_visit?: string;
    last_visit?: string;
    total_visits?: number;
    total_spent?: number;
    loyalty_tier?: string;
    preferred_services?: string[];
  };
  consent: {
    marketing?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    email?: boolean;
  };
  status: {
    active?: boolean;
    last_interaction?: string;
    opted_out?: boolean;
  };
  preference: {
    preferred_channel?: string;
    best_time?: string;
    interests?: string[];
  };
}

// ---- Trigger ----
export type TriggerType = 'recall' | 'spike' | 'dip' | 'research' | 'festival';

export interface Trigger {
  type: TriggerType;
  merchant_id?: string;
  customer_id?: string;
  data: TriggerData;
  delivered_at?: string;
}

export interface TriggerData {
  // recall
  last_visit_date?: string;
  days_inactive?: number;
  last_service?: string;
  // spike
  metric?: string;
  change_pct?: number;
  absolute_value?: number;
  search_term?: string;
  // dip
  drop_pct?: number;
  competitor_name?: string;
  competitor_offer?: string;
  // research
  insight?: string;
  search_volume?: number;
  search_trend_pct?: number;
  competitor_count?: number;
  opportunity?: string;
  // festival
  festival_name?: string;
  days_until?: number;
  relevant_searches?: number;
}

// ---- Compose result ----
export interface ComposeResult {
  message: string;
  cta: string;
  send_as: string;
  suppression_key: string;
  rationale: string;
}

// ---- Action (tick output) ----
export interface Action extends ComposeResult {
  action_id: string;
  trigger_type: TriggerType;
  target: 'merchant' | 'customer';
  merchant_id: string;
  customer_id?: string;
  offer_id?: string;
  created_at: string;
}

// ---- Reply ----
export interface ReplyRequest {
  merchant_id: string;
  customer_id?: string;
  action_id?: string;
  reply: string;
}

export interface ReplyResponse {
  processed: boolean;
  follow_up?: Action;
  conversation_updated: boolean;
}

// ---- API responses ----
export interface ContextResponse {
  accepted: boolean;
  ack_id: string;
  stored_at: string;
}

export interface TickRequest {
  merchant_id?: string;
  tick_id?: string;
}

export interface TickResponse {
  tick_id: string;
  actions: Action[];
  count: number;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  merchants_tracked: number;
  customers_tracked: number;
  pending_actions: number;
}

export interface MetadataResponse {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  max_actions_per_tick: number;
  categories: CategoryId[];
  triggers: TriggerType[];
}

// ---- Category ----
export type CategoryId = 'dentists' | 'salons' | 'restaurants' | 'gyms' | 'pharmacies';

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  tone: string;
  voice: string;
  avoid: string[];
  offer_patterns: string[];
  seasonal_moments: string[];
  cta_style: string;
  send_as_default: string;
  unit_label: string; // "patients", "customers", "members", etc.
  service_label: string; // "appointment", "booking", "order", etc.
}
