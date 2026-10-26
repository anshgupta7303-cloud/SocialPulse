import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEngagementRate,
  calculateShareRate,
  calculateSaveRate,
  formatMetricPercentage,
  formatCount,
} from './metrics.ts';

test('hand-checked benchmark: reach 1000, likes 50, comments 10, shares 5, saves 35', () => {
  const input = {
    reach: 1000,
    likes: 50,
    comments: 10,
    shares: 5,
    saves: 35,
  };

  // (50 + 10 + 5 + 35) / 1000 * 100 = 100 / 1000 * 100 = 10.00%
  const engagement = calculateEngagementRate(input);
  assert.equal(engagement, 10);

  // 5 / 1000 * 100 = 0.5%
  const share = calculateShareRate(input);
  assert.equal(share, 0.5);

  // 35 / 1000 * 100 = 3.5%
  const save = calculateSaveRate(input);
  assert.equal(save, 3.5);
});

test('returns null when reach is 0, negative, null, or undefined', () => {
  assert.equal(calculateEngagementRate({ reach: 0, likes: 10, comments: 5, shares: 1, saves: 2 }), null);
  assert.equal(calculateEngagementRate({ reach: -50, likes: 10, comments: 5, shares: 1, saves: 2 }), null);
  assert.equal(calculateEngagementRate({ reach: null, likes: 10, comments: 5, shares: 1, saves: 2 }), null);
  assert.equal(calculateEngagementRate({ reach: undefined, likes: 10, comments: 5, shares: 1, saves: 2 }), null);
  assert.equal(calculateEngagementRate({ reach: NaN, likes: 10, comments: 5, shares: 1, saves: 2 }), null);

  assert.equal(calculateShareRate({ reach: 0, shares: 5 }), null);
  assert.equal(calculateShareRate({ reach: null, shares: 5 }), null);

  assert.equal(calculateSaveRate({ reach: 0, saves: 5 }), null);
  assert.equal(calculateSaveRate({ reach: undefined, saves: 5 }), null);
});

test('returns null when ANY engagement field is missing (never computes rate from fake zeros)', () => {
  // Missing comments
  assert.equal(
    calculateEngagementRate({ reach: 1000, likes: 50, comments: null, shares: 5, saves: 35 }),
    null
  );

  // Missing shares
  assert.equal(
    calculateEngagementRate({ reach: 1000, likes: 50, comments: 10, shares: null, saves: 35 }),
    null
  );

  // Missing saves
  assert.equal(
    calculateEngagementRate({ reach: 1000, likes: 50, comments: 10, shares: 5, saves: null }),
    null
  );

  // Missing likes
  assert.equal(
    calculateEngagementRate({ reach: 1000, likes: null, comments: 10, shares: 5, saves: 35 }),
    null
  );

  // Undefined field
  assert.equal(
    calculateEngagementRate({ reach: 1000, likes: 50, comments: 10, shares: undefined, saves: 35 }),
    null
  );

  // Share rate with null shares
  assert.equal(calculateShareRate({ reach: 1000, shares: null }), null);
  assert.equal(calculateShareRate({ reach: 1000, shares: undefined }), null);

  // Save rate with null saves
  assert.equal(calculateSaveRate({ reach: 1000, saves: null }), null);
  assert.equal(calculateSaveRate({ reach: 1000, saves: undefined }), null);
});

test('formatMetricPercentage and formatCount display n/a for missing data and never 0', () => {
  assert.equal(formatMetricPercentage(null), 'n/a');
  assert.equal(formatMetricPercentage(undefined), 'n/a');
  assert.equal(formatMetricPercentage(10.25), '10.25%');

  assert.equal(formatCount(null), 'n/a');
  assert.equal(formatCount(undefined), 'n/a');
  assert.equal(formatCount(12500), '12,500');
});
