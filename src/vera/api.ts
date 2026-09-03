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
  MerchantPayload,
  CustomerPayload,
} from './types';
import {
  ingestContext,
  ingestTrigger,
  getMerchant,
  getCustomer,
  getPendingTriggers,
  clearTriggers,
  addAction,
  getAction,
  appendConversation,
  setLastTick,
  nextActionId,
  getStats,
  getAllMerchants,
} from './store';
import { compose } from './compose';
import { getAllCategoryIds } from './categories';

const MAX_ACTIONS_PER_TICK = 20;

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(req: Request): Promise<any> {
  return req.json().catch(() => ({}));
}

export async function handleVeraApi(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Match /v1/* or /api/v1/*
  const v1Path = pathname.replace(/^\/api/, '');
  if (!v1Path.startsWith('/v1/')) return null;

  const route = v1Path.replace('/v1/', '');

  // ---- GET /healthz ----
  if (route === 'healthz' && req.method === 'GET') {
    const stats = getStats();
    const res: HealthResponse = {
      status: 'ok',
      uptime: Math.floor(stats.uptime / 1000),
      merchants_tracked: stats.merchants_tracked,
      customers_tracked: stats.customers_tracked,
      pending_actions: stats.pending_triggers,
    };
    return jsonRes(res);
  }

  // ---- GET /metadata ----
  if (route === 'metadata' && req.method === 'GET') {
    const res: MetadataResponse = {
      name: 'Vera',
      version: '1.0.0',
      description: 'Deterministic message engine for merchant growth — composes the next message, CTA, send-as identity, suppression key, and rationale from category, merchant, trigger, and optional customer context.',
      capabilities: [
        'context-ingestion',
        'trigger-processing',
        'deterministic-compose',
        'reply-handling',
        'conversation-memory',
        'suppression-keys',
      ],
      max_actions_per_tick: MAX_ACTIONS_PER_TICK,
      categories: getAllCategoryIds(),
      triggers: ['recall', 'spike', 'dip', 'research', 'festival'],
    };
    return jsonRes(res);
  }

  // ---- POST /context ----
  if (route === 'context' && req.method === 'POST') {
    const body = await parseBody(req) as ContextEnvelope;
    if (!body.scope || !body.context_id || body.version === undefined) {
      return jsonRes({ error: 'Missing required fields: scope, context_id, version' }, 400);
    }
    if (!body.payload) {
      return jsonRes({ error: 'Missing payload' }, 400);
    }
    const result = ingestContext(body);
    const res: ContextResponse = {
      accepted: true,
      ack_id: result.ack_id,
      stored_at: result.stored_at,
    };
    return jsonRes(res);
  }

  // ---- POST /tick ----
  if (route === 'tick' && req.method === 'POST') {
    const body = await parseBody(req) as TickRequest;
    const tickId = body.tick_id || `tick_${Date.now().toString(36)}`;
    const merchantId = body.merchant_id;

    let triggers: Trigger[];
    if (merchantId) {
      triggers = getPendingTriggers(merchantId);
      clearTriggers(merchantId);
    } else {
      triggers = getPendingTriggers();
      clearTriggers();
    }

    const actions: Action[] = [];
    for (const trigger of triggers.slice(0, MAX_ACTIONS_PER_TICK)) {
      const merchantState = trigger.merchant_id ? getMerchant(trigger.merchant_id) : undefined;
      if (!merchantState) continue;

      const merchant = merchantState.payload;
      const customer = trigger.customer_id ? getCustomer(trigger.customer_id) : undefined;
      const customerPayload = customer?.payload;

      const categoryId = merchant.identity?.category;
      if (!categoryId) continue;

      try {
        const result = compose(categoryId, merchant, trigger, customerPayload);
        const action: Action = {
          ...result,
          action_id: nextActionId(),
          trigger_type: trigger.type,
          target: customer ? 'customer' : 'merchant',
          merchant_id: trigger.merchant_id!,
          customer_id: trigger.customer_id,
          created_at: new Date().toISOString(),
        };
        addAction(trigger.merchant_id!, action);
        actions.push(action);
      } catch {
        // skip unknown category
      }
    }

    if (merchantId) setLastTick(merchantId, new Date().toISOString());

    const res: TickResponse = {
      tick_id: tickId,
      actions,
      count: actions.length,
    };
    return jsonRes(res);
  }

  // ---- POST /reply ----
  if (route === 'reply' && req.method === 'POST') {
    const body = await parseBody(req) as ReplyRequest;
    if (!body.merchant_id || !body.reply) {
      return jsonRes({ error: 'Missing merchant_id or reply' }, 400);
    }

    const merchantState = getMerchant(body.merchant_id);
    if (!merchantState) {
      return jsonRes({ error: 'Merchant not found' }, 404);
    }

    const action = body.action_id ? getAction(body.action_id) : undefined;

    // Append merchant reply to conversation
    appendConversation(body.merchant_id, {
      role: 'merchant',
      message: body.reply,
      timestamp: new Date().toISOString(),
      action_id: body.action_id,
    });

    // Determine if a follow-up is needed based on reply content
    const replyLower = body.reply.toLowerCase().trim();
    let followUp: Action | undefined;

    const positive = /^(yes|yeah|sure|ok|okay|go ahead|do it|send it|approve|confirm|haan|theek|kar do)/;
    const negative = /^(no|nope|nah|don't|skip|cancel|reject|nahi|mat)/;

    if (positive.test(replyLower)) {
      // Merchant approved — confirm and log
      appendConversation(body.merchant_id, {
        role: 'vera',
        message: `Done. I've queued the message for delivery. I'll track responses and report back.`,
        timestamp: new Date().toISOString(),
      });
    } else if (negative.test(replyLower)) {
      // Merchant declined — acknowledge and suggest alternative
      const merchant = merchantState.payload;
      const categoryId = merchant.identity?.category;
      if (categoryId && action) {
        const altResult = compose(categoryId, merchant, {
          type: action.trigger_type,
          merchant_id: body.merchant_id,
          customer_id: body.customer_id,
          data: {},
        }, undefined);
        appendConversation(body.merchant_id, {
          role: 'vera',
          message: `No problem. I'll hold off. Here's an alternative: ${altResult.message} — or just say "skip for now" and I'll revisit next tick.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        appendConversation(body.merchant_id, {
          role: 'vera',
          message: `Got it. I'll hold off and revisit this next tick.`,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Free-form reply — acknowledge and ask for clarification
      appendConversation(body.merchant_id, {
        role: 'vera',
        message: `Noted: "${body.reply}". Want me to act on this now, or should I save it for the next tick?`,
        timestamp: new Date().toISOString(),
      });
    }

    const res: ReplyResponse = {
      processed: true,
      conversation_updated: true,
    };
    return jsonRes(res);
  }

  // ---- GET /context/:id (fetch merchant state) ----
  if (route.startsWith('context/') && req.method === 'GET') {
    const contextId = route.split('/')[1];
    const merchant = getMerchant(contextId);
    const customer = getCustomer(contextId);
    if (merchant) return jsonRes({ scope: 'merchant', ...merchant });
    if (customer) return jsonRes({ scope: 'customer', ...customer });
    return jsonRes({ error: 'Not found' }, 404);
  }

  // ---- GET /actions/:merchant_id ----
  if (route.startsWith('actions/') && req.method === 'GET') {
    const merchantId = route.split('/')[1];
    const merchant = getMerchant(merchantId);
    if (!merchant) return jsonRes({ error: 'Merchant not found' }, 404);
    return jsonRes({ actions: merchant.actions, conversation: merchant.conversation });
  }

  // ---- POST /trigger (inject a trigger for testing) ----
  if (route === 'trigger' && req.method === 'POST') {
    const body = await parseBody(req) as Trigger;
    if (!body.type || !body.data) {
      return jsonRes({ error: 'Missing type or data' }, 400);
    }
    const id = ingestTrigger(body);
    return jsonRes({ accepted: true, trigger_id: id });
  }

  // ---- GET /merchants (list all tracked merchants) ----
  if (route === 'merchants' && req.method === 'GET') {
    const merchants = getAllMerchants().map((m) => ({
      context_id: m.context_id,
      name: m.payload.identity?.name,
      category: m.payload.identity?.category,
      area: m.payload.identity?.area,
      version: m.version,
      action_count: m.actions.length,
      conversation_count: m.conversation.length,
    }));
    return jsonRes({ merchants });
  }

  return null;
}
