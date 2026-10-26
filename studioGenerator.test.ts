import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStudioInput,
  filterMemoriesUsed,
  extractRecalledMemories,
  formatStudioIdeas,
  ValidatedStudioInput,
} from './studioGenerator.ts';

// -------------------------------------------------------------
// 1. Input Validation Tests
// -------------------------------------------------------------
test('validateStudioInput: accepts valid inputs and normalizes fields', () => {
  const result = validateStudioInput({
    topic: 'How to scale B2B SaaS without ads',
    goal: 'increase_saves',
    format: 'carousel',
    audience: 'Early-stage founders',
    tone: 'Data-driven and crisp',
    language: 'English',
    objective: 'Test whether multi-slide carousels outperform reels',
    cta: 'Save this post to reference during your Q3 planning',
    numIdeas: 3,
    useMemory: true,
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.topic, undefined);
  assert.equal(result.sanitized?.topic, 'How to scale B2B SaaS without ads');
  assert.equal(result.sanitized?.format, 'carousel');
  assert.equal(result.sanitized?.numIdeas, 3);
  assert.equal(result.sanitized?.useMemory, true);
});

test('validateStudioInput: rejects empty and whitespace-only topics', () => {
  const emptyRes = validateStudioInput({ topic: '' });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.topic);

  const whitespaceRes = validateStudioInput({ topic: '    \n\t   ' });
  assert.equal(whitespaceRes.valid, false);
  assert.ok(whitespaceRes.errors.topic);

  const missingRes = validateStudioInput({});
  assert.equal(missingRes.valid, false);
  assert.ok(missingRes.errors.topic);
});

test('validateStudioInput: caps string lengths and clamps numIdeas to 1..5', () => {
  // Topic > 300 chars
  const longTopic = 'A'.repeat(301);
  const longTopicRes = validateStudioInput({ topic: longTopic });
  assert.equal(longTopicRes.valid, false);
  assert.ok(longTopicRes.errors.topic);

  // Objective > 1000 chars
  const longObj = 'B'.repeat(1001);
  const longObjRes = validateStudioInput({ topic: 'Valid topic', objective: longObj });
  assert.equal(longObjRes.valid, false);
  assert.ok(longObjRes.errors.objective);

  // Clamping numIdeas: 0 -> 1, 99 -> 5, -3 -> 1
  const clampLow = validateStudioInput({ topic: 'Valid', numIdeas: -5 });
  assert.equal(clampLow.valid, true);
  assert.equal(clampLow.sanitized?.numIdeas, 1);

  const clampHigh = validateStudioInput({ topic: 'Valid', numIdeas: 25 });
  assert.equal(clampHigh.valid, true);
  assert.equal(clampHigh.sanitized?.numIdeas, 5);

  const clampNormal = validateStudioInput({ topic: 'Valid', numIdeas: '4' });
  assert.equal(clampNormal.valid, true);
  assert.equal(clampNormal.sanitized?.numIdeas, 4);
});

// -------------------------------------------------------------
// 2. Strict Memory Rule: memoriesUsed is EMPTY when recall returned nothing
// -------------------------------------------------------------
test('filterMemoriesUsed: returns empty array [] when recall returned nothing, regardless of model hallucination', () => {
  const actualRecalledEmpty: string[] = [];

  // Model attempts to hallucinate or simulate memories
  const hallucinatedFromModel = [
    'Simulated Memory: Carousel posts perform best on Tuesday mornings.',
    'Memory #1: Audiences prefer short hooks under 5 words.',
    'Creators who post daily see 2x save rates.',
  ];

  const result = filterMemoriesUsed(hallucinatedFromModel, actualRecalledEmpty);
  assert.deepEqual(result, [], 'memoriesUsed MUST be an empty array when no memories were recalled');
});

