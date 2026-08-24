import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const MARKETING_WEBSITE_NAME = 'Demo Marketing';
export const MARKETING_WEBSITE_DOMAIN = 'marketing.example.com';

export const marketingPages: PageConfig[] = [
  { path: '/', title: 'Demo Marketing - Home', weight: 0.25, avgTimeOnPage: 40 },
  { path: '/about', title: 'About Us', weight: 0.12, avgTimeOnPage: 60 },
  { path: '/services', title: 'Services', weight: 0.15, avgTimeOnPage: 75 },
  { path: '/case-studies', title: 'Case Studies', weight: 0.1, avgTimeOnPage: 120 },
  { path: '/careers', title: 'Careers', weight: 0.08, avgTimeOnPage: 90 },
  { path: '/contact', title: 'Contact', weight: 0.1, avgTimeOnPage: 45 },
  { path: '/newsletter', title: 'Newsletter Signup', weight: 0.05, avgTimeOnPage: 30 },
];

export const marketingJourneys: JourneyConfig[] = [
  { pages: ['/'], weight: 0.2 },
  { pages: ['/', '/services'], weight: 0.15 },
  { pages: ['/', '/services', '/contact'], weight: 0.12 },
  { pages: ['/', '/about'], weight: 0.1 },
  { pages: ['/case-studies'], weight: 0.1 },
  { pages: ['/', '/about', '/careers'], weight: 0.08 },
  { pages: ['/', '/newsletter'], weight: 0.08 },
  { pages: ['/services', '/case-studies', '/contact'], weight: 0.09 },
  { pages: ['/contact'], weight: 0.08 },
];

export const marketingCustomEvents: CustomEventConfig[] = [
  {
    name: 'contact_form_submitted',
    weight: 0.4,
    pages: ['/contact'],
  },
  {
    name: 'newsletter_signup',
    weight: 0.5,
    pages: ['/newsletter', '/'],
  },
];

export function getMarketingSiteConfig(): SiteConfig {
  return {
    hostname: MARKETING_WEBSITE_DOMAIN,
    pages: marketingPages,
    journeys: marketingJourneys,
    customEvents: marketingCustomEvents,
  };
}

export function getMarketingJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = marketingJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

export const MARKETING_SESSIONS_PER_DAY = 90;
