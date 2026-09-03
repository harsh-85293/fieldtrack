import type {
  CategoryId,
  MerchantPayload,
  CustomerPayload,
  Trigger,
  ComposeResult,
  CategoryConfig,
} from './types';
import { getCategory } from './categories';
import { composeTrigger } from './triggers';

export interface ComposeInput {
  category: CategoryId;
  merchant: MerchantPayload;
  trigger: Trigger;
  customer?: CustomerPayload;
}

export function compose(
  category: CategoryId,
  merchant: MerchantPayload,
  trigger: Trigger,
  customer?: CustomerPayload,
): ComposeResult {
  const cat: CategoryConfig | undefined = getCategory(category);
  if (!cat) {
    throw new Error(`Unknown category: ${category}`);
  }

  const result = composeTrigger({
    trigger,
    merchant,
    customer,
    category: cat,
  });

  return result;
}

export function composeFromInput(input: ComposeInput): ComposeResult {
  return compose(input.category, input.merchant, input.trigger, input.customer);
}
