/**
 * Pure metric calculation functions for Instagram growth analysis.
 * Rules:
 * - Engagement rate = (likes + comments + shares + saves) / reach * 100
 * - Share rate = shares / reach * 100
 * - Save rate = saves / reach * 100
 * - Returns null when reach is missing, null, undefined, or <= 0
 * - Never returns 0 when reach is unavailable.
 */

export interface MetricInput {
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
}

/**
 * Calculates engagement rate as a percentage of unique accounts reached.
 * Returns null if reach is missing, <= 0, or if ANY of likes, comments, shares, saves is null/undefined.
 * Never computes rates from fake zero substitutions.
 */
export function calculateEngagementRate(input: MetricInput): number | null {
  const { reach, likes, comments, shares, saves } = input;
  if (reach === undefined || reach === null || reach <= 0 || isNaN(reach)) {
    return null;
  }
  if (
    likes === undefined || likes === null || isNaN(likes) ||
    comments === undefined || comments === null || isNaN(comments) ||
    shares === undefined || shares === null || isNaN(shares) ||
    saves === undefined || saves === null || isNaN(saves)
  ) {
    return null;
  }
  const totalEngagement = likes + comments + shares + saves;
  const rate = (totalEngagement / reach) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Calculates share rate as a percentage of unique accounts reached.
 * Returns null if reach is missing or <= 0, or if shares is null/undefined.
 */
export function calculateShareRate(input: MetricInput): number | null {
  const { reach, shares } = input;
  if (reach === undefined || reach === null || reach <= 0 || isNaN(reach)) {
    return null;
  }
  if (shares === undefined || shares === null || isNaN(shares)) {
    return null;
  }
  const rate = (shares / reach) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Calculates save rate as a percentage of unique accounts reached.
 * Returns null if reach is missing or <= 0, or if saves is null/undefined.
 */
export function calculateSaveRate(input: MetricInput): number | null {
  const { reach, saves } = input;
  if (reach === undefined || reach === null || reach <= 0 || isNaN(reach)) {
    return null;
  }
  if (saves === undefined || saves === null || isNaN(saves)) {
    return null;
  }
  const rate = (saves / reach) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Human-readable explanations of formula denominators for tooltips.
 */
export const METRIC_DENOMINATORS = {
  engagementRate: {
    name: 'Engagement Rate',
    formula: '(Likes + Comments + Shares + Saves) ÷ Reach × 100',
    denominator: 'Reach (Unique accounts that saw this post)',
    explanation: 'Denominator is Reach, not Impressions or Views, measuring true percentage of people who interacted.',
  },
  shareRate: {
    name: 'Share Rate',
    formula: 'Shares ÷ Reach × 100',
    denominator: 'Reach (Unique accounts that saw this post)',
    explanation: 'Measures content virality and referral pull relative to unique audience reached.',
  },
  saveRate: {
    name: 'Save Rate',
    formula: 'Saves ÷ Reach × 100',
    denominator: 'Reach (Unique accounts that saw this post)',
    explanation: 'Measures high-value bookmarking and utility relative to unique audience reached.',
  },
  reachVsImpressions: {
    reach: 'Accounts reached (unique people)',
    impressions: 'Total display count (includes repeat views by the same person)',
    views: 'Video / Reel playthrough count',
  },
};

/**
 * Formats a metric value with safe fallback:
 * Displays 'n/a' when null/undefined (never displays 0 when metric was unavailable).
 */
export function formatMetricPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'n/a';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Formats integer counts with safe fallback:
 * Displays 'n/a' when null/undefined.
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'n/a';
  }
  return new Intl.NumberFormat('en-US').format(value);
}
