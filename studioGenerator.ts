import type { PostFormat, RecommendationIdea, StudioGenerateRequest } from '../types/index.ts';

export interface ValidatedStudioInput {
  topic: string;
  goal: string;
  format: PostFormat;
  audience: string;
  tone: string;
  language: string;
  objective: string;
  cta: string;
  numIdeas: number;
  useMemory: boolean;
  profileSummary?: {
    brandName?: string;
    niche?: string;
    targetAudience?: string;
    tone?: string;
    goals?: string;
  };
  analyticsSummary?: {
    totalPostsSampled: number;
    avgEngagementRate: number | null;
    avgShareRate: number | null;
    avgSaveRate: number | null;
    bestFormat?: string | null;
    sampleNotes?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: ValidatedStudioInput;
}

const VALID_FORMATS: Set<PostFormat> = new Set(['reel', 'carousel', 'static_image', 'story']);

/**
 * Validates and sanitizes input for /api/studio/generate.
 * - Rejects empty or whitespace-only topic
 * - Caps lengths of strings
 * - Clamps numIdeas to 1..5
 */
export function validateStudioInput(input: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  // Topic validation
  const rawTopic = typeof input.topic === 'string' ? input.topic.trim() : '';
  if (!rawTopic) {
    errors.topic = 'Content topic or theme is required and cannot be empty.';
  } else if (rawTopic.length > 300) {
    errors.topic = 'Topic exceeds maximum length of 300 characters.';
  }

  // Goal
  const rawGoal = typeof input.goal === 'string' ? input.goal.trim().slice(0, 100) : 'increase_saves';

  // Format
  let format: PostFormat = 'reel';
  if (typeof input.format === 'string' && VALID_FORMATS.has(input.format as PostFormat)) {
    format = input.format as PostFormat;
  }

  // Audience
  const audience = typeof input.audience === 'string' ? input.audience.trim().slice(0, 300) : '';

  // Tone
  const tone = typeof input.tone === 'string' ? input.tone.trim().slice(0, 300) : '';

  // Language
  const language = typeof input.language === 'string' && input.language.trim() ? input.language.trim().slice(0, 50) : 'English';

  // Objective
  const rawObjective = typeof input.objective === 'string' ? input.objective.trim() : '';
  if (rawObjective.length > 1000) {
    errors.objective = 'Objective exceeds maximum length of 1000 characters.';
  }

  // CTA
  const rawCta = typeof input.cta === 'string' ? input.cta.trim() : '';
  if (rawCta.length > 300) {
    errors.cta = 'CTA exceeds maximum length of 300 characters.';
  }

  // numIdeas clamped 1..5
  let numIdeas = 3;
  if (input.numIdeas !== undefined && input.numIdeas !== null) {
    const parsed = parseInt(String(input.numIdeas), 10);
    if (!isNaN(parsed)) {
      numIdeas = Math.max(1, Math.min(5, parsed));
    }
  }

  // useMemory boolean
  const useMemory = input.useMemory !== false;

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      topic: rawTopic,
      goal: rawGoal || 'increase_saves',
      format,
      audience,
      tone,
      language,
      objective: rawObjective,
      cta: rawCta,
      numIdeas,
      useMemory,
      profileSummary: input.profileSummary,
      analyticsSummary: input.analyticsSummary,
    },
  };
}

/**
 * Extracts plain-text memory contents from various Hindsight recall payload shapes.
 * Returns only genuine, non-empty recalled strings.
 */
export function extractRecalledMemories(recallResponse: any): string[] {
  if (!recallResponse) return [];

  const candidates: any[] = [];

  // Check data payload or top-level payload
  const root = recallResponse.data ?? recallResponse;

  if (Array.isArray(root)) {
    candidates.push(...root);
  } else if (typeof root === 'object' && root !== null) {
    if (Array.isArray(root.memories)) candidates.push(...root.memories);
    else if (Array.isArray(root.results)) candidates.push(...root.results);
    else if (Array.isArray(root.items)) candidates.push(...root.items);
    else if (Array.isArray(root.documents)) candidates.push(...root.documents);
  }

  const results: string[] = [];
  for (const item of candidates) {
    let str = '';
    if (typeof item === 'string') {
      str = item.trim();
    } else if (typeof item === 'object' && item !== null) {
      if (typeof item.content === 'string') str = item.content.trim();
      else if (typeof item.text === 'string') str = item.text.trim();
      else if (typeof item.memory === 'string') str = item.memory.trim();
      else if (typeof item.document === 'string') str = item.document.trim();
    }

    if (str && !results.includes(str)) {
      // Remove any simulated string prefix if found
      const cleaned = str.replace(/^(simulated\s*(local\s*)?memory:\s*)/i, '').trim();
      if (cleaned) {
        results.push(cleaned);
      }
    }
  }

  return results;
}

