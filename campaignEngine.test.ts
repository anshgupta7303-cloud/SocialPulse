import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPostMetricValue,
  computeCampaignBaseline,
  evaluateCampaignOutcome,
  isDuplicateLesson,
  matchLessonImpact,
  normalizeText,
} from './campaignEngine.ts';
import { PostMetricData, LabRun, RecommendationIdea } from '../types/index.ts';

test('campaignEngine - getPostMetricValue correctly returns metric or null', () => {
  const postWithValidReach: PostMetricData = {
    id: 'post-1',
    date: '2026-03-01',
    caption: 'Test post',
    topic: 'Growth',
    format: 'reel',
    status: 'published',
    reach: 1000,
    impressions: 1200,
    views: 800,
    likes: 80,
    comments: 20,
    shares: 10,
    saves: 40,
    saveRate: 4.0,
    engagementRate: 15.0,
    shareRate: 1.0,
  };

  assert.equal(getPostMetricValue(postWithValidReach, 'save_rate'), 4.0);
  assert.equal(getPostMetricValue(postWithValidReach, 'engagement_rate'), 15.0);
  assert.equal(getPostMetricValue(postWithValidReach, 'share_rate'), 1.0);

  // Missing reach or zero reach should return null (never fake 0)
  const postMissingReach: PostMetricData = {
    id: 'post-2',
    date: '2026-03-02',
    caption: 'Missing reach',
    topic: 'Tech',
    format: 'reel',
    status: 'published',
    reach: null,
    impressions: 100,
    views: 50,
    likes: 10,
    comments: 2,
    shares: null,
    saves: null,
  };
  assert.equal(getPostMetricValue(postMissingReach, 'save_rate'), null);
  assert.equal(getPostMetricValue(postMissingReach, 'engagement_rate'), null);
});

test('campaignEngine - computeCampaignBaseline computes honest averages and flags thin baselines', () => {
  const posts: PostMetricData[] = [
    {
      id: 'real-1',
      date: '2026-02-01',
      caption: 'Carousel 1',
      topic: 'Design',
      format: 'carousel',
      status: 'published',
      reach: 1000,
      impressions: 1200,
      views: null,
      likes: 50,
      comments: 10,
      shares: 10,
      saves: 50,
      saveRate: 5.0,
    },
    {
      id: 'real-2',
      date: '2026-02-05',
      caption: 'Carousel 2',
      topic: 'Design',
      format: 'carousel',
      status: 'published',
      reach: 2000,
      impressions: 2400,
      views: null,
      likes: 80,
      comments: 20,
      shares: 20,
      saves: 60,
      saveRate: 3.0,
    },
    {
      id: 'real-3',
      date: '2026-02-10',
      caption: 'Carousel 3',
      topic: 'Design',
      format: 'carousel',
      status: 'published',
      reach: 1500,
      impressions: 1800,
      views: null,
      likes: 60,
      comments: 15,
      shares: 15,
      saves: 60,
      saveRate: 4.0,
    },
    // Reel (different format, must be excluded from carousel baseline)
    {
      id: 'real-reel',
      date: '2026-02-12',
      caption: 'Reel 1',
      topic: 'Design',
      format: 'reel',
      status: 'published',
      reach: 5000,
      impressions: 6000,
      views: 4000,
      likes: 200,
      comments: 50,
      shares: 50,
      saves: 200,
      saveRate: 4.0,
    },
    // Sample post (must be excluded)
    {
      id: 'sample-99',
      date: '2026-02-15',
      caption: 'Sample Carousel',
      topic: 'Design',
      format: 'carousel',
      status: 'published',
      reach: 10000,
      impressions: 12000,
      views: null,
      likes: 1000,
      comments: 200,
      shares: 200,
      saves: 1000,
      saveRate: 10.0,
      isSample: true,
    },
  ];

  // With 3 published carousels (save rates: 5.0, 3.0, 4.0 -> avg = 4.0)
  const baseline = computeCampaignBaseline(posts, 'carousel', 'save_rate');
  assert.equal(baseline.baselineValue, 4.0);
  assert.equal(baseline.baselineN, 3);
  assert.equal(baseline.isThin, false);

  // If excluding one post (e.g. linked post real-1), n becomes 2 (< 3) and isThin must be true
  const thinBaseline = computeCampaignBaseline(posts, 'carousel', 'save_rate', 'real-1');
  assert.equal(thinBaseline.baselineValue, 3.5); // (3.0 + 4.0) / 2
  assert.equal(thinBaseline.baselineN, 2);
  assert.equal(thinBaseline.isThin, true);
});

