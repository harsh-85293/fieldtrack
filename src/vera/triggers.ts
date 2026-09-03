import type { Trigger, MerchantPayload, CustomerPayload, CategoryConfig, ComposeResult } from './types';

interface TriggerContext {
  trigger: Trigger;
  merchant: MerchantPayload;
  customer?: CustomerPayload;
  category: CategoryConfig;
}

function bestOffer(merchant: MerchantPayload) {
  const active = merchant.offers?.filter((o) => o.active !== false);
  const pool = active?.length ? active : merchant.offers;
  if (!pool || pool.length === 0) return undefined;
  return pool[0];
}

function formatOffer(offer: { title: string; discount_pct?: number; flat_amount?: number }): string {
  let s = offer.title;
  if (offer.discount_pct) s += ` (${offer.discount_pct}% off)`;
  else if (offer.flat_amount) s += ` (₹${offer.flat_amount} off)`;
  return s;
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatNumber(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ---- RECALL ----
function composeRecall(ctx: TriggerContext): ComposeResult {
  const { trigger, merchant, customer, category } = ctx;
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const days = t.days_inactive ?? (t.last_visit_date ? daysSince(t.last_visit_date) : 30);

  const offer = bestOffer(merchant);
  const lastService = t.last_service ?? (customer?.relationship?.preferred_services?.[0] ?? category.service_label);

  let message: string;
  if (customer) {
    const name = customer.identity?.name ?? 'there';
    if (days > 90) {
      message = `${name} hasn't visited ${merchantName} in ${days} days. Their last ${category.service_label} was ${lastService}. `;
      if (offer) {
        message += `Should I send them a ${formatOffer(offer)} to bring them back?`;
      } else {
        message += `Should I send a "we miss you" message with a complimentary ${category.service_label} reminder?`;
      }
    } else if (days > 30) {
      message = `${name} is due for a ${lastService} — it's been ${days} days since their last visit to ${merchantName}. `;
      if (offer) {
        message += `Want me to send a ${formatOffer(offer)} nudge?`;
      } else {
        message += `Want me to send a gentle follow-up reminder?`;
      }
    } else {
      message = `${name} visited ${days} days ago for ${lastService}. Should I send a check-in asking how things went?`;
    }
  } else {
    const inactiveCount = merchant.performance?.active_customers
      ? Math.floor(merchant.performance.active_customers * 0.3)
      : 12;
    message = `${inactiveCount} ${category.unit_label} haven't visited ${merchantName} in ${days}+ days. `;
    if (offer) {
      message += `Should I send them a ${formatOffer(offer)} recall campaign?`;
    } else {
      message += `Should I send a recall campaign with a complimentary ${category.service_label}?`;
    }
  }

  const cta = customer
    ? `Send ${customer.identity?.name ?? 'them'} a recall message now?`
    : `Launch recall campaign to ${category.unit_label}?`;

  return {
    message,
    cta,
    send_as: category.send_as_default,
    suppression_key: `recall:${merchant.identity?.category}:${merchant.identity?.name}:${customer?.identity?.phone ?? 'all'}:${days}`,
    rationale: `Recall trigger: ${days} days of inactivity${customer ? ` for ${customer.identity?.name ?? 'a customer'}` : ' across inactive base'}. ${category.tone} tone with ${offer ? 'active offer' : 'soft nudge'} as the pull-back lever.`,
  };
}

// ---- SPIKE ----
function composeSpike(ctx: TriggerContext): ComposeResult {
  const { trigger, merchant, category } = ctx;
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const metric = t.metric ?? 'searches';
  const change = t.change_pct ?? 0;
  const searchTerm = t.search_term ?? '';
  const absVal = t.absolute_value ?? 0;

  let message: string;
  if (searchTerm) {
    const searches = absVal || t.search_volume || 0;
    message = `${formatNumber(searches)} people in your area are searching for "${searchTerm}" right now — up ${change}% this week. `;
    const offer = bestOffer(merchant);
    if (offer) {
      message += `Should I push your "${formatOffer(offer)}" to capture this demand?`;
    } else {
      message += `Should I create a quick ${category.service_label} offer to capture these searches?`;
    }
  } else if (metric === 'orders' || metric === 'revenue') {
    message = `${merchantName} saw a ${change}% spike in ${metric} this week${absVal ? ` (${formatNumber(absVal)} ${metric})` : ''}. `;
    message += `Want me to amplify this with a "trending this week" push to nearby ${category.unit_label}?`;
  } else {
    message = `There's a ${change}% spike in ${metric} for ${merchantName}. Should I turn this into a momentum campaign?`;
  }

  return {
    message,
    cta: `Push this to nearby ${category.unit_label} now?`,
    send_as: category.send_as_default,
    suppression_key: `spike:${merchant.identity?.category}:${metric}:${searchTerm}:${change}`,
    rationale: `Spike trigger: ${change}% increase in ${metric}${searchTerm ? ` for "${searchTerm}"` : ''}. ${category.tone} tone — surfacing real demand with a single capture-the-moment CTA.`,
  };
}

// ---- DIP ----
function composeDip(ctx: TriggerContext): ComposeResult {
  const { trigger, merchant, category } = ctx;
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const drop = t.drop_pct ?? 0;
  const competitorName = t.competitor_name ?? '';
  const competitorOffer = t.competitor_offer ?? '';

  let message: string;
  if (competitorName && competitorOffer) {
    message = `${merchantName} is down ${drop}% this week. ${competitorName} nearby is running "${competitorOffer}". `;
    const offer = bestOffer(merchant);
    if (offer) {
      message += `Should I counter with your "${formatOffer(offer)}"?`;
    } else {
      message += `Should I create a counter-offer to win back ${category.unit_label}?`;
    }
  } else {
    message = `${merchantName} is down ${drop}% in orders this week. `;
    const offer = bestOffer(merchant);
    if (offer) {
      message += `Should I activate your "${formatOffer(offer)}" to recover the dip?`;
    } else {
      message += `Should I send a recovery campaign to your recent ${category.unit_label}?`;
    }
  }

  return {
    message,
    cta: `Activate recovery campaign now?`,
    send_as: category.send_as_default,
    suppression_key: `dip:${merchant.identity?.category}:${merchant.identity?.name}:${drop}`,
    rationale: `Dip trigger: ${drop}% decline${competitorName ? ` vs ${competitorName}'s "${competitorOffer}"` : ''}. ${category.tone} tone — defensive recovery with a counter-offer, not panic pricing.`,
  };
}

// ---- RESEARCH ----
function composeResearch(ctx: TriggerContext): ComposeResult {
  const { trigger, merchant, category } = ctx;
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const insight = t.insight ?? '';
  const searchVolume = t.search_volume ?? 0;
  const searchTrend = t.search_trend_pct ?? 0;
  const opportunity = t.opportunity ?? '';
  const competitorCount = t.competitor_count ?? 0;

  let message: string;
  if (searchVolume && searchTrend) {
    message = `${formatNumber(searchVolume)} people search for "${insight || category.label}" near you monthly — trending ${searchTrend > 0 ? `up ${searchTrend}%` : `down ${Math.abs(searchTrend)}%`}. `;
    message += `Only ${competitorCount || 'a few'} competitors are targeting this. `;
    if (opportunity) {
      message += `${opportunity}. `;
    }
    const offer = bestOffer(merchant);
    if (offer) {
      message += `Should I position your "${formatOffer(offer)}" for these searches?`;
    } else {
      message += `Should I create a ${category.service_label} offer to capture this gap?`;
    }
  } else {
    message = `Research insight for ${merchantName}: ${insight || 'an untapped opportunity in your area'}. `;
    if (opportunity) message += `${opportunity}. `;
    message += `Should I draft a campaign to act on this?`;
  }

  return {
    message,
    cta: `Create a campaign from this insight?`,
    send_as: category.send_as_default,
    suppression_key: `research:${merchant.identity?.category}:${insight}:${searchVolume}`,
    rationale: `Research trigger: ${searchVolume ? `${formatNumber(searchVolume)} searches, ${searchTrend > 0 ? '+' : ''}${searchTrend}% trend` : 'untapped opportunity'}. ${category.tone} tone — data-backed, specific numbers, no vague claims.`,
  };
}

// ---- FESTIVAL ----
function composeFestival(ctx: TriggerContext): ComposeResult {
  const { trigger, merchant, category } = ctx;
  const t = trigger.data;
  const merchantName = merchant.identity?.name ?? 'your business';
  const festival = t.festival_name ?? 'the upcoming festival';
  const daysUntil = t.days_until ?? 7;
  const relevantSearches = t.relevant_searches ?? 0;

  // Check if festival is in the category's seasonal moments
  const seasonalMatch = category.seasonal_moments.find((s) =>
    festival.toLowerCase().includes(s.toLowerCase().split(' ')[0]),
  );

  let message: string;
  const timePhrase = daysUntil <= 1 ? 'tomorrow' : daysUntil <= 3 ? `in ${daysUntil} days` : `in ${daysUntil} days`;

  if (relevantSearches > 0) {
    message = `${festival} is ${timePhrase}. ${formatNumber(relevantSearches)} people are already searching for ${category.label.toLowerCase()} offers near you. `;
  } else {
    message = `${festival} is coming up ${timePhrase}. `;
  }

  const offer = bestOffer(merchant);
  if (offer) {
    message += `Should I push your "${formatOffer(offer)}" as a ${festival} special?`;
  } else {
    const pattern = category.offer_patterns[Math.floor(Math.random() * category.offer_patterns.length)];
    message += `Should I create a ${pattern} for ${festival}?`;
  }

  return {
    message,
    cta: `Schedule ${festival} campaign now?`,
    send_as: category.send_as_default,
    suppression_key: `festival:${festival}:${merchant.identity?.category}:${daysUntil}`,
    rationale: `Festival trigger: ${festival} in ${timePhrase}${seasonalMatch ? ` — matches ${category.label} seasonal calendar` : ''}${relevantSearches ? `, ${formatNumber(relevantSearches)} active searches` : ''}. ${category.tone} tone — seasonal relevance with a timely offer.`,
  };
}

export function composeTrigger(ctx: TriggerContext): ComposeResult {
  switch (ctx.trigger.type) {
    case 'recall':
      return composeRecall(ctx);
    case 'spike':
      return composeSpike(ctx);
    case 'dip':
      return composeDip(ctx);
    case 'research':
      return composeResearch(ctx);
    case 'festival':
      return composeFestival(ctx);
    default:
      return composeRecall(ctx);
  }
}