/**
 * Strict filtering for memoriesUsed in generated ideas:
 * 1. If actualRecalledMemories is empty, memoriesUsed MUST BE [] (empty array).
 * 2. If actualRecalledMemories has items, every entry in memoriesUsed must correspond to
 *    or quote an actual item in actualRecalledMemories.
 * 3. Strips any "Simulated" memory strings from real results.
 */
export function filterMemoriesUsed(
  rawMemoriesUsed: any,
  actualRecalledMemories: string[]
): string[] {
  // RULE: If recall returned nothing, memoriesUsed MUST be empty.
  if (!actualRecalledMemories || actualRecalledMemories.length === 0) {
    return [];
  }

  if (!Array.isArray(rawMemoriesUsed) || rawMemoriesUsed.length === 0) {
    return [];
  }

  const verified: string[] = [];

  for (const entry of rawMemoriesUsed) {
    if (typeof entry !== 'string') continue;
    const cleanEntry = entry.replace(/^(simulated\s*(local\s*)?memory:\s*)/i, '').trim();
    if (!cleanEntry) continue;

    // Check if cleanEntry matches or cites one of the actual recalled memories
    const matchesActual = actualRecalledMemories.some((actual) => {
      const lowerActual = actual.toLowerCase();
      const lowerClean = cleanEntry.toLowerCase();
      return (
        lowerActual.includes(lowerClean) ||
        lowerClean.includes(lowerActual) ||
        // Check for significant substring match (>20 chars)
        (cleanEntry.length > 20 && lowerActual.includes(lowerClean.slice(0, 25))) ||
        (actual.length > 20 && lowerClean.includes(lowerActual.slice(0, 25)))
      );
    });

    if (matchesActual) {
      // Store the official actual recalled memory text to prevent AI drift/hallucination
      const matched = actualRecalledMemories.find((actual) => {
        const lowerActual = actual.toLowerCase();
        const lowerClean = cleanEntry.toLowerCase();
        return (
          lowerActual.includes(lowerClean) ||
          lowerClean.includes(lowerActual) ||
          (cleanEntry.length > 20 && lowerActual.includes(lowerClean.slice(0, 25))) ||
          (actual.length > 20 && lowerClean.includes(lowerActual.slice(0, 25)))
        );
      });
      const canonical = matched || cleanEntry;
      if (!verified.includes(canonical)) {
        verified.push(canonical);
      }
    }
  }

  return verified;
}

/**
 * Builds the system instruction and user prompt for Gemini.
 */
