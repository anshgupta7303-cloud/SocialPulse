import { filterMemoriesUsed } from './studioGenerator.ts';

export interface IdeaDiff {
  index: number;
  hookChanged: boolean;
  hookA: string;
  hookB: string;
  captionChanged: boolean;
  captionA: string;
  captionB: string;
  hookSimilarity: number;
  captionSimilarity: number;
  recalledMemoriesCited: string[];
}

export interface LabDifferences {
  overallSimilarity: number; // 0.0 to 1.0
  baselineSimilarity?: number; // 0.0 to 1.0 (if repeatBaseline ran)
  ideasComparison: IdeaDiff[];
  hashtags: {
    added: string[];
    removed: string[];
    shared: string[];
  };
  recalledMemoriesCited: string[];
  factualSummary: string[];
  aiExplanation?: string;
}

/**
 * Tokenizes a string into normalized lower-case word tokens.
 */
export function tokenizeText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.toLowerCase().match(/[a-z0-9_#]+/g);
  return matches || [];
}

/**
 * Computes Jaccard token overlap similarity between two strings: |A ∩ B| / |A ∪ B|.
 * Returns 1.0 if both are empty or identical, 0.0 if completely disjoint.
 */
export function computeTokenOverlapSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);

  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...setA, ...setB]).size;
  if (unionCount === 0) return 1.0;

  const similarity = intersectionCount / unionCount;
  return Math.round(similarity * 1000) / 1000;
}

/**
 * Computes structural and textual differences between Test A (no memory) and Test B (with memory) in pure code.
 * Strictly verifies memory citations against actual Hindsight recall array.
 */
export function computeLabDifferences(
  outputA: any[],
  outputB: any[],
  recalledMemories: string[],
  baselineOutputA?: any[]
): LabDifferences {
  const safeA = Array.isArray(outputA) ? outputA : [];
  const safeB = Array.isArray(outputB) ? outputB : [];
  const safeBaseline = Array.isArray(baselineOutputA) ? baselineOutputA : [];

  const maxIdeas = Math.max(safeA.length, safeB.length);
  const ideasComparison: IdeaDiff[] = [];
  const allCitedMemories: Set<string> = new Set();

  let totalSimSum = 0;
  let simCount = 0;

  for (let i = 0; i < maxIdeas; i++) {
    const itemA = safeA[i] || {};
    const itemB = safeB[i] || {};

    const hookA = typeof itemA.hook === 'string' ? itemA.hook.trim() : '';
    const hookB = typeof itemB.hook === 'string' ? itemB.hook.trim() : '';
    const captionA = typeof itemA.caption === 'string' ? itemA.caption.trim() : '';
    const captionB = typeof itemB.caption === 'string' ? itemB.caption.trim() : '';

    const hookSim = computeTokenOverlapSimilarity(hookA, hookB);
    const captionSim = computeTokenOverlapSimilarity(captionA, captionB);

    totalSimSum += (hookSim + captionSim) / 2;
    simCount++;

    // Strict citation filtering: only memories verified in recalledMemories are accepted
    const rawCitations = Array.isArray(itemB.memoriesUsed) ? itemB.memoriesUsed : [];
    const verifiedCitations = filterMemoriesUsed(rawCitations, recalledMemories);
    verifiedCitations.forEach((m) => allCitedMemories.add(m));

    ideasComparison.push({
      index: i + 1,
      hookChanged: hookA !== hookB,
      hookA,
      hookB,
      captionChanged: captionA !== captionB,
      captionA,
      captionB,
      hookSimilarity: hookSim,
      captionSimilarity: captionSim,
      recalledMemoriesCited: verifiedCitations,
    });
  }

  const overallSimilarity = simCount > 0 ? Math.round((totalSimSum / simCount) * 1000) / 1000 : 1.0;

  // Optional: compute baseline variation (A vs A') if repeatBaseline was provided
  let baselineSimilarity: number | undefined;
  if (safeBaseline.length > 0 && safeA.length > 0) {
    let baseSimSum = 0;
    const baseCount = Math.max(safeA.length, safeBaseline.length);
    for (let i = 0; i < baseCount; i++) {
      const a = safeA[i] || {};
      const aPrime = safeBaseline[i] || {};
      const hA = typeof a.hook === 'string' ? a.hook : '';
      const hAPrime = typeof aPrime.hook === 'string' ? aPrime.hook : '';
      const cA = typeof a.caption === 'string' ? a.caption : '';
      const cAPrime = typeof aPrime.caption === 'string' ? aPrime.caption : '';
      baseSimSum += (computeTokenOverlapSimilarity(hA, hAPrime) + computeTokenOverlapSimilarity(cA, cAPrime)) / 2;
    }
    baselineSimilarity = Math.round((baseSimSum / baseCount) * 1000) / 1000;
  }

  // Extract hashtags added, removed, shared
  const tagsA = new Set<string>();
  safeA.forEach((item) => {
    if (Array.isArray(item.hashtags)) {
      item.hashtags.forEach((t: string) => {
        if (typeof t === 'string' && t.trim()) tagsA.add(t.trim().toLowerCase());
      });
    }
  });

  const tagsB = new Set<string>();
  safeB.forEach((item) => {
    if (Array.isArray(item.hashtags)) {
      item.hashtags.forEach((t: string) => {
        if (typeof t === 'string' && t.trim()) tagsB.add(t.trim().toLowerCase());
      });
    }
  });

  const sharedTags: string[] = [];
  const addedTags: string[] = [];
  const removedTags: string[] = [];

  for (const tag of tagsB) {
    if (tagsA.has(tag)) sharedTags.push(tag);
    else addedTags.push(tag);
  }
  for (const tag of tagsA) {
    if (!tagsB.has(tag)) removedTags.push(tag);
  }

  // Generate factual, code-computed summary bullets
  const factualSummary: string[] = [];
  const hooksChangedCount = ideasComparison.filter((d) => d.hookChanged).length;
  factualSummary.push(
    `${hooksChangedCount} of ${ideasComparison.length} hooks changed between baseline and memory-augmented generation.`
  );

  factualSummary.push(
    `Lexical token overlap similarity between Test A and Test B: ${(overallSimilarity * 100).toFixed(1)}%.`
  );

  if (baselineSimilarity !== undefined) {
    factualSummary.push(
      `Baseline natural variation (Test A vs Test A' repeat): ${(baselineSimilarity * 100).toFixed(1)}% token similarity.`
    );
  }

  if (allCitedMemories.size > 0) {
    factualSummary.push(
      `${allCitedMemories.size} unique verified Hindsight memories were cited in the memory-augmented concepts.`
    );
  } else if (recalledMemories.length > 0) {
    factualSummary.push(
      `Hindsight recalled ${recalledMemories.length} memories, but none were explicitly cited in Test B ideas.`
    );
  } else {
    factualSummary.push('No memories were available during this run; Test B operated without recalled facts.');
  }

  if (addedTags.length > 0 || removedTags.length > 0) {
    factualSummary.push(
      `Hashtag shift: +${addedTags.length} new tags added, -${removedTags.length} removed.`
    );
  }

  return {
    overallSimilarity,
    baselineSimilarity,
    ideasComparison,
    hashtags: {
      added: addedTags,
      removed: removedTags,
      shared: sharedTags,
    },
    recalledMemoriesCited: Array.from(allCitedMemories),
    factualSummary,
  };
}
