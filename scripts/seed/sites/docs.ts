import type {
  CustomEventConfig,
  JourneyConfig,
  PageConfig,
  SiteConfig,
} from '../generators/events.js';
import { type WeightedOption, weightedRandom } from '../utils.js';

export const DOCS_WEBSITE_NAME = 'Demo Docs';
export const DOCS_WEBSITE_DOMAIN = 'docs.example.com';

const docsSections = [
  'introduction',
  'quickstart',
  'authentication',
  'webhooks',
  'rate-limits',
  'sdks',
  'changelog',
];

export const docsPages: PageConfig[] = [
  { path: '/', title: 'Demo Docs - Home', weight: 0.15, avgTimeOnPage: 30 },
  { path: '/search', title: 'Search Results', weight: 0.1, avgTimeOnPage: 20 },
  ...docsSections.map(slug => ({
    path: `/docs/${slug}`,
    title: `Docs: ${slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')}`,
    weight: 0.1,
    avgTimeOnPage: 150,
  })),
];

export const docsJourneys: JourneyConfig[] = [
  { pages: ['/', '/docs/introduction', '/docs/quickstart'], weight: 0.2 },
  { pages: ['/docs/quickstart'], weight: 0.15 },
  { pages: ['/search', '/docs/authentication'], weight: 0.12 },
  { pages: ['/search', '/docs/webhooks'], weight: 0.1 },
  { pages: ['/docs/rate-limits'], weight: 0.08 },
  { pages: ['/docs/sdks', '/docs/quickstart'], weight: 0.1 },
  { pages: ['/docs/changelog'], weight: 0.1 },
  { pages: ['/'], weight: 0.15 },
];

export const docsCustomEvents: CustomEventConfig[] = [
  {
    name: 'code_copy',
    weight: 0.25,
    pages: docsSections.map(slug => `/docs/${slug}`),
    data: {
      language: ['curl', 'javascript', 'python', 'go'],
    },
  },
  {
    name: 'search_performed',
    weight: 0.3,
    pages: ['/search'],
  },
];

export function getDocsSiteConfig(): SiteConfig {
  return {
    hostname: DOCS_WEBSITE_DOMAIN,
    pages: docsPages,
    journeys: docsJourneys,
    customEvents: docsCustomEvents,
  };
}

export function getDocsJourney(): string[] {
  const journeyWeights: WeightedOption<string[]>[] = docsJourneys.map(j => ({
    value: j.pages,
    weight: j.weight,
  }));

  return weightedRandom(journeyWeights);
}

export const DOCS_SESSIONS_PER_DAY = 60;