export function buildStudioPrompt(
  input: ValidatedStudioInput,
  recalledMemories: string[]
): { systemInstruction: string; contents: string } {
  const systemInstruction = `You are the content ideation engine for SocialPulse AI, an intelligent social media growth agent for creators.
Strict Grounding Rules:
1. Ground every recommendation strictly in the supplied creator profile, client-computed performance stats, and recalled Hindsight memories.
2. Label any recommendation or tactic not directly supported by data or memories as a general best practice.
3. NEVER guarantee or promise virality, follower counts, or specific numerical engagement. Social media results are hypotheses and experiments.
4. CRITICAL MEMORY RULE: The "memoriesUsed" field for each idea MUST ONLY quote or cite memories present in the supplied RECALLED MEMORIES section below.
   - If RECALLED MEMORIES is empty or says "None", "memoriesUsed" MUST BE an empty array [] for every idea.
   - NEVER invent, simulate, or hallucinate memories or citations.`;

  const memorySection = recalledMemories.length > 0
    ? `RECALLED MEMORIES FROM HINDSIGHT CLOUD (${recalledMemories.length} verified facts):\n${recalledMemories.map((m, i) => `[Memory ${i + 1}]: "${m}"`).join('\n')}`
    : 'RECALLED MEMORIES FROM HINDSIGHT: NONE (No memories found or memory disabled). You MUST output memoriesUsed: [] for all ideas.';

  let statsSection = 'ANALYTICS SUMMARY: None provided.';
  if (input.analyticsSummary) {
    const s = input.analyticsSummary;
    statsSection = `CLIENT ANALYTICS SUMMARY (Sample size: ${s.totalPostsSampled} posts analyzed):
- Average Engagement Rate: ${s.avgEngagementRate !== null ? s.avgEngagementRate + '%' : 'n/a'}
- Average Share Rate: ${s.avgShareRate !== null ? s.avgShareRate + '%' : 'n/a'}
- Average Save Rate: ${s.avgSaveRate !== null ? s.avgSaveRate + '%' : 'n/a'}
- Best Historical Format: ${s.bestFormat || 'Not determined'}
${s.sampleNotes ? `- Notes: ${s.sampleNotes}` : ''}`;
  }

  let profileSection = 'CREATOR PROFILE: None provided.';
  if (input.profileSummary) {
    const p = input.profileSummary;
    profileSection = `CREATOR PROFILE:
- Brand Name: ${p.brandName || 'Not specified'}
- Niche: ${p.niche || 'Not specified'}
- Target Audience: ${p.targetAudience || input.audience || 'Not specified'}
- Tone: ${p.tone || input.tone || 'Not specified'}
- Stated Goals: ${p.goals || 'Not specified'}`;
  }

  const contents = `CREATIVE BRIEF:
- Topic / Core Subject: ${input.topic}
- Target Format: ${input.format.toUpperCase()}
- Optimization Goal: ${input.goal.replace(/_/g, ' ')}
- Target Audience: ${input.audience || 'General creator audience'}
- Tone of Voice: ${input.tone || 'Actionable and pragmatic'}
- Language: ${input.language}
- Experiment Objective: ${input.objective || `Test high-performing hooks and CTAs for ${input.topic}`}
- Call To Action (CTA): ${input.cta || 'Share or save for reference'}
- Number of distinct concepts requested: ${input.numIdeas}

${profileSection}

${statsSection}

${memorySection}

Generate ${input.numIdeas} distinct, highly creative, actionable content ideas for the above format.
Each idea must strictly adhere to the requested JSON schema.`;

  return { systemInstruction, contents };
}

/**
 * Normalizes raw model output ideas into strongly typed RecommendationIdea items.
 */
export function formatStudioIdeas(
  rawIdeas: any[],
  input: ValidatedStudioInput,
  recalledMemories: string[]
): RecommendationIdea[] {
  if (!Array.isArray(rawIdeas)) return [];

  return rawIdeas.slice(0, input.numIdeas).map((item, idx) => {
    const hook = typeof item.hook === 'string' && item.hook.trim()
      ? item.hook.trim()
      : `Hook #${idx + 1}: The counterintuitive truth about ${input.topic}`;

    const caption = typeof item.caption === 'string' && item.caption.trim()
      ? item.caption.trim()
      : `Here is what matters most for ${input.topic}:\n\n${input.cta}`;

    const callToAction = typeof item.callToAction === 'string' && item.callToAction.trim()
      ? item.callToAction.trim()
      : input.cta || 'Save this post for reference';

    const hashtags = Array.isArray(item.hashtags)
      ? item.hashtags.filter((h: any) => typeof h === 'string' && h.trim().length > 0).map((h: string) => h.startsWith('#') ? h : `#${h}`)
      : [`#${input.topic.replace(/\s+/g, '')}`, '#SocialPulse'];

    const scriptOutline = Array.isArray(item.scriptOutline)
      ? item.scriptOutline.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
      : ['Intro: Hook with contrasting visual', 'Body: 3 concrete actionable steps', 'Outro: Clear CTA prompt'];

    const whyThisRecommendation = typeof item.whyThisRecommendation === 'string' && item.whyThisRecommendation.trim()
      ? item.whyThisRecommendation.trim()
      : `Tailored for ${input.format} format and ${input.goal.replace(/_/g, ' ')} objective.`;

    // Strictly enforce memory filtering
    const memoriesUsed = filterMemoriesUsed(item.memoriesUsed, recalledMemories);

    const predictedHypothesis = typeof item.predictedHypothesis === 'string' && item.predictedHypothesis.trim()
      ? item.predictedHypothesis.trim()
      : `Testing whether ${input.format} with this hook increases save rate over baseline.`;

    return {
      id: `studio-gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      topic: input.topic,
      hook,
      caption,
      format: input.format,
      callToAction,
      hashtags,
      scriptOutline,
      whyThisRecommendation,
      memoriesUsed,
      predictedHypothesis,
      status: 'draft' as const,
      isSample: false,
    };
  });
}
