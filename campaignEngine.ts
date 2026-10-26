import {
  PostMetricData,
  PostFormat,
  TargetMetric,
  TargetDirection,
  CampaignOutcome,
  CampaignVerdict,
  LabRun,
  RecommendationIdea,
} from '../types/index.ts';
import {
  calculateEngagementRate,
  calculateSaveRate,
  calculateShareRate,
  METRIC_DENOMINATORS,
} from './metrics.ts';

/**
 * Extracts or computes the numeric metric value for a given post.
 * Returns null if reach is missing, <= 0, or if relevant component is missing.
 * Never defaults to 0.
 */
export function getPostMetricValue(
  post: PostMetricData,
  targetMetric: TargetMetric
): number | null {
  if (!post) return null;

  switch (targetMetric) {
    case 'save_rate': {
      if (post.saveRate !== undefined && post.saveRate !== null) {
        return post.saveRate;
      }
      return calculateSaveRate({ reach: post.reach, saves: post.saves });
    }
    case 'engagement_rate': {
      if (post.engagementRate !== undefined && post.engagementRate !== null) {
        return post.engagementRate;
      }
      return calculateEngagementRate({
        reach: post.reach,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves,
      });
    }
    case 'share_rate': {
      if (post.shareRate !== undefined && post.shareRate !== null) {
        return post.shareRate;
      }
      return calculateShareRate({ reach: post.reach, shares: post.shares });
    }
    default:
      return null;
  }
}

/**
 * Computes baseline average for a specific format and target metric across real published posts.
 * Rules:
 * - Excludes sample data posts (isSample: true or sample ids).
 * - Excludes the linked post being evaluated (excludePostId).
 * - Matches format strictly.
 * - Only averages posts where the target metric is non-null.
 * - If count < 3, flags isThin = true ("baseline too thin to conclude anything").
 */
export function computeCampaignBaseline(
  posts: PostMetricData[],
  format: PostFormat,
  targetMetric: TargetMetric,
  excludePostId?: string | null
): {
  baselineValue: number | null;
  baselineN: number;
  isThin: boolean;
  qualifyingPostIds: string[];
} {
  const qualifyingPosts = (posts || []).filter((p) => {
    // Exclude sample data
    if (p.isSample === true) return false;
    if (typeof p.id === 'string' && (p.id.startsWith('sample-') || p.id.startsWith('post-sample'))) {
      return false;
    }
    // Exclude linked post
    if (excludePostId && p.id === excludePostId) return false;
    // Format check
    if (p.format !== format) return false;
    // Status: only evaluate against published posts
    if (p.status && p.status !== 'published') return false;

    // Check non-null metric
    const val = getPostMetricValue(p, targetMetric);
    return val !== null && !isNaN(val);
  });

  const n = qualifyingPosts.length;
  if (n === 0) {
    return {
      baselineValue: null,
      baselineN: 0,
      isThin: true,
      qualifyingPostIds: [],
    };
  }

  const sum = qualifyingPosts.reduce((acc, p) => {
    const val = getPostMetricValue(p, targetMetric) ?? 0;
    return acc + val;
  }, 0);

  const avg = Number((sum / n).toFixed(2));

  return {
    baselineValue: avg,
    baselineN: n,
    isThin: n < 3,
    qualifyingPostIds: qualifyingPosts.map((p) => p.id),
  };
}

/**
 * Evaluates the outcome of a campaign experiment in code.
 * Rules:
 * - If baselineN < 3: verdict is ALWAYS 'inconclusive' (insufficient sample size).
 * - Association, not proven cause.
 * - Computes absolute and percentage difference honestly.
 */
export function evaluateCampaignOutcome(params: {
  actualValue: number;
  baselineValue: number | null;
  baselineN: number;
  targetDirection: TargetDirection;
  targetMetric: TargetMetric;
}): CampaignOutcome {
  const { actualValue, baselineValue, baselineN, targetDirection, targetMetric } = params;

  const isBaselineThin = baselineN < 3 || baselineValue === null;

  let absoluteDiff: number | null = null;
  let percentDiff: number | null = null;

  if (baselineValue !== null) {
    absoluteDiff = Number((actualValue - baselineValue).toFixed(2));
    if (baselineValue > 0) {
      percentDiff = Number((((actualValue - baselineValue) / baselineValue) * 100).toFixed(1));
    } else {
      percentDiff = actualValue > 0 ? 100 : 0;
    }
  }

  let verdict: CampaignVerdict = 'inconclusive';
  let verdictReason = '';

  if (isBaselineThin) {
    verdict = 'inconclusive';
    verdictReason = `Baseline too thin (n=${baselineN} < 3 published ${targetMetric} records) to establish a statistically meaningful benchmark. Result noted as observed association, not proven cause.`;
  } else if (baselineValue !== null) {
    if (targetDirection === 'above_baseline') {
      if (actualValue > baselineValue) {
        verdict = 'met';
        verdictReason = `Actual ${targetMetric} (${actualValue.toFixed(2)}%) exceeded the baseline average (${baselineValue.toFixed(2)}%, n=${baselineN}) by +${(absoluteDiff ?? 0).toFixed(2)}% (+${percentDiff ?? 0}% relative).`;
      } else {
        verdict = 'not met';
        verdictReason = `Actual ${targetMetric} (${actualValue.toFixed(2)}%) did not exceed baseline average (${baselineValue.toFixed(2)}%, n=${baselineN}). Difference: ${(absoluteDiff ?? 0).toFixed(2)}%.`;
      }
    } else {
      // below_baseline
      if (actualValue < baselineValue) {
        verdict = 'met';
        verdictReason = `Actual ${targetMetric} (${actualValue.toFixed(2)}%) was below the baseline average (${baselineValue.toFixed(2)}%, n=${baselineN}) as targeted.`;
      } else {
        verdict = 'not met';
        verdictReason = `Actual ${targetMetric} (${actualValue.toFixed(2)}%) was not below baseline average (${baselineValue.toFixed(2)}%, n=${baselineN}).`;
      }
    }
  }

  const metricLabel =
    targetMetric === 'save_rate'
      ? 'Save Rate'
      : targetMetric === 'engagement_rate'
      ? 'Engagement Rate'
      : 'Share Rate';

  const denominatorInfo =
    targetMetric === 'save_rate'
      ? METRIC_DENOMINATORS.saveRate.denominator
      : targetMetric === 'engagement_rate'
      ? METRIC_DENOMINATORS.engagementRate.denominator
      : METRIC_DENOMINATORS.shareRate.denominator;

  const formula =
    targetMetric === 'save_rate'
      ? METRIC_DENOMINATORS.saveRate.formula
      : targetMetric === 'engagement_rate'
      ? METRIC_DENOMINATORS.engagementRate.formula
      : METRIC_DENOMINATORS.shareRate.formula;

  return {
    actualValue,
    baselineValue,
    baselineN,
    absoluteDiff,
    percentDiff,
    verdict,
    verdictReason,
    evaluatedAt: new Date().toISOString(),
    formula: `${metricLabel}: ${formula}`,
    denominatorInfo,
    isBaselineThin,
  };
}

