import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  computeTokenOverlapSimilarity,
  computeLabDifferences,
  tokenizeText,
} from './labDifferences.ts';
import {
  generateCandidateLessons,
} from './lessonEngine.ts';
import { PostMetricData } from '../types/index.ts';

describe('Stage 5 — Memory Lab & Honest Lessons Unit Tests', () => {

  describe('labDifferences: Token Overlap Similarity', () => {
    test('identical strings yield 1.0 similarity', () => {
      const s1 = 'Why 90% of Custom GPTs Fail in Week 2';
      const s2 = 'Why 90% of Custom GPTs Fail in Week 2';
      const sim = computeTokenOverlapSimilarity(s1, s2);
      assert.strictEqual(sim, 1.0);
    });

    test('case-insensitive and punctuation-insensitive matching', () => {
      const s1 = 'PROMPT ENGINEERING: 5 Tips!';
      const s2 = 'prompt engineering 5 tips';
      const sim = computeTokenOverlapSimilarity(s1, s2);
      assert.strictEqual(sim, 1.0);
    });

    test('completely disjoint strings yield 0.0 similarity', () => {
      const s1 = 'cats dogs birds fish';
      const s2 = 'car airplane train boat';
      const sim = computeTokenOverlapSimilarity(s1, s2);
      assert.strictEqual(sim, 0.0);
    });

    test('partial overlap computes correct Jaccard ratio', () => {
      // s1: {a, b, c} (3 tokens)
      // s2: {b, c, d} (3 tokens)
      // intersection: {b, c} (2), union: {a, b, c, d} (4) -> 2/4 = 0.5
      const s1 = 'alpha beta gamma';
      const s2 = 'beta gamma delta';
      const sim = computeTokenOverlapSimilarity(s1, s2);
      assert.strictEqual(sim, 0.5);
    });
  });

  describe('labDifferences: computeLabDifferences', () => {
    test('identifies hook changes, hashtag shifts, and strictly verifies recalled memories', () => {
      const outputA = [
        {
          hook: '5 Generic Tips for AI',
          caption: 'Here are standard tips to consider.',
          callToAction: 'Comment below',
          hashtags: ['#ai', '#tech', '#learning'],
          memoriesUsed: ['Hallucinated memory A'],
        },
      ];

      const outputB = [
        {
          hook: 'Why 90% of Custom GPTs Fail in Week 2',
          caption: 'Apply the 2-variable sandbox framework to prevent prompt drift.',
          callToAction: 'Comment OS for schema',
          hashtags: ['#ai', '#promptengineering', '#solopreneur'],
          memoriesUsed: ['Verified Fact #1: Visual diagrams yield 40% higher save rates', 'Fake Memory'],
        },
      ];

      const verifiedRecalled = [
        'Verified Fact #1: Visual diagrams yield 40% higher save rates',
      ];

      const diff = computeLabDifferences(outputA, outputB, verifiedRecalled);

      assert.strictEqual(diff.ideasComparison.length, 1);
      assert.strictEqual(diff.ideasComparison[0].hookChanged, true);
      assert.strictEqual(diff.ideasComparison[0].captionChanged, true);
      assert.ok(diff.overallSimilarity < 1.0);

      // Strict citation check: only 'Verified Fact #1' should be accepted; 'Fake Memory' must be dropped
      assert.strictEqual(diff.recalledMemoriesCited.length, 1);
      assert.strictEqual(diff.recalledMemoriesCited[0], verifiedRecalled[0]);

      // Hashtag diffs
      assert.ok(diff.hashtags.added.includes('promptengineering') || diff.hashtags.added.includes('#promptengineering'));
      assert.ok(diff.hashtags.removed.includes('tech') || diff.hashtags.removed.includes('#tech'));
    });

    test('if recalledMemories is empty, cited memories must strictly be empty', () => {
      const outputA = [{ hook: 'H1', caption: 'C1' }];
      const outputB = [{ hook: 'H2', caption: 'C2', memoriesUsed: ['Some memory claim'] }];

      const diff = computeLabDifferences(outputA, outputB, []);
      assert.strictEqual(diff.recalledMemoriesCited.length, 0);
      assert.strictEqual(diff.ideasComparison[0].recalledMemoriesCited.length, 0);
    });

    test('computes baseline natural variation when repeatBaseline is provided', () => {
      const outputA = [{ hook: 'Original Hook', caption: 'Original Caption' }];
      const outputB = [{ hook: 'Memory Hook', caption: 'Memory Caption' }];
      const outputAPrime = [{ hook: 'Original Hook Variation', caption: 'Original Caption' }];

      const diff = computeLabDifferences(outputA, outputB, [], outputAPrime);
      assert.ok(typeof diff.baselineSimilarity === 'number');
      assert.ok(diff.baselineSimilarity! > 0 && diff.baselineSimilarity! <= 1);
    });
  });

  describe('lessonEngine: Honest Empirical Lesson Extraction', () => {
    test('strictly ignores sample data', () => {
      const samplePosts: PostMetricData[] = [
        {
          id: 's1',
          date: '2026-01-01',
          caption: 'Sample 1',
          topic: 'AI',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 50,
          comments: 10,
          shares: 20,
          saves: 40,
          saveRate: 4.0,
          engagementRate: 12.0,
          isSample: true, // Sample data
        },
        {
          id: 's2',
          date: '2026-01-02',
          caption: 'Sample 2',
          topic: 'AI',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 50,
          comments: 10,
          shares: 20,
          saves: 40,
          saveRate: 4.0,
          engagementRate: 12.0,
          isSample: true,
        },
        {
          id: 's3',
          date: '2026-01-03',
          caption: 'Sample 3',
          topic: 'AI',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 50,
          comments: 10,
          shares: 20,
          saves: 40,
          saveRate: 4.0,
          engagementRate: 12.0,
          isSample: true,
        },
      ];

      const lessons = generateCandidateLessons(samplePosts);
      assert.strictEqual(lessons.length, 0, 'Must produce 0 lessons from sample data');
    });

    test('skips posts where the metric is null and enforces minimum group size of 3', () => {
      // 3 carousels, but 1 has saveRate = null -> valid save count is only 2 (< 3 threshold)
      const realPosts: PostMetricData[] = [
        {
          id: 'r1',
          date: '2026-02-01',
          caption: 'Post 1',
          topic: 'Engineering',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 30,
          comments: 5,
          shares: 10,
          saves: 40,
          saveRate: 4.0,
          engagementRate: 8.5,
          isSample: false,
        },
        {
          id: 'r2',
          date: '2026-02-02',
          caption: 'Post 2',
          topic: 'Engineering',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 30,
          comments: 5,
          shares: 10,
          saves: 50,
          saveRate: 5.0,
          engagementRate: 9.5,
          isSample: false,
        },
        {
          id: 'r3',
          date: '2026-02-03',
          caption: 'Post 3 (missing saves)',
          topic: 'Engineering',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1200,
          views: null,
          likes: 30,
          comments: 5,
          shares: 10,
          saves: null, // missing!
          saveRate: null, // null!
          engagementRate: 4.5,
          isSample: false,
        },
        // 3 reels with valid saves
        {
          id: 'r4',
          date: '2026-02-04',
          caption: 'Reel 1',
          topic: 'Engineering',
          format: 'reel',
          status: 'published',
          reach: 2000,
          impressions: 2500,
          views: 2400,
          likes: 40,
          comments: 10,
          shares: 10,
          saves: 20,
          saveRate: 1.0,
          engagementRate: 4.0,
          isSample: false,
        },
        {
          id: 'r5',
          date: '2026-02-05',
          caption: 'Reel 2',
          topic: 'Engineering',
          format: 'reel',
          status: 'published',
          reach: 2000,
          impressions: 2500,
          views: 2400,
          likes: 40,
          comments: 10,
          shares: 10,
          saves: 20,
          saveRate: 1.0,
          engagementRate: 4.0,
          isSample: false,
        },
        {
          id: 'r6',
          date: '2026-02-06',
          caption: 'Reel 3',
          topic: 'Engineering',
          format: 'reel',
          status: 'published',
          reach: 2000,
          impressions: 2500,
          views: 2400,
          likes: 40,
          comments: 10,
          shares: 10,
          saves: 20,
          saveRate: 1.0,
          engagementRate: 4.0,
          isSample: false,
        },
      ];

      const lessons = generateCandidateLessons(realPosts);
      // Carousels only had 2 valid saveRates, so no save_rate format lesson can be generated!
      const saveRateFormatLesson = lessons.find(l => l.metricName === 'save_rate' && l.category === 'format');
      assert.strictEqual(saveRateFormatLesson, undefined, 'Must reject comparison when cohort has < 3 valid posts');

      // But engagementRate has 3 valid carousels and 3 valid reels -> qualifying comparison
      const engRateLesson = lessons.find(l => l.metricName === 'engagement_rate' && l.category === 'format');
      assert.ok(engRateLesson, 'Must generate engagement rate lesson when both cohorts have >= 3 valid posts');
      assert.strictEqual(engRateLesson!.targetCount, 3);
      assert.strictEqual(engRateLesson!.comparisonCount, 3);
      assert.ok(engRateLesson!.limitationText.includes('association, not proven cause'));
    });

    test('generates honest lesson with date range, averages, and limitation disclaimer when cohorts >= 3', () => {
      const posts: PostMetricData[] = [];
      // 4 carousels with average saveRate 5.0%
      for (let i = 1; i <= 4; i++) {
        posts.push({
          id: `c${i}`,
          date: `2026-01-0${i}`,
          caption: `Carousel ${i}`,
          topic: 'Tech',
          format: 'carousel',
          status: 'published',
          reach: 1000,
          impressions: 1100,
          views: null,
          likes: 50,
          comments: 10,
          shares: 15,
          saves: 50,
          saveRate: 5.0,
          engagementRate: 12.5,
          isSample: false,
        });
      }

      // 4 reels with average saveRate 2.0%
      for (let i = 1; i <= 4; i++) {
        posts.push({
          id: `r${i}`,
          date: `2026-01-1${i}`,
          caption: `Reel ${i}`,
          topic: 'Tech',
          format: 'reel',
          status: 'published',
          reach: 2000,
          impressions: 2200,
          views: 2000,
          likes: 40,
          comments: 10,
          shares: 10,
          saves: 40,
          saveRate: 2.0,
          engagementRate: 5.0,
          isSample: false,
        });
      }

      const lessons = generateCandidateLessons(posts);
      assert.ok(lessons.length > 0);

      const saveLesson = lessons.find(l => l.metricName === 'save_rate');
      assert.ok(saveLesson);
      assert.strictEqual(saveLesson!.targetGroup, 'carousel');
      assert.strictEqual(saveLesson!.comparisonGroup, 'reel');
      assert.strictEqual(saveLesson!.targetAvg, 5.0);
      assert.strictEqual(saveLesson!.comparisonAvg, 2.0);
      assert.strictEqual(saveLesson!.targetCount, 4);
      assert.strictEqual(saveLesson!.comparisonCount, 4);
      assert.strictEqual(saveLesson!.dateRange.start, '2026-01-01');
      assert.strictEqual(saveLesson!.dateRange.end, '2026-01-14');
      assert.ok(saveLesson!.limitationText.includes('association, not proven cause'));
    });
  });
});
