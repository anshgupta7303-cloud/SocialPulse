import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCSVText,
  validateAndTransformCSV,
  guessColumnMapping,
  analyzeCSVContent,
  isAccountInsightsCSV,
} from './csvParser.ts';

test('parses CSV text into headers and rows correctly with commas and quotes', () => {
  const csv = `Date,Caption,Reach,Likes,Comments\n2026-10-01,"Hello, world!",1000,50,10\n2026-10-02,"Simple post",500,20,5`;
  const { headers, rows } = parseCSVText(csv);

  assert.equal(headers.length, 5);
  assert.equal(headers[0], 'Date');
  assert.equal(rows.length, 2);
  assert.equal(rows[0][1], 'Hello, world!');
  assert.equal(rows[0][2], '1000');
});

test('invalid date rejected with clear error message', () => {
  const csv = `Date,Caption,Reach\nnot-a-valid-date,"Post with bad date",1000\n,"Post with missing date",500`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  assert.equal(result.validRows.length, 0);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors[0].message.includes('Invalid date format'));
  assert.ok(result.errors[1].message.includes('Date is required'));
});

test('missing caption AND missing externalPostId rejected', () => {
  const csv = `Date,Caption,external_post_id,Reach\n2026-10-01,,,1000`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  assert.equal(result.validRows.length, 0);
  assert.ok(result.errors.some((e) => e.field === 'caption'));
});

test('missing columns -> null (never fake zeros)', () => {
  // CSV has only Date and Caption. Likes, comments, shares, saves, reach are unmapped/missing
  const csv = `Date,Caption\n2026-10-01,"Minimal valid post"`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  assert.equal(result.errors.length, 0);
  assert.equal(result.validRows.length, 1);
  const post = result.validRows[0];
  assert.equal(post.likes, null);
  assert.equal(post.comments, null);
  assert.equal(post.shares, null);
  assert.equal(post.saves, null);
  assert.equal(post.reach, null);
  assert.equal(post.views, null);
  assert.equal(post.impressions, null);
  assert.equal(post.engagementRate, null);
});

test('empty cells (or n/a or -) -> null (never fake zeros)', () => {
  const csv = `Date,Caption,Reach,Likes,Comments,Shares,Saves\n2026-10-05,"Valid row",1000,n/a,, - ,10`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  assert.equal(result.errors.length, 0);
  assert.equal(result.validRows.length, 1);
  const post = result.validRows[0];
  assert.equal(post.likes, null);
  assert.equal(post.comments, null);
  assert.equal(post.shares, null);
  assert.equal(post.saves, 10);
  // Since likes, comments, shares are null, engagementRate must be null!
  assert.equal(post.engagementRate, null);
  // But save rate has reach 1000 and saves 10 -> 10 / 1000 * 100 = 1.00%
  assert.equal(post.saveRate, 1);
});

test('duplicates skipped by externalPostId and by date + caption', () => {
  const csv = `external_post_id,Date,Caption,Reach,Likes\nID-100,2026-10-01,"Unique post 1",1000,50\nID-100,2026-10-02,"Another title with same ID",2000,60\nID-101,2026-10-03,"Duplicate by content",1500,40\nID-102,2026-10-03,"Duplicate by content",1500,40`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  // Row 1 (ID-100) is valid
  // Row 2 has same external_post_id ID-100 -> skipped
  // Row 3 (ID-101, 2026-10-03, "Duplicate by content") is valid
  // Row 4 has same date + caption -> skipped
  assert.equal(result.validRows.length, 2);
  assert.equal(result.skippedDuplicates, 2);
});

test('missing topic becomes null (not "General")', () => {
  const csv = `Date,Caption,Topic\n2026-10-01,"Has no topic",\n2026-10-02,"Has topic","Growth Strategy"`;
  const { headers, rows } = parseCSVText(csv);
  const mapping = guessColumnMapping(headers);

  const result = validateAndTransformCSV(headers, rows, mapping);

  assert.equal(result.validRows.length, 2);
  assert.equal(result.validRows[0].topic, null);
  assert.equal(result.validRows[1].topic, 'Growth Strategy');
});

test('analyzeCSVContent: correctly extracts file info, summaries, and post results', () => {
  const csv = `Date,Caption,Topic,Format,Reach,Likes,Comments,Shares,Saves
2026-10-01,"Reel on prompt engineering",AI,reel,10000,800,100,500,300
2026-10-05,"Carousel on architecture",Tech,carousel,20000,1200,150,300,1000`;
  const analysis = analyzeCSVContent('test_metrics.csv', csv);

  assert.equal(analysis.fileName, 'test_metrics.csv');
  assert.equal(analysis.fileType, 'posts');
  assert.equal(analysis.totalPosts, 2);
  assert.equal(analysis.totalReach, 30000);
  assert.equal(analysis.totalLikes, 2000);
  assert.equal(analysis.totalSaves, 1300);
  assert.equal(analysis.formatsCount.reel, 1);
  assert.equal(analysis.formatsCount.carousel, 1);
  assert.equal(analysis.dateRange?.start, '2026-10-01');
  assert.equal(analysis.dateRange?.end, '2026-10-05');
  assert.ok(analysis.avgEngagementRate !== null);
  assert.ok(analysis.avgSaveRate !== null);
});

test('analyzeCSVContent: detects and parses account insights exports', () => {
  const accountCsv = `@irlvansh,,"Jul 27 - Oct 25, 2026",,
4K followers,,90 days,,
Reel views,,Viewers,,
32M,,12M,,
Likes,Comments,Reposts,Shares,Saves
2.2M,26K,55K,2.3M,163K
Reels,,,,
321,,,,`;
  assert.equal(isAccountInsightsCSV(accountCsv), true);
  const analysis = analyzeCSVContent('Account_insights.csv', accountCsv);

  assert.equal(analysis.fileType, 'account_insights');
  assert.ok(analysis.accountInsights);
  assert.equal(analysis.accountInsights?.handle, '@irlvansh');
  assert.equal(analysis.accountInsights?.viewersFormatted, '12M');
  assert.equal(analysis.accountInsights?.reelsCount, 321);
  assert.equal(analysis.accountInsights?.likesFormatted, '2.2M');
  assert.equal(analysis.accountInsights?.savesFormatted, '163K');
  assert.ok(analysis.validRows.length > 0);
});