/**
 * Normalizes text for duplicate detection and impact matching.
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a candidate lesson has already been retained in Hindsight for this campaign.
 * Compares against existing retained date and normalized text.
 */
export function isDuplicateLesson(
  existingRetainedText: string | null | undefined,
  existingRetainedAt: string | null | undefined,
  candidateText: string
): { isDuplicate: boolean; reason?: string } {
  if (!candidateText || candidateText.trim().length === 0) {
    return { isDuplicate: true, reason: 'Lesson draft is empty.' };
  }

  if (existingRetainedAt) {
    const normExisting = normalizeText(existingRetainedText || '');
    const normCandidate = normalizeText(candidateText);

    if (normExisting === normCandidate) {
      return {
        isDuplicate: true,
        reason: `This exact lesson was already retained into Hindsight on ${new Date(
          existingRetainedAt
        ).toLocaleDateString()}.`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Matches a retained lesson against saved Lab Runs and Content Studio ideas to measure honest impact.
 * Uses normalized text and key phrase containment (never fake/simulated).
 */
export function matchLessonImpact(
  retainedLessonText: string,
  labRuns: LabRun[],
  studioIdeas: RecommendationIdea[]
): {
  labRunsCount: number;
  matchingLabRunIds: string[];
  studioIdeasCount: number;
  matchingIdeaIds: string[];
  totalRecalls: number;
  recalledSamples: string[];
} {
  const normLesson = normalizeText(retainedLessonText);
  if (!normLesson) {
    return {
      labRunsCount: 0,
      matchingLabRunIds: [],
      studioIdeasCount: 0,
      matchingIdeaIds: [],
      totalRecalls: 0,
      recalledSamples: [],
    };
  }

  // Extract significant words (length >= 4) from the lesson to test overlap
  const lessonWords = normLesson
    .split(' ')
    .filter((w) => w.length >= 4 && !['this', 'that', 'with', 'from', 'have', 'were', 'been'].includes(w));

  const matchingLabRunIds: string[] = [];
  const recalledSamples: string[] = [];

  for (const run of labRuns || []) {
    const recalledList = run.recalled || [];
    const citedList = run.differences?.recalledMemoriesCited || [];
    const allMemories = [...recalledList, ...citedList];

    let matched = false;
    for (const mem of allMemories) {
      const normMem = normalizeText(mem);
      if (normMem.includes(normLesson) || normLesson.includes(normMem)) {
        matched = true;
        recalledSamples.push(mem);
        break;
      }
      // Check multi-word keyword intersection if length >= 3
      if (lessonWords.length >= 3) {
        const overlap = lessonWords.filter((w) => normMem.includes(w));
        if (overlap.length >= Math.min(3, lessonWords.length)) {
          matched = true;
          recalledSamples.push(mem);
          break;
        }
      }
    }

    if (matched) {
      matchingLabRunIds.push(run.id);
    }
  }

  const matchingIdeaIds: string[] = [];
  for (const idea of studioIdeas || []) {
    const memories = idea.memoriesUsed || [];
    let matched = false;

    for (const mem of memories) {
      const normMem = normalizeText(mem);
      if (normMem.includes(normLesson) || normLesson.includes(normMem)) {
        matched = true;
        break;
      }
      if (lessonWords.length >= 3) {
        const overlap = lessonWords.filter((w) => normMem.includes(w));
        if (overlap.length >= Math.min(3, lessonWords.length)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      matchingIdeaIds.push(idea.id);
    }
  }

  return {
    labRunsCount: matchingLabRunIds.length,
    matchingLabRunIds,
    studioIdeasCount: matchingIdeaIds.length,
    matchingIdeaIds,
    totalRecalls: matchingLabRunIds.length + matchingIdeaIds.length,
    recalledSamples: Array.from(new Set(recalledSamples)).slice(0, 3),
  };
}