test('campaignEngine - evaluateCampaignOutcome verdict logic and thin baseline handling', () => {
  // Case 1: n >= 3, actual > baseline, target above_baseline -> 'met'
  const outcomeMet = evaluateCampaignOutcome({
    actualValue: 5.5,
    baselineValue: 4.0,
    baselineN: 4,
    targetDirection: 'above_baseline',
    targetMetric: 'save_rate',
  });
  assert.equal(outcomeMet.verdict, 'met');
  assert.equal(outcomeMet.absoluteDiff, 1.5);
  assert.equal(outcomeMet.isBaselineThin, false);

  // Case 2: n >= 3, actual <= baseline, target above_baseline -> 'not met'
  const outcomeNotMet = evaluateCampaignOutcome({
    actualValue: 3.2,
    baselineValue: 4.0,
    baselineN: 4,
    targetDirection: 'above_baseline',
    targetMetric: 'save_rate',
  });
  assert.equal(outcomeNotMet.verdict, 'not met');
  assert.equal(outcomeNotMet.absoluteDiff, -0.8);

  // Case 3: n < 3 (thin baseline) -> ALWAYS 'inconclusive'
  const outcomeInconclusive = evaluateCampaignOutcome({
    actualValue: 8.0,
    baselineValue: 3.0,
    baselineN: 2, // < 3
    targetDirection: 'above_baseline',
    targetMetric: 'save_rate',
  });
  assert.equal(outcomeInconclusive.verdict, 'inconclusive');
  assert.equal(outcomeInconclusive.isBaselineThin, true);
  assert.match(outcomeInconclusive.verdictReason, /Baseline too thin/);
});

test('campaignEngine - isDuplicateLesson prevents double retention', () => {
  const existingRetainedAt = '2026-03-01T12:00:00Z';
  const existingLesson = 'Visual slides on page 3 increase bookmark rates by +1.5% [association, not proven cause]';

  // Exact match (even with minor whitespace or punctuation differences)
  const dupCheck1 = isDuplicateLesson(existingLesson, existingRetainedAt, 'Visual slides on page 3 increase bookmark rates by +1.5% [association, not proven cause]');
  assert.equal(dupCheck1.isDuplicate, true);

  // Empty string
  const dupCheckEmpty = isDuplicateLesson(existingLesson, existingRetainedAt, '   ');
  assert.equal(dupCheckEmpty.isDuplicate, true);

  // Modified draft (different words)
  const dupCheckModified = isDuplicateLesson(existingLesson, existingRetainedAt, 'Updated conclusion: Page 3 diagrams drive save rate spikes.');
  assert.equal(dupCheckModified.isDuplicate, false);

  // Not yet retained
  const dupCheckNotRetained = isDuplicateLesson(null, null, 'First time lesson retention draft');
  assert.equal(dupCheckNotRetained.isDuplicate, false);
});

test('campaignEngine - matchLessonImpact identifies recalled references across lab runs and ideas', () => {
  const lessonText = 'Carousel slide 3 architecture diagrams yield higher saves than bullet points';

  const dummyRuns: LabRun[] = [
    {
      id: 'run-1',
      createdAt: '2026-03-02',
      taskLabel: 'Carousel Hook Test',
      inputs: {} as any,
      model: 'gemini-3.8-flash',
      temperature: 0.3,
      promptTemplateVersion: 'v1.0',
      memoryRequested: true,
      memorySucceeded: true,
      recalled: ['Carousel slide 3 architecture diagrams yield higher saves than bullet points [association, not proven cause]'],
      recalledCount: 1,
      outputA: [],
      outputB: [],
      aSucceeded: true,
      bSucceeded: true,
      errors: {},
      differences: {
        overallSimilarity: 0.6,
        ideasComparison: [],
        hashtags: { added: [], removed: [], shared: [] },
        recalledMemoriesCited: ['Carousel slide 3 architecture diagrams yield higher saves than bullet points'],
        factualSummary: [],
      },
    },
    {
      id: 'run-2',
      createdAt: '2026-03-03',
      taskLabel: 'Reel Hook Test',
      inputs: {} as any,
      model: 'gemini-3.8-flash',
      temperature: 0.3,
      promptTemplateVersion: 'v1.0',
      memoryRequested: true,
      memorySucceeded: true,
      recalled: ['Reel voiceovers must hook within first 2.5 seconds'],
      recalledCount: 1,
      outputA: [],
      outputB: [],
      aSucceeded: true,
      bSucceeded: true,
      errors: {},
      differences: {
        overallSimilarity: 0.8,
        ideasComparison: [],
        hashtags: { added: [], removed: [], shared: [] },
        recalledMemoriesCited: [],
        factualSummary: [],
      },
    },
  ];

  const dummyIdeas: RecommendationIdea[] = [
    {
      id: 'idea-101',
      topic: 'Architecture',
      hook: 'Diagram vs Text',
      caption: 'Full breakdown',
      format: 'carousel',
      callToAction: 'Save',
      hashtags: ['#tech'],
      scriptOutline: [],
      whyThisRecommendation: 'Testing diagram layout',
      memoriesUsed: ['Carousel slide 3 architecture diagrams yield higher saves than bullet points'],
      predictedHypothesis: 'Diagrams increase saves',
    },
  ];

  const impact = matchLessonImpact(lessonText, dummyRuns, dummyIdeas);
  assert.equal(impact.labRunsCount, 1);
  assert.equal(impact.matchingLabRunIds[0], 'run-1');
  assert.equal(impact.studioIdeasCount, 1);
  assert.equal(impact.matchingIdeaIds[0], 'idea-101');
  assert.equal(impact.totalRecalls, 2);
});
