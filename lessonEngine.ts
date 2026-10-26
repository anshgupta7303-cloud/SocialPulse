import { PostMetricData, PostFormat } from '../types/index.ts';

export interface SuggestedLesson {
  id: string;
  category: 'format' | 'topic';
  targetGroup: string;
  comparisonGroup?: string;
  metricName: 'save_rate' | 'engagement_rate';
  metricLabel: string;
  targetAvg: number;
  comparisonAvg?: number;
  differencePercent?: number; // percentage difference, e.g. +133%
  targetCount: number;
  comparisonCount?: number;
  dateRange: {
    start: string;
    end: string;
  };
  lessonText: string;
  limitationText: string;
}

/**
 * Computes candidate empirical lessons strictly in code from the creator's real imported posts.
 * Rules:
 * 1. Ignores sample data completely (isSample === true).
 * 2. Skips posts where the metric is null.
 * 3. Requires at least 3 posts with valid metrics in each group to form a comparison.
 * 4. Generates honest summaries including group sizes, averages, date ranges, and a mandatory limitation disclaimer.
 */
export function generateCandidateLessons(posts: PostMetricData[]): SuggestedLesson[] {
  // 1. Strictly filter to real, non-sample posts
  const realPosts = posts.filter((p) => !p.isSample);
  if (realPosts.length === 0) return [];

  const lessons: SuggestedLesson[] = [];

  // Helper to compute date range
  const getDateRange = (subset: PostMetricData[]) => {
    const dates = subset
      .map((p) => p.date)
      .filter((d) => Boolean(d))
      .sort();
    return {
      start: dates[0] || 'Unknown',
      end: dates[dates.length - 1] || 'Unknown',
    };
  };

  // Helper for averages
  const calcAvg = (nums: number[]) => {
    if (nums.length === 0) return 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    return Math.round((sum / nums.length) * 10) / 10;
  };

  // -----------------------------------------------------------------
  // Analysis 1: Post Formats Comparison on Save Rate & Engagement Rate
  // -----------------------------------------------------------------
  const formats: PostFormat[] = ['carousel', 'reel', 'static_image', 'story'];
  const formatStats: Record<
    string,
    { saveRates: number[]; engRates: number[]; posts: PostMetricData[] }
  > = {};

  for (const f of formats) {
    formatStats[f] = { saveRates: [], engRates: [], posts: [] };
  }

  for (const post of realPosts) {
    if (formatStats[post.format]) {
      formatStats[post.format].posts.push(post);
      if (post.saveRate !== null && post.saveRate !== undefined && !isNaN(post.saveRate)) {
        formatStats[post.format].saveRates.push(post.saveRate);
      }
      if (post.engagementRate !== null && post.engagementRate !== undefined && !isNaN(post.engagementRate)) {
        formatStats[post.format].engRates.push(post.engagementRate);
      }
    }
  }

  // Find formats with >= 3 valid posts for saveRate
  const qualifyingSaveFormats = Object.entries(formatStats)
    .filter(([_, data]) => data.saveRates.length >= 3)
    .map(([fmt, data]) => ({
      format: fmt as PostFormat,
      count: data.saveRates.length,
      avg: calcAvg(data.saveRates),
      posts: data.posts,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (qualifyingSaveFormats.length >= 2) {
    const best = qualifyingSaveFormats[0];
    const second = qualifyingSaveFormats[1];

    if (best.avg > second.avg) {
      const diffPct = Math.round(((best.avg - second.avg) / (second.avg || 0.1)) * 100);
      const allCohortPosts = [...best.posts, ...second.posts];
      const dateRange = getDateRange(allCohortPosts);

      lessons.push({
        id: `lesson-fmt-save-${best.format}-${second.format}`,
        category: 'format',
        targetGroup: best.format.replace('_', ' '),
        comparisonGroup: second.format.replace('_', ' '),
        metricName: 'save_rate',
        metricLabel: 'Save Rate',
        targetAvg: best.avg,
        comparisonAvg: second.avg,
        differencePercent: diffPct,
        targetCount: best.count,
        comparisonCount: second.count,
        dateRange,
        lessonText: `Format Insight: ${best.format.replace('_', ' ')}s achieved an average Save Rate of ${best.avg}% across ${best.count} posts, outperforming ${second.format.replace('_', ' ')}s (${second.avg}% across ${second.count} posts) by ${diffPct > 0 ? `+${diffPct}%` : 'margin'}. (Data range: ${dateRange.start} to ${dateRange.end})`,
        limitationText: 'Limitation: Observed historical association, not proven cause. Topic depth or production variation may influence save rates.',
      });
    }
  }

  // Find formats with >= 3 valid posts for engagementRate
  const qualifyingEngFormats = Object.entries(formatStats)
    .filter(([_, data]) => data.engRates.length >= 3)
    .map(([fmt, data]) => ({
      format: fmt as PostFormat,
      count: data.engRates.length,
      avg: calcAvg(data.engRates),
      posts: data.posts,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (qualifyingEngFormats.length >= 2) {
    const best = qualifyingEngFormats[0];
    const second = qualifyingEngFormats[1];

    if (best.avg > second.avg) {
      const diffPct = Math.round(((best.avg - second.avg) / (second.avg || 0.1)) * 100);
      const allCohortPosts = [...best.posts, ...second.posts];
      const dateRange = getDateRange(allCohortPosts);

      lessons.push({
        id: `lesson-fmt-eng-${best.format}-${second.format}`,
        category: 'format',
        targetGroup: best.format.replace('_', ' '),
        comparisonGroup: second.format.replace('_', ' '),
        metricName: 'engagement_rate',
        metricLabel: 'Engagement Rate',
        targetAvg: best.avg,
        comparisonAvg: second.avg,
        differencePercent: diffPct,
        targetCount: best.count,
        comparisonCount: second.count,
        dateRange,
        lessonText: `Format Insight: ${best.format.replace('_', ' ')}s averaged ${best.avg}% Engagement Rate (N=${best.count} posts) compared to ${second.format.replace('_', ' ')}s at ${second.avg}% (N=${second.count} posts). (Data range: ${dateRange.start} to ${dateRange.end})`,
        limitationText: 'Limitation: Observed historical association, not proven cause. Differences in post hooks or algorithmic distribution may contribute.',
      });
    }
  }

  // -----------------------------------------------------------------
  // Analysis 2: Topics Comparison on Save Rate & Engagement Rate
  // -----------------------------------------------------------------
  const topicStats: Record<
    string,
    { saveRates: number[]; engRates: number[]; posts: PostMetricData[] }
  > = {};

  for (const post of realPosts) {
    const rawTopic = post.topic?.trim();
    if (!rawTopic) continue;

    if (!topicStats[rawTopic]) {
      topicStats[rawTopic] = { saveRates: [], engRates: [], posts: [] };
    }
    topicStats[rawTopic].posts.push(post);
    if (post.saveRate !== null && post.saveRate !== undefined && !isNaN(post.saveRate)) {
      topicStats[rawTopic].saveRates.push(post.saveRate);
    }
    if (post.engagementRate !== null && post.engagementRate !== undefined && !isNaN(post.engagementRate)) {
      topicStats[rawTopic].engRates.push(post.engagementRate);
    }
  }

  const qualifyingTopics = Object.entries(topicStats)
    .filter(([_, data]) => data.saveRates.length >= 3)
    .map(([tpc, data]) => ({
      topic: tpc,
      count: data.saveRates.length,
      avgSave: calcAvg(data.saveRates),
      avgEng: calcAvg(data.engRates),
      posts: data.posts,
    }))
    .sort((a, b) => b.avgSave - a.avgSave);

  if (qualifyingTopics.length >= 2) {
    const topTopic = qualifyingTopics[0];
    const comparisonTopic = qualifyingTopics[1];

    if (topTopic.avgSave > comparisonTopic.avgSave) {
      const diffPct = Math.round(((topTopic.avgSave - comparisonTopic.avgSave) / (comparisonTopic.avgSave || 0.1)) * 100);
      const allCohortPosts = [...topTopic.posts, ...comparisonTopic.posts];
      const dateRange = getDateRange(allCohortPosts);

      lessons.push({
        id: `lesson-topic-save-${topTopic.topic.replace(/\s+/g, '_')}`,
        category: 'topic',
        targetGroup: `Topic: "${topTopic.topic}"`,
        comparisonGroup: `Topic: "${comparisonTopic.topic}"`,
        metricName: 'save_rate',
        metricLabel: 'Save Rate',
        targetAvg: topTopic.avgSave,
        comparisonAvg: comparisonTopic.avgSave,
        differencePercent: diffPct,
        targetCount: topTopic.count,
        comparisonCount: comparisonTopic.count,
        dateRange,
        lessonText: `Topic Insight: Content focused on "${topTopic.topic}" recorded an average Save Rate of ${topTopic.avgSave}% across ${topTopic.count} posts vs "${comparisonTopic.topic}" at ${comparisonTopic.avgSave}% across ${comparisonTopic.count} posts. (Period: ${dateRange.start} to ${dateRange.end})`,
        limitationText: 'Limitation: Observed historical association, not proven cause. Sample sizes are observational and uncorrected for audience cohort shifts.',
      });
    }
  }

  return lessons;
}
