import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapDbRowToPost,
  mapPostToDbRow,
  mapDbRowToProfile,
  mapProfileToDbRow,
  mapDbRowToCampaign,
  mapCampaignToDbRow,
} from './db.ts';
import { getUserBankId } from './userScope.ts';

test('mapDbRowToPost: null/missing metrics stay null and NEVER convert to 0', () => {
  const dbRow = {
    id: 'test-row-1',
    user_id: 'user-123',
    external_post_id: 'ext-999',
    published_on: '2026-03-15',
    caption: 'How to scale automation in 2026',
    topic: 'Automation',
    format: 'reel',
    status: 'published',
    hook: 'Stop doing manual data entry',
    call_to_action: 'Save this guide',
    reach: null,
    impressions: null,
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    profile_visits: null,
    follows: null,
  };

  const post = mapDbRowToPost(dbRow);

  assert.equal(post.reach, null, 'Reach must remain null');
  assert.notEqual(post.reach, 0, 'Reach must NOT be converted to 0');
  assert.equal(post.impressions, null, 'Impressions must remain null');
  assert.equal(post.likes, null, 'Likes must remain null');
  assert.equal(post.comments, null, 'Comments must remain null');
  assert.equal(post.shares, null, 'Shares must remain null');
  assert.equal(post.saves, null, 'Saves must remain null');
  assert.equal(post.profileVisits, null, 'Profile visits must remain null');
  assert.equal(post.follows, null, 'Follows must remain null');

  // Computed rates must be null because reach and engagements are unavailable
  assert.equal(post.engagementRate, null, 'Engagement rate must be null when reach is null');
  assert.equal(post.shareRate, null, 'Share rate must be null when reach is null');
  assert.equal(post.saveRate, null, 'Save rate must be null when reach is null');
});

test('mapDbRowToPost: valid metric integers compute correct rates', () => {
  const dbRow = {
    id: 'test-row-2',
    user_id: 'user-123',
    external_post_id: 'ext-1000',
    published_on: '2026-03-20',
    caption: 'Top 5 AI tools',
    topic: 'Tools',
    format: 'reel',
    status: 'published',
    reach: 1000,
    impressions: 1200,
    views: 800,
    likes: 50,
    comments: 10,
    shares: 5,
    saves: 35,
    profile_visits: 20,
    follows: 4,
  };

  const post = mapDbRowToPost(dbRow);

  assert.equal(post.reach, 1000);
  assert.equal(post.likes, 50);
  assert.equal(post.comments, 10);
  assert.equal(post.shares, 5);
  assert.equal(post.saves, 35);
  // Total engagement: (50 + 10 + 5 + 35) / 1000 * 100 = 10%
  assert.equal(post.engagementRate, 10);
  // Share rate: 5 / 1000 * 100 = 0.5%
  assert.equal(post.shareRate, 0.5);
  // Save rate: 35 / 1000 * 100 = 3.5%
  assert.equal(post.saveRate, 3.5);
});

test('mapPostToDbRow: preserves null metrics and rejects negative numbers', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const clientPost = {
    externalPostId: 'ig-12345',
    date: '2026-03-25',
    caption: 'Testing metric mapping',
    format: 'carousel' as const,
    reach: null,
    impressions: undefined,
    likes: -10, // Invalid negative metric should become null
    comments: 0, // Legitimate 0 comments should be 0
    shares: null,
    saves: 15,
  };

  const dbRow = mapPostToDbRow(userId, clientPost);

  assert.equal(dbRow.user_id, userId);
  assert.equal(dbRow.reach, null, 'Null reach stays null in DB');
  assert.notEqual(dbRow.reach, 0, 'Null reach does NOT become 0 in DB');
  assert.equal(dbRow.impressions, null, 'Undefined impressions stays null');
  assert.equal(dbRow.likes, null, 'Negative likes sanitized to null');
  assert.equal(dbRow.comments, 0, 'Legitimate 0 comments is preserved');
  assert.equal(dbRow.shares, null, 'Null shares stays null');
  assert.equal(dbRow.saves, 15, 'Positive saves integer is preserved');
});

test('getUserBankId: guarantees per-user memory bank isolation', () => {
  const userA = 'd9b3e1c2-4a5f-4a6b-9c7d-8e9f0a1b2c3d';
  const userB = 'e8c4f2d3-5b6a-5b7c-0d8e-9f0a1b2c3d4e';

  const bankA = getUserBankId(userA);
  const bankB = getUserBankId(userB);

  assert.notEqual(bankA, bankB, 'Bank IDs for different users must never collide');
  assert.equal(bankA, `socialpulse-${userA}`);
  assert.equal(bankB, `socialpulse-${userB}`);

  // Test special character / case sanitization
  const userDirty = 'User_123$ABC-Test!';
  const bankDirty = getUserBankId(userDirty);
  assert.equal(bankDirty, 'socialpulse-user123abc-test', 'Must be lowercase alphanumeric + hyphens');
  assert.match(bankDirty, /^socialpulse-[a-z0-9-]+$/);
});
