import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import type { RevenueConfig } from '../generators/revenue.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const STORE_WEBSITE_NAME = 'Demo Store';
export const STORE_WEBSITE_DOMAIN = 'store.example.com';

const productCategories = ['apparel', 'electronics', 'home-goods', 'accessories'];

export const storePages: PageConfig[] = [
  { path: '/', title: 'Demo Store - Home', weight: 0.2, avgTimeOnPage: 35 },
  { path: '/cart', title: 'Shopping Cart', weight: 0.1, avgTimeOnPage: 45 },
  { path: '/checkout', title: 'Checkout', weight: 0.08, avgTimeOnPage: 90 },
  { path: '/order-confirmation', title: 'Order Confirmation', weight: 0.03, avgTimeOnPage: 20 },
  ...productCategories.map(slug => ({
    path: `/category/${slug}`,
    title: `${slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`,
    weight: 0.1,
    avgTimeOnPage: 60,
  })),
  { path: '/product/wireless-headphones', title: 'Wireless Headphones', weight: 0.07, avgTimeOnPage: 75 },
  { path: '/product/running-shoes', title: 'Running Shoes', weight: 0.07, avgTimeOnPage: 75 },
  { path: '/product/desk-lamp', title: 'Desk Lamp', weight: 0.05, avgTimeOnPage: 60 },
];

export const storeJourneys: JourneyConfig[] = [
  { pages: ['/'], weight: 0.15 },
  { pages: ['/', '/category/electronics', '/product/wireless-headphones'], weight: 0.12 },
  { pages: ['/', '/category/apparel', '/product/running-shoes'], weight: 0.1 },
  {
    pages: ['/', '/category/electronics', '/product/wireless-headphones', '/cart', '/checkout'],
    weight: 0.08,
  },
  {
    pages: [
      '/',
      '/category/apparel',
      '/product/running-shoes',
      '/cart',
      '/checkout',
      '/order-confirmation',
    ],
    weight: 0.06,
  },
  { pages: ['/category/home-goods', '/product/desk-lamp'], weight: 0.1 },
  { pages: ['/category/accessories'], weight: 0.1 },
  { pages: ['/cart'], weight: 0.08 },
  { pages: ['/', '/category/home-goods'], weight: 0.11 },
  { pages: ['/', '/category/apparel'], weight: 0.1 },
];

export const storeCustomEvents: CustomEventConfig[] = [
  {
    name: 'add_to_cart',
    weight: 0.5,
    pages: [
      '/product/wireless-headphones',
      '/product/running-shoes',
      '/product/desk-lamp',
      ...productCategories.map(slug => `/category/${slug}`),
    ],
    data: {
      category: productCategories,
    },
  },
  {
    name: 'checkout_started',
    weight: 0.6,
    pages: ['/cart'],
  },
  {
    name: 'purchase',
    weight: 0.5,
    pages: ['/checkout'],
    data: {
      category: productCategories,
      revenue: [24, 49, 79, 129],
      currency: ['USD'],
    },
  },
];

export const storeRevenueConfigs: RevenueConfig[] = [
  { eventName: 'purchase', minAmount: 24, maxAmount: 49, currency: 'USD', weight: 0.6 },
  { eventName: 'purchase', minAmount: 79, maxAmount: 129, currency: 'USD', weight: 0.4 },
];

export function getStoreSiteConfig(): SiteConfig {
  return {
    hostname: STORE_WEBSITE_DOMAIN,
    pages: storePages,
    journeys: storeJourneys,
    customEvents: storeCustomEvents,
  };
}

export function getStoreJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = storeJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

export const STORE_SESSIONS_PER_DAY = 140;
