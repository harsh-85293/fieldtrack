// Server-side Vera API handler for Vite dev middleware.
// This runs in Node (not browser) and provides the /v1/* endpoints.
// Uses in-memory Maps — state resets on server restart.

import type {
  ContextEnvelope,
  ContextResponse,
  TickRequest,
  TickResponse,
  Action,
  ReplyRequest,
  ReplyResponse,
  HealthResponse,
  MetadataResponse,
  Trigger,
} from './types';

// ---- Inline store (Node-side, independent of browser store) ----
interface MerchantState {
  context_id: string;
  version: number;
  payload: any;
  delivered_at: string;
  stored_at: string;
  actions: Action[];
  conversation: any[];
  last_tick_at: string | null;
}

interface CustomerState {
  context_id: string;
  version: number;
  payload: any;
  delivered_at: string;
  stored_at: string;
}

const merchants = new Map<string, MerchantState>();
const customers = new Map<string, CustomerState>();
const triggers: Trigger[] = [];
const startedAt = Date.now();

function ackId(): string {
  return `ack_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function actionId(): string {
  return `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Category configs (inlined for Node) ----
const CATEGORIES: Record<string, any> = {
  dentists: {
    id: 'dentists', label: 'Dental Clinic', tone: 'clinical-professional',
    send_as_default: 'Vera (Dental Growth Assistant)',
    unit_label: 'patients', service_label: 'appointment',
    offer_patterns: ['check-up camp', 'scaling + polishing bundle', 'consultation waiver', 'family package'],
    seasonal_moments: ['World Oral Health Day', 'Dental Health Month', 'Diwali', 'New Year'],
  },
  salons: {
    id: 'salons', label: 'Salon & Beauty', tone: 'visual-lifestyle',
    send_as_default: 'Vera (Salon Growth Assistant)',
    unit_label: 'clients', service_label: 'booking',
    offer_patterns: ['bridal package', 'festive glow look', 'hair spa + facial combo', 'buy-2-get-1'],
    seasonal_moments: ['Karva Chauth', 'Diwali', 'Wedding season', 'Valentine', 'Raksha Bandhan'],
  },
  restaurants: {
    id: 'restaurants', label: 'Restaurant', tone: 'timely-appetite-driven',
    send_as_default: 'Vera (Restaurant Growth Assistant)',
    unit_label: 'diners', service_label: 'order',
    offer_patterns: ['happy hour', 'buffet deal', 'combo meal', 'weekend special', 'free dessert with main course'],
    seasonal_moments: ['Weekend brunch', 'Festive thali', 'Valentine', 'New Year eve', 'IPL'],
  },
  gyms: {
    id: 'gyms', label: 'Gym & Fitness', tone: 'motivational-community',
    send_as_default: 'Vera (Fitness Growth Assistant)',
    unit_label: 'members', service_label: 'session',
    offer_patterns: ['first-month discount', 'buddy pass', 'transformation challenge', 'personal training trial'],
    seasonal_moments: ['New Year', 'Summer shred', 'Festive fitness', 'Republic Day'],
  },
  pharmacies: {
    id: 'pharmacies', label: 'Pharmacy', tone: 'utility-trust-first',
    send_as_default: 'Vera (Pharmacy Growth Assistant)',
    unit_label: 'customers', service_label: 'order',
    offer_patterns: ['refill reminder', 'medicine availability alert', 'free home delivery', 'health check-up camp'],
    seasonal_moments: ['Flu season', 'World Health Day', 'Monsoon health', 'Winter immunity'],
  },
};

// ---- Compose logic (inlined for Node) ----
function bestOffer(merchant: any) {
  const active = merchant.offers?.filter((o: any) => o.active !== false);
  const pool = active?.length ? active : merchant.offers;
  return pool?.[0];
}

function formatOffer(offer: any): string {
  let s = offer.title;
  if (offer.discount_pct) s += ` (${offer.discount_pct}% off)`;
  else if (offer.flat_amount) s += ` (₹${offer.flat_amount} off)`;
  return s;
}

function formatNum(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function composeTrigger(trigger: Trigger, merchant: any, customer: any, category: any): any {
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const cat = category;

  switch (trigger.type) {
    case 'recall': {
      const days = t.days_inactive ?? (t.last_visit_date ? daysSince(t.last_visit_date) : 30);
      const offer = bestOffer(merchant);
      const lastService = t.last_service ?? (customer?.relationship?.preferred_services?.[0] ?? cat.service_label);
      let message: string;
      if (customer) {
        const name = customer.identity?.name ?? 'there';
        if (days > 90) {
          message = `${name} hasn't visited ${merchantName} in ${days} days. Their last ${cat.service_label} was ${lastService}. `;
          message += offer ? `Should I send them a ${formatOffer(offer)} to bring them back?` : `Should I send a "we miss you" message with a complimentary ${cat.service_label} reminder?`;
        } else if (days > 30) {
          message = `${name} is due for a ${lastService} — it's been ${days} days since their last visit to ${merchantName}. `;
          message += offer ? `Want me to send a ${formatOffer(offer)} nudge?` : `Want me to send a gentle follow-up reminder?`;
        } else {
          message = `${name} visited ${days} days ago for ${lastService}. Should I send a check-in asking how things went?`;
        }
      } else {
        const inactiveCount = merchant.performance?.active_customers ? Math.floor(merchant.performance.active_customers * 0.3) : 12;
        message = `${inactiveCount} ${cat.unit_label} haven't visited ${merchantName} in ${days}+ days. `;
        message += offer ? `Should I send them a ${formatOffer(offer)} recall campaign?` : `Should I send a recall campaign with a complimentary ${cat.service_label}?`;
      }
      const cta = customer ? `Send ${customer.identity?.name ?? 'them'} a recall message now?` : `Launch recall campaign to ${cat.unit_label}?`;
      return {
        message, cta,
        send_as: cat.send_as_default,
        suppression_key: `recall:${merchant.identity?.category}:${merchant.identity?.name}:${customer?.identity?.phone ?? 'all'}:${days}`,
        rationale: `Recall trigger: ${days} days of inactivity${customer ? ` for ${customer.identity?.name ?? 'a customer'}` : ' across inactive base'}. ${cat.tone} tone with ${offer ? 'active offer' : 'soft nudge'}.`,
      };
    }
    case 'spike': {
      const metric = t.metric ?? 'searches';
      const change = t.change_pct ?? 0;
      const searchTerm = t.search_term ?? '';
      const absVal = t.absolute_value ?? 0;
      let message: string;
      if (searchTerm) {
        const searches = absVal || t.search_volume || 0;
        message = `${formatNum(searches)} people in your area are searching for "${searchTerm}" right now — up ${change}% this week. `;
        const offer = bestOffer(merchant);
        message += offer ? `Should I push your "${formatOffer(offer)}" to capture this demand?` : `Should I create a quick ${cat.service_label} offer to capture these searches?`;
      } else if (metric === 'orders' || metric === 'revenue') {
        message = `${merchantName} saw a ${change}% spike in ${metric} this week${absVal ? ` (${formatNum(absVal)} ${metric})` : ''}. `;
        message += `Want me to amplify this with a "trending this week" push to nearby ${cat.unit_label}?`;
      } else {
        message = `There's a ${change}% spike in ${metric} for ${merchantName}. Should I turn this into a momentum campaign?`;
      }
      return {
        message,
        cta: `Push this to nearby ${cat.unit_label} now?`,
        send_as: cat.send_as_default,
        suppression_key: `spike:${merchant.identity?.category}:${metric}:${searchTerm}:${change}`,
        rationale: `Spike trigger: ${change}% increase in ${metric}${searchTerm ? ` for "${searchTerm}"` : ''}. ${cat.tone} tone — surfacing real demand.`,
      };
    }
    case 'dip': {
      const drop = t.drop_pct ?? 0;
      const competitorName = t.competitor_name ?? '';
      const competitorOffer = t.competitor_offer ?? '';
      let message: string;
      if (competitorName && competitorOffer) {
        message = `${merchantName} is down ${drop}% this week. ${competitorName} nearby is running "${competitorOffer}". `;
        const offer = bestOffer(merchant);
        message += offer ? `Should I counter with your "${formatOffer(offer)}"?` : `Should I create a counter-offer to win back ${cat.unit_label}?`;
      } else {
        message = `${merchantName} is down ${drop}% in orders this week. `;
        const offer = bestOffer(merchant);
        message += offer ? `Should I activate your "${formatOffer(offer)}" to recover the dip?` : `Should I send a recovery campaign to your recent ${cat.unit_label}?`;
      }
      return {
        message,
        cta: `Activate recovery campaign now?`,
        send_as: cat.send_as_default,
        suppression_key: `dip:${merchant.identity?.category}:${merchant.identity?.name}:${drop}`,
        rationale: `Dip trigger: ${drop}% decline${competitorName ? ` vs ${competitorName}'s "${competitorOffer}"` : ''}. ${cat.tone} tone — defensive recovery.`,
      };
    }
    case 'research': {
      const insight = t.insight ?? '';
      const searchVolume = t.search_volume ?? 0;
      const searchTrend = t.search_trend_pct ?? 0;
      const opportunity = t.opportunity ?? '';
      const competitorCount = t.competitor_count ?? 0;
      let message: string;
      if (searchVolume && searchTrend) {
        message = `${formatNum(searchVolume)} people search for "${insight || cat.label}" near you monthly — trending ${searchTrend > 0 ? `up ${searchTrend}%` : `down ${Math.abs(searchTrend)}%`}. `;
        message += `Only ${competitorCount || 'a few'} competitors are targeting this. `;
        if (opportunity) message += `${opportunity}. `;
        const offer = bestOffer(merchant);
        message += offer ? `Should I position your "${formatOffer(offer)}" for these searches?` : `Should I create a ${cat.service_label} offer to capture this gap?`;
      } else {
        message = `Research insight for ${merchantName}: ${insight || 'an untapped opportunity in your area'}. `;
        if (opportunity) message += `${opportunity}. `;
        message += `Should I draft a campaign to act on this?`;
      }
      return {
        message,
        cta: `Create a campaign from this insight?`,
        send_as: cat.send_as_default,
        suppression_key: `research:${merchant.identity?.category}:${insight}:${searchVolume}`,
        rationale: `Research trigger: ${searchVolume ? `${formatNum(searchVolume)} searches, ${searchTrend > 0 ? '+' : ''}${searchTrend}% trend` : 'untapped opportunity'}. ${cat.tone} tone — data-backed.`,
      };
    }
    case 'festival': {
      const festival = t.festival_name ?? 'the upcoming festival';
      const daysUntil = t.days_until ?? 7;
      const relevantSearches = t.relevant_searches ?? 0;
      const timePhrase = daysUntil <= 1 ? 'tomorrow' : `in ${daysUntil} days`;
      let message: string;
      if (relevantSearches > 0) {
        message = `${festival} is ${timePhrase}. ${formatNum(relevantSearches)} people are already searching for ${cat.label.toLowerCase()} offers near you. `;
      } else {
        message = `${festival} is coming up ${timePhrase}. `;
      }
      const offer = bestOffer(merchant);
      if (offer) {
        message += `Should I push your "${formatOffer(offer)}" as a ${festival} special?`;
      } else {
        const pattern = cat.offer_patterns[Math.floor(Math.random() * cat.offer_patterns.length)];
        message += `Should I create a ${pattern} for ${festival}?`;
      }
      return {
        message,
        cta: `Schedule ${festival} campaign now?`,
        send_as: cat.send_as_default,
        suppression_key: `festival:${festival}:${merchant.identity?.category}:${daysUntil}`,
        rationale: `Festival trigger: ${festival} in ${timePhrase}${relevantSearches ? `, ${formatNum(relevantSearches)} active searches` : ''}. ${cat.tone} tone — seasonal relevance.`,
      };
    }
    default:
      return { message: '', cta: '', send_as: '', suppression_key: '', rationale: '' };
  }
}

// ---- API handler ----
const MAX_ACTIONS_PER_TICK = 20;

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleVeraApiNode(req: Request, pathname: string): Promise<Response | null> {
  const v1Path = pathname.replace(/^\/api/, '');
  if (!v1Path.startsWith('/v1/')) return null;
  const route = v1Path.replace('/v1/', '');

  if (route === 'healthz' && req.method === 'GET') {
    return jsonRes({
      status: 'ok',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      merchants_tracked: merchants.size,
      customers_tracked: customers.size,
      pending_actions: triggers.length,
    } as HealthResponse);
  }

  if (route === 'metadata' && req.method === 'GET') {
    return jsonRes({
      name: 'Vera',
      version: '1.0.0',
      description: 'Deterministic message engine for merchant growth — composes the next message, CTA, send-as identity, suppression key, and rationale from category, merchant, trigger, and optional customer context.',
      capabilities: ['context-ingestion', 'trigger-processing', 'deterministic-compose', 'reply-handling', 'conversation-memory', 'suppression-keys'],
      max_actions_per_tick: MAX_ACTIONS_PER_TICK,
      categories: Object.keys(CATEGORIES),
      triggers: ['recall', 'spike', 'dip', 'research', 'festival'],
    } as MetadataResponse);
  }

  if (route === 'context' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as ContextEnvelope;
    if (!body.scope || !body.context_id || body.version === undefined || !body.payload) {
      return jsonRes({ error: 'Missing required fields: scope, context_id, version, payload' }, 400);
    }
    const stored_at = new Date().toISOString();
    if (body.scope === 'merchant') {
      const existing = merchants.get(body.context_id);
      if (existing && existing.version >= body.version) {
        return jsonRes({ accepted: true, ack_id: ackId(), stored_at: existing.stored_at } as ContextResponse);
      }
      merchants.set(body.context_id, {
        context_id: body.context_id, version: body.version, payload: body.payload,
        delivered_at: body.delivered_at, stored_at,
        actions: existing?.actions ?? [],
        conversation: (body.payload as any).conversation_history ?? existing?.conversation ?? [],
        last_tick_at: existing?.last_tick_at ?? null,
      });
    } else {
      const existing = customers.get(body.context_id);
      if (existing && existing.version >= body.version) {
        return jsonRes({ accepted: true, ack_id: ackId(), stored_at: existing.stored_at } as ContextResponse);
      }
      customers.set(body.context_id, {
        context_id: body.context_id, version: body.version, payload: body.payload,
        delivered_at: body.delivered_at, stored_at,
      });
    }
    return jsonRes({ accepted: true, ack_id: ackId(), stored_at } as ContextResponse);
  }

  if (route === 'tick' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as TickRequest;
    const tickId = body.tick_id || `tick_${Date.now().toString(36)}`;
    const merchantId = body.merchant_id;

    let pending: Trigger[];
    if (merchantId) {
      pending = triggers.filter((t) => t.merchant_id === merchantId);
      const remaining = triggers.filter((t) => t.merchant_id !== merchantId);
      triggers.length = 0;
      triggers.push(...remaining);
    } else {
      pending = [...triggers];
      triggers.length = 0;
    }

    const actions: Action[] = [];
    for (const trigger of pending.slice(0, MAX_ACTIONS_PER_TICK)) {
      const mState = trigger.merchant_id ? merchants.get(trigger.merchant_id) : undefined;
      if (!mState) continue;
      const merchant = mState.payload;
      const customer = trigger.customer_id ? customers.get(trigger.customer_id)?.payload : undefined;
      const categoryId = merchant.identity?.category;
      if (!categoryId || !CATEGORIES[categoryId]) continue;

      const result = composeTrigger(trigger, merchant, customer, CATEGORIES[categoryId]);
      const action: Action = {
        ...result,
        action_id: actionId(),
        trigger_type: trigger.type,
        target: customer ? 'customer' : 'merchant',
        merchant_id: trigger.merchant_id!,
        customer_id: trigger.customer_id,
        created_at: new Date().toISOString(),
      };
      mState.actions.push(action);
      actions.push(action);
    }

    if (merchantId) {
      const m = merchants.get(merchantId);
      if (m) m.last_tick_at = new Date().toISOString();
    }

    return jsonRes({ tick_id: tickId, actions, count: actions.length } as TickResponse);
  }

  if (route === 'reply' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as ReplyRequest;
    if (!body.merchant_id || !body.reply) {
      return jsonRes({ error: 'Missing merchant_id or reply' }, 400);
    }
    const mState = merchants.get(body.merchant_id);
    if (!mState) return jsonRes({ error: 'Merchant not found' }, 404);

    const action = body.action_id
      ? mState.actions.find((a) => a.action_id === body.action_id)
      : undefined;

    mState.conversation.push({ role: 'merchant', message: body.reply, timestamp: new Date().toISOString(), action_id: body.action_id });

    const replyLower = body.reply.toLowerCase().trim();
    const positive = /^(yes|yeah|sure|ok|okay|go ahead|do it|send it|approve|confirm|haan|theek|kar do)/;
    const negative = /^(no|nope|nah|don't|skip|cancel|reject|nahi|mat)/;

    if (positive.test(replyLower)) {
      mState.conversation.push({ role: 'vera', message: `Done. I've queued the message for delivery. I'll track responses and report back.`, timestamp: new Date().toISOString() });
    } else if (negative.test(replyLower)) {
      const categoryId = mState.payload.identity?.category;
      if (categoryId && CATEGORIES[categoryId] && action) {
        const altResult = composeTrigger({ type: action.trigger_type, merchant_id: body.merchant_id, customer_id: body.customer_id, data: {} }, mState.payload, undefined, CATEGORIES[categoryId]);
        mState.conversation.push({ role: 'vera', message: `No problem. I'll hold off. Alternative: ${altResult.message} — or say "skip for now".`, timestamp: new Date().toISOString() });
      } else {
        mState.conversation.push({ role: 'vera', message: `Got it. I'll hold off and revisit next tick.`, timestamp: new Date().toISOString() });
      }
    } else {
      mState.conversation.push({ role: 'vera', message: `Noted: "${body.reply}". Want me to act on this now, or save it for next tick?`, timestamp: new Date().toISOString() });
    }

    return jsonRes({ processed: true, conversation_updated: true } as ReplyResponse);
  }

  if (route.startsWith('context/') && req.method === 'GET') {
    const contextId = route.split('/')[1];
    const m = merchants.get(contextId);
    if (m) return jsonRes({ scope: 'merchant', ...m });
    const c = customers.get(contextId);
    if (c) return jsonRes({ scope: 'customer', ...c });
    return jsonRes({ error: 'Not found' }, 404);
  }

  if (route.startsWith('actions/') && req.method === 'GET') {
    const mid = route.split('/')[1];
    const m = merchants.get(mid);
    if (!m) return jsonRes({ error: 'Merchant not found' }, 404);
    return jsonRes({ actions: m.actions, conversation: m.conversation });
  }

  if (route === 'trigger' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as Trigger;
    if (!body.type || !body.data) return jsonRes({ error: 'Missing type or data' }, 400);
    triggers.push({ ...body, delivered_at: body.delivered_at ?? new Date().toISOString() });
    return jsonRes({ accepted: true });
  }

  if (route === 'merchants' && req.method === 'GET') {
    const list = Array.from(merchants.values()).map((m) => ({
      context_id: m.context_id, name: m.payload.identity?.name, category: m.payload.identity?.category,
      area: m.payload.identity?.area, version: m.version, action_count: m.actions.length, conversation_count: m.conversation.length,
    }));
    return jsonRes({ merchants: list });
  }

  return null;
}
