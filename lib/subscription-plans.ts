import { getEnv } from './env-config';
import { 
  PLAN_MONTHLY_PRICES, 
  PLAN_YEARLY_PRICES,
} from './constants';

// Stripe Subscription Plans with environment variables
export const getSubscriptionPlans = () => ({
  LITE: {
    id: 'lite',
    name: 'Lite',
    features: [
      'features.lite.1',
      'features.lite.2',
      'features.lite.3',
      'features.lite.4',
      'features.lite.5',
      'features.lite.6',
      'features.lite.7',
      'features.lite.8',
      'features.lite.9',
    ],
    monthly: {
      priceId: getEnv('NEXT_PUBLIC_LITE_MONTHLY_PRC_ID'),
      price: PLAN_MONTHLY_PRICES.LITE,
    },
    yearly: {
      priceId: getEnv('NEXT_PUBLIC_LITE_YEARLY_PRC_ID'),
      price: PLAN_YEARLY_PRICES.LITE.price,
      savingPercent: PLAN_YEARLY_PRICES.LITE.savingPercent,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    features: ['features.pro.1', 'features.pro.2', 'features.pro.3'],
    monthly: {
      priceId: getEnv('NEXT_PUBLIC_PRO_MONTHLY_PRC_ID'),
      price: PLAN_MONTHLY_PRICES.PRO,
    },
    yearly: {
      priceId: getEnv('NEXT_PUBLIC_PRO_YEARLY_PRC_ID'),
      price: PLAN_YEARLY_PRICES.PRO.price,
      savingPercent: PLAN_YEARLY_PRICES.PRO.savingPercent,
    },
  },
});

// Export frequently used values
export const SUBSCRIPTION_PLANS = getSubscriptionPlans();