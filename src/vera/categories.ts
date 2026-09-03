import type { CategoryConfig, CategoryId } from './types';

export const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  dentists: {
    id: 'dentists',
    label: 'Dental Clinic',
    tone: 'clinical-professional',
    voice: 'Reassuring, precise, health-first. Reference procedures, check-ups, and oral health outcomes. Avoid casual slang.',
    avoid: ['discount-heavy language', 'casual slang', 'urgency pressure', 'over-promising results'],
    offer_patterns: ['check-up camp', 'scaling + polishing bundle', 'consultation waiver', 'family package'],
    seasonal_moments: ['World Oral Health Day (Mar 20)', 'Dental Health Month (Oct)', 'Diwali cleaning', 'New Year resolution'],
    cta_style: 'Appointment-focused yes/no — "Shall I book slots?" or "Should I open Tuesday slots?"',
    send_as_default: 'Vera (Dental Growth Assistant)',
    unit_label: 'patients',
    service_label: 'appointment',
  },
  salons: {
    id: 'salons',
    label: 'Salon & Beauty',
    tone: 'visual-lifestyle',
    voice: 'Warm, aspirational, trend-aware. Reference looks, treatments, and seasonal styles. Use emoji sparingly for visual categories.',
    avoid: ['clinical jargon', 'over-formal language', 'medical claims'],
    offer_patterns: ['bridal package', 'festive glow look', 'hair spa + facial combo', 'buy-2-get-1'],
    seasonal_moments: ['Karva Chauth', 'Diwali', 'Wedding season (Nov-Feb)', 'Valentine\'s Day', 'Raksha Bandhan'],
    cta_style: 'Booking-focused — "Want me to block a slot?" or "Shall I send a booking link?"',
    send_as_default: 'Vera (Salon Growth Assistant)',
    unit_label: 'clients',
    service_label: 'booking',
  },
  restaurants: {
    id: 'restaurants',
    label: 'Restaurant',
    tone: 'timely-appetite-driven',
    voice: 'Conversational, appetising, time-aware. Reference dishes, meal times, and footfall. Keep it short and punchy.',
    avoid: ['health claims', 'over-formal language', 'long paragraphs'],
    offer_patterns: ['happy hour', 'buffet deal', 'combo meal', 'weekend special', 'free dessert with main course'],
    seasonal_moments: ['Weekend brunch', 'Festive thali', 'Valentine\'s dinner', 'New Year eve', 'IPL season'],
    cta_style: 'Quick yes/no — "Want me to push this to your followers?" or "Shall I schedule this for Friday?"',
    send_as_default: 'Vera (Restaurant Growth Assistant)',
    unit_label: 'diners',
    service_label: 'order',
  },
  gyms: {
    id: 'gyms',
    label: 'Gym & Fitness',
    tone: 'motivational-community',
    voice: 'Energetic, community-driven, progress-focused. Reference transformations, streaks, and membership milestones.',
    avoid: ['body-shaming language', 'medical claims', 'over-promising results', 'casual slang'],
    offer_patterns: ['first-month discount', 'buddy pass', 'transformation challenge', 'personal training trial'],
    seasonal_moments: ['New Year fitness rush (Jan)', 'Summer shred (Apr-Jun)', 'Festive fitness challenge', 'Republic Day push'],
    cta_style: 'Action-oriented — "Want me to send this to inactive members?" or "Shall I open 5 trial slots?"',
    send_as_default: 'Vera (Fitness Growth Assistant)',
    unit_label: 'members',
    service_label: 'session',
  },
  pharmacies: {
    id: 'pharmacies',
    label: 'Pharmacy',
    tone: 'utility-trust-first',
    voice: 'Clear, compliant, health-utility focused. Reference refills, availability, and essential care. No promotional hype.',
    avoid: ['promotional hype', 'discount-heavy language', 'urgency pressure', 'medical advice', 'casual slang'],
    offer_patterns: ['refill reminder', 'medicine availability alert', 'free home delivery', 'health check-up camp'],
    seasonal_moments: ['Flu season (Jul-Sep)', 'World Health Day (Apr 7)', 'Monsoon health', 'Winter immunity'],
    cta_style: 'Service-focused — "Shall I send refill reminders?" or "Want me to notify about restocked medicines?"',
    send_as_default: 'Vera (Pharmacy Growth Assistant)',
    unit_label: 'customers',
    service_label: 'order',
  },
};

export function getCategory(id: string): CategoryConfig | undefined {
  return CATEGORIES[id as CategoryId];
}

export function getAllCategoryIds(): CategoryId[] {
  return Object.keys(CATEGORIES) as CategoryId[];
}