test('formatStudioIdeas: guarantees memoriesUsed is [] when recalledMemories is empty', () => {
  const input: ValidatedStudioInput = {
    topic: 'Productivity Hacks',
    goal: 'increase_saves',
    format: 'reel',
    audience: 'Busy professionals',
    tone: 'Actionable',
    language: 'English',
    objective: 'Test hooks',
    cta: 'Save for later',
    numIdeas: 2,
    useMemory: true,
  };

  // Mocked Gemini response attempting to claim simulated or fabricated memories
  const mockedGeminiIdeas = [
    {
      hook: 'Stop working 12 hours a day',
      caption: 'Use time-blocking instead...',
      callToAction: 'Save for later',
      hashtags: ['#Productivity', '#TimeManagement'],
      scriptOutline: ['Intro', 'Steps', 'Outro'],
      whyThisRecommendation: 'Reels have strong bookmark rates.',
      memoriesUsed: ['Simulated Local Memory: Actionable tips get saved.'],
      predictedHypothesis: 'Test save rate.',
    },
    {
      hook: 'The 2-minute rule is a lie',
      caption: 'Here is what actually works...',
      callToAction: 'Share with a friend',
      hashtags: ['#Hacks'],
      scriptOutline: ['Step 1', 'Step 2'],
      whyThisRecommendation: 'Contrarian hooks generate interest.',
      memoriesUsed: ['Fabricated fact not in Hindsight'],
      predictedHypothesis: 'Test reach.',
    },
  ];

  // Recalled memories from Hindsight was empty!
  const emptyRecall: string[] = [];

  const formatted = formatStudioIdeas(mockedGeminiIdeas, input, emptyRecall);

  assert.equal(formatted.length, 2);
  assert.deepEqual(formatted[0].memoriesUsed, [], 'Idea 1 memoriesUsed must be empty');
  assert.deepEqual(formatted[1].memoriesUsed, [], 'Idea 2 memoriesUsed must be empty');
  assert.ok(!JSON.stringify(formatted).includes('Simulated'), 'No "Simulated" strings present');
});

test('filterMemoriesUsed: only matches genuine recalled memories and strips "Simulated" prefixes', () => {
  const actualRecalled = [
    'Carousels with direct question covers achieve 4.2% higher save rate than declarative statements.',
    'Solopreneurs engage most with spreadsheet blueprints vs Notion templates.',
  ];

  // Model response includes one matching memory, one hallucinated memory, and one with a "Simulated" prefix
  const rawModelMemories = [
    'Carousels with direct question covers achieve 4.2% higher save rate than declarative statements.',
    'Simulated Memory: Solopreneurs engage most with spreadsheet blueprints vs Notion templates.',
    'Hallucinated fact that was never stored in Hindsight memory bank.',
  ];

  const filtered = filterMemoriesUsed(rawModelMemories, actualRecalled);

  assert.equal(filtered.length, 2);
  assert.ok(filtered.includes('Carousels with direct question covers achieve 4.2% higher save rate than declarative statements.'));
  assert.ok(filtered.includes('Solopreneurs engage most with spreadsheet blueprints vs Notion templates.'));
  assert.ok(!filtered.some(m => m.includes('Hallucinated')));
  assert.ok(!filtered.some(m => m.includes('Simulated')));
});

// -------------------------------------------------------------
// 3. Extracting Memories from Hindsight Responses
// -------------------------------------------------------------
test('extractRecalledMemories: handles multiple Hindsight response shapes safely', () => {
  // Shape 1: data.memories with objects
  const shape1 = {
    data: {
      memories: [
        { content: 'Lesson 1: Reel hooks must be under 3 seconds.' },
        { content: 'Lesson 2: Question CTAs generate 2x comments.' },
      ],
    },
  };
  assert.deepEqual(extractRecalledMemories(shape1), [
    'Lesson 1: Reel hooks must be under 3 seconds.',
    'Lesson 2: Question CTAs generate 2x comments.',
  ]);

  // Shape 2: data.results with strings
  const shape2 = {
    results: [
      'Simulated Memory: Format test results.',
      'Audience prefers actionable code snippets.',
    ],
  };
  assert.deepEqual(extractRecalledMemories(shape2), [
    'Format test results.',
    'Audience prefers actionable code snippets.',
  ]);

  // Shape 3: empty / null / failure
  assert.deepEqual(extractRecalledMemories(null), []);
  assert.deepEqual(extractRecalledMemories({}), []);
  assert.deepEqual(extractRecalledMemories({ data: [] }), []);
});
