import { supabase } from './supabaseClient.ts';
import type {
  PostMetricData,
  CreatorProfile,
  RecommendationIdea,
  Campaign,
  MemoryEvent,
  ContentStatus,
  PostFormat,
  LabRun,
  LabRatings,
} from '../types/index.ts';
import { calculateEngagementRate, calculateShareRate, calculateSaveRate } from './metrics.ts';

// -------------------------------------------------------------
// Pure Row Mappers (Strict Rule: unavailable metrics stay null, never 0)
// -------------------------------------------------------------

/**
 * Maps a database row from `posts` to client `PostMetricData`.
 * Guarantees unavailable metrics stay null and never convert to 0.
 */
export function mapDbRowToPost(row: any): PostMetricData {
  const sanitizeMetric = (val: any): number | null => {
    if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
      return null;
    }
    const num = Math.floor(Number(val));
    return num >= 0 ? num : null;
  };

  const reach = sanitizeMetric(row.reach);
  const impressions = sanitizeMetric(row.impressions);
  const views = sanitizeMetric(row.views);
  const likes = sanitizeMetric(row.likes);
  const comments = sanitizeMetric(row.comments);
  const shares = sanitizeMetric(row.shares);
  const saves = sanitizeMetric(row.saves);
  const profileVisits = sanitizeMetric(row.profile_visits);
  const follows = sanitizeMetric(row.follows);

  // Compute derived rates using official metrics formulas (returns null when reach is null/0)
  const metricInput = { reach, likes, comments, shares, saves };
  const engagementRate = calculateEngagementRate(metricInput);
  const shareRate = calculateShareRate({ reach, shares });
  const saveRate = calculateSaveRate({ reach, saves });

  return {
    id: row.id,
    externalPostId: row.external_post_id || null,
    date: row.published_on ? String(row.published_on).slice(0, 10) : new Date().toISOString().slice(0, 10),
    caption: row.caption || '',
    topic: row.topic || null,
    format: (row.format || 'reel') as PostFormat,
    status: (row.status || 'published') as ContentStatus,
    reach,
    impressions,
    views,
    likes,
    comments,
    shares,
    saves,
    profileVisits,
    follows,
    hook: row.hook || null,
    callToAction: row.call_to_action || null,
    engagementRate,
    shareRate,
    saveRate,
    isSample: false,
  };
}

/**
 * Maps a client `PostMetricData` item to database row for `posts`.
 * Ensures null stays null, never converted to zero.
 */
export function mapPostToDbRow(userId: string, p: Partial<PostMetricData>): any {
  const sanitizeDbInt = (val: any): number | null => {
    if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
      return null;
    }
    const num = Math.floor(Number(val));
    return num >= 0 ? num : null;
  };

  return {
    user_id: userId,
    external_post_id: p.externalPostId?.trim() || null,
    published_on: p.date || new Date().toISOString().slice(0, 10),
    caption: p.caption?.trim() || '',
    topic: p.topic?.trim() || null,
    format: p.format || 'reel',
    status: p.status || 'published',
    hook: p.hook?.trim() || null,
    call_to_action: p.callToAction?.trim() || null,
    reach: sanitizeDbInt(p.reach),
    impressions: sanitizeDbInt(p.impressions),
    views: sanitizeDbInt(p.views),
    likes: sanitizeDbInt(p.likes),
    comments: sanitizeDbInt(p.comments),
    shares: sanitizeDbInt(p.shares),
    saves: sanitizeDbInt(p.saves),
    profile_visits: sanitizeDbInt(p.profileVisits),
    follows: sanitizeDbInt(p.follows),
    metrics_collected_on: new Date().toISOString(),
  };
}

export function mapDbRowToProfile(row: any): CreatorProfile {
  return {
    brandName: row?.brand_name || '',
    instagramHandle: row?.instagram_handle || '',
    niche: row?.niche || '',
    targetAudience: row?.target_audience || '',
    preferredFormats: Array.isArray(row?.preferred_formats) ? row.preferred_formats : ['reel'],
    tone: row?.tone || '',
    goals: row?.goals || '',
  };
}

export function mapProfileToDbRow(userId: string, p: Partial<CreatorProfile>): any {
  return {
    user_id: userId,
    brand_name: p.brandName || '',
    instagram_handle: p.instagramHandle || '',
    niche: p.niche || '',
    target_audience: p.targetAudience || '',
    preferred_formats: p.preferredFormats || ['reel'],
    tone: p.tone || '',
    goals: p.goals || '',
  };
}

export function mapDbRowToIdea(row: any): RecommendationIdea {
  return {
    id: row.id,
    topic: row.topic,
    format: row.format as PostFormat,
    hook: row.hook,
    caption: row.caption,
    callToAction: row.call_to_action,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    scriptOutline: Array.isArray(row.script_outline) ? row.script_outline : [],
    whyThisRecommendation: row.why_recommended || '',
    memoriesUsed: Array.isArray(row.memories_used) ? row.memories_used : [],
    predictedHypothesis: `Status: ${row.status}. Format: ${row.format}.`,
    status: (row.status || 'draft') as ContentStatus,
    isSample: false,
  };
}

export function mapIdeaToDbRow(userId: string, idea: RecommendationIdea): any {
  return {
    user_id: userId,
    topic: idea.topic,
    format: idea.format,
    hook: idea.hook,
    caption: idea.caption,
    call_to_action: idea.callToAction,
    hashtags: idea.hashtags || [],
    script_outline: idea.scriptOutline || [],
    why_recommended: idea.whyThisRecommendation || '',
    memories_used: idea.memoriesUsed || [],
    status: idea.status || 'draft',
    model: 'gemini-3.8-flash',
    generated_at: new Date().toISOString(),
  };
}

export function mapDbRowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective || '',
    hypothesis: row.hypothesis || '',
    format: (row.format || 'reel') as PostFormat,
    topic: row.topic || '',
    plannedDate: row.planned_date || '',
    expectedOutcome: row.expected_outcome || '',
    status: row.status || 'planning',
    actualResults: row.actual_results || '',
    lessonsLearned: row.lessons_learned || '',
    // Stage 6 Campaign "Close the Loop"
    linkedPostId: row.linked_post_id || null,
    linkedIdeaId: row.linked_idea_id || null,
    targetMetric: row.target_metric || null,
    targetDirection: row.target_direction || null,
    baselineValue: row.baseline_value !== null && row.baseline_value !== undefined ? Number(row.baseline_value) : null,
    baselineN: row.baseline_n !== null && row.baseline_n !== undefined ? Number(row.baseline_n) : null,
    outcome: row.outcome || null,
    lessonDraft: row.lesson_draft || null,
    lessonRetainedAt: row.lesson_retained_at || null,
    lessonMemoryEventId: row.lesson_memory_event_id || null,
    isSample: false,
  };
}

export function mapCampaignToDbRow(userId: string, c: Partial<Campaign>): any {
  const row: any = {
    user_id: userId,
    title: c.title || 'Untitled Campaign',
    objective: c.objective || '',
    hypothesis: c.hypothesis || '',
    format: c.format || 'reel',
    topic: c.topic || '',
    planned_date: c.plannedDate || null,
    actual_date: null,
    expected_outcome: c.expectedOutcome || '',
    status: c.status || 'planning',
    actual_results: c.actualResults || '',
    creator_feedback: '',
    lessons_learned: c.lessonsLearned || '',
  };

  if (c.linkedPostId !== undefined) row.linked_post_id = c.linkedPostId;
  if (c.linkedIdeaId !== undefined) row.linked_idea_id = c.linkedIdeaId;
  if (c.targetMetric !== undefined) row.target_metric = c.targetMetric;
  if (c.targetDirection !== undefined) row.target_direction = c.targetDirection;
  if (c.baselineValue !== undefined) row.baseline_value = c.baselineValue;
  if (c.baselineN !== undefined) row.baseline_n = c.baselineN;
  if (c.outcome !== undefined) row.outcome = c.outcome;
  if (c.lessonDraft !== undefined) row.lesson_draft = c.lessonDraft;
  if (c.lessonRetainedAt !== undefined) row.lesson_retained_at = c.lessonRetainedAt;
  if (c.lessonMemoryEventId !== undefined) row.lesson_memory_event_id = c.lessonMemoryEventId;

  return row;
}

export function mapDbRowToMemoryEvent(row: any): MemoryEvent {
  return {
    id: row.id,
    timestamp: row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').slice(0, 19) : '',
    operation: row.operation,
    status: row.status,
    source: row.scope,
    preview: row.preview,
    isSample: false,
  };
}

// -------------------------------------------------------------
// Database Access Operations (Authenticated via Supabase RLS)
// -------------------------------------------------------------

export async function fetchUserProfile(userId: string): Promise<CreatorProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? mapDbRowToProfile(data) : null;
}

export async function upsertUserProfile(userId: string, profile: Partial<CreatorProfile>): Promise<CreatorProfile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const dbPayload = mapProfileToDbRow(userId, profile);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(dbPayload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return mapDbRowToProfile(data);
}

export async function fetchUserPosts(userId: string): Promise<PostMetricData[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('published_on', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbRowToPost);
}

export async function importBatchPostsToDb(
  userId: string,
  rows: Partial<PostMetricData>[]
): Promise<{ insertedCount: number; skippedCount: number; errors: string[] }> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (rows.length === 0) return { insertedCount: 0, skippedCount: 0, errors: [] };

  const dbRows = rows.map((r) => mapPostToDbRow(userId, r));

  // Perform insert with onConflict ignore for duplicates
  // Supabase supports ignoreDuplicates: true on insert
  const { data, error } = await supabase
    .from('posts')
    .insert(dbRows)
    .select('id');

  if (error) {
    // If batch fails due to duplicate constraint, insert row by row to count exact inserts/skips
    if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('duplicate')) {
      let insertedCount = 0;
      let skippedCount = 0;
      const errorsList: string[] = [];

      for (const row of dbRows) {
        const { error: singleErr } = await supabase.from('posts').insert(row);
        if (!singleErr) {
          insertedCount++;
        } else if (singleErr.code === '23505') {
          skippedCount++;
        } else {
          errorsList.push(singleErr.message);
        }
      }
      return { insertedCount, skippedCount, errors: errorsList };
    }
    throw error;
  }

  const insertedCount = data ? data.length : dbRows.length;
  const skippedCount = Math.max(0, rows.length - insertedCount);
  return { insertedCount, skippedCount, errors: [] };
}

export async function deleteAllUserPostsFromDb(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('posts').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function fetchUserContentIdeas(userId: string): Promise<RecommendationIdea[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('content_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbRowToIdea);
}

export async function saveUserContentIdeas(
  userId: string,
  ideas: RecommendationIdea[]
): Promise<RecommendationIdea[]> {
  if (!supabase || ideas.length === 0) return ideas;
  const dbRows = ideas.map((idea) => mapIdeaToDbRow(userId, idea));
  const { data, error } = await supabase
    .from('content_ideas')
    .insert(dbRows)
    .select();

  if (error) throw error;
  return (data || []).map(mapDbRowToIdea);
}

export async function updateUserIdeaStatus(
  userId: string,
  ideaId: string,
  status: ContentStatus
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('content_ideas')
    .update({ status })
    .eq('id', ideaId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updateUserIdea(
  userId: string,
  ideaId: string,
  updates: Partial<RecommendationIdea>
): Promise<void> {
  if (!supabase) return;
  const payload: any = {};
  if (updates.hook !== undefined) payload.hook = updates.hook;
  if (updates.caption !== undefined) payload.caption = updates.caption;
  if (updates.callToAction !== undefined) payload.call_to_action = updates.callToAction;
  if (updates.hashtags !== undefined) payload.hashtags = updates.hashtags;
  if (updates.status !== undefined) payload.status = updates.status;

  const { error } = await supabase
    .from('content_ideas')
    .update(payload)
    .eq('id', ideaId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchUserCampaigns(userId: string): Promise<Campaign[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbRowToCampaign);
}

export async function createUserCampaign(
  userId: string,
  campaign: Omit<Campaign, 'id'>
): Promise<Campaign> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const dbPayload = mapCampaignToDbRow(userId, campaign);
  const { data, error } = await supabase
    .from('campaigns')
    .insert(dbPayload)
    .select()
    .single();

  if (error) throw error;
  return mapDbRowToCampaign(data);
}

export async function updateUserCampaign(
  userId: string,
  id: string,
  updates: Partial<Campaign>
): Promise<void> {
  if (!supabase) return;
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.objective !== undefined) payload.objective = updates.objective;
  if (updates.hypothesis !== undefined) payload.hypothesis = updates.hypothesis;
  if (updates.format !== undefined) payload.format = updates.format;
  if (updates.topic !== undefined) payload.topic = updates.topic;
  if (updates.plannedDate !== undefined) payload.planned_date = updates.plannedDate;
  if (updates.expectedOutcome !== undefined) payload.expected_outcome = updates.expectedOutcome;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.actualResults !== undefined) payload.actual_results = updates.actualResults;
  if (updates.lessonsLearned !== undefined) payload.lessons_learned = updates.lessonsLearned;
  if (updates.linkedPostId !== undefined) payload.linked_post_id = updates.linkedPostId;
  if (updates.linkedIdeaId !== undefined) payload.linked_idea_id = updates.linkedIdeaId;
  if (updates.targetMetric !== undefined) payload.target_metric = updates.targetMetric;
  if (updates.targetDirection !== undefined) payload.target_direction = updates.targetDirection;
  if (updates.baselineValue !== undefined) payload.baseline_value = updates.baselineValue;
  if (updates.baselineN !== undefined) payload.baseline_n = updates.baselineN;
  if (updates.outcome !== undefined) payload.outcome = updates.outcome;
  if (updates.lessonDraft !== undefined) payload.lesson_draft = updates.lessonDraft;
  if (updates.lessonRetainedAt !== undefined) payload.lesson_retained_at = updates.lessonRetainedAt;
  if (updates.lessonMemoryEventId !== undefined) payload.lesson_memory_event_id = updates.lessonMemoryEventId;

  const { error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteUserCampaign(userId: string, id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchUserMemoryEvents(userId: string): Promise<MemoryEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('memory_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbRowToMemoryEvent);
}

export async function recordUserMemoryEvent(
  userId: string,
  event: {
    operation: 'retain' | 'recall';
    status: 'success' | 'failed';
    scope: string;
    preview: string;
    errorMessage?: string;
  }
): Promise<MemoryEvent> {
  if (!supabase) {
    return {
      id: `local-evt-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operation: event.operation,
      status: event.status,
      source: event.scope,
      preview: event.preview,
      isSample: false,
    };
  }

  const { data, error } = await supabase
    .from('memory_events')
    .insert({
      user_id: userId,
      operation: event.operation,
      status: event.status,
      scope: event.scope,
      preview: event.preview.slice(0, 200),
      error_message: event.errorMessage || null,
    })
    .select()
    .single();

  if (error) {
    // If memory event insert fails, don't crash the main action, return fallback
    return {
      id: `evt-err-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operation: event.operation,
      status: event.status,
      source: event.scope,
      preview: event.preview,
      isSample: false,
    };
  }

  return mapDbRowToMemoryEvent(data);
}

// -------------------------------------------------------------
// Lab Runs Data Access (Stage 5 Memory Lab)
// -------------------------------------------------------------

export function mapDbRowToLabRun(row: any): LabRun {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    taskLabel: row.task_label || 'Ideation Experiment',
    inputs: row.inputs || {},
    model: row.model || 'gemini-3.8-flash',
    temperature: Number(row.temperature ?? 0.3),
    promptTemplateVersion: row.prompt_template_version || 'v1',
    memoryRequested: Boolean(row.memory_requested),
    memorySucceeded: Boolean(row.memory_succeeded),
    recalled: Array.isArray(row.recalled) ? row.recalled : [],
    recalledCount: Number(row.recalled_count || 0),
    outputA: Array.isArray(row.output_a) ? row.output_a : [],
    outputB: Array.isArray(row.output_b) ? row.output_b : [],
    aSucceeded: Boolean(row.a_succeeded),
    bSucceeded: Boolean(row.b_succeeded),
    errors: row.errors || {},
    differences: row.differences || {
      overallSimilarity: 1.0,
      ideasComparison: [],
      hashtags: { added: [], removed: [], shared: [] },
      recalledMemoriesCited: [],
      factualSummary: [],
    },
    ratings: row.ratings || null,
    baselineRepeat: Array.isArray(row.baseline_repeat) ? row.baseline_repeat : null,
    isSample: false,
  };
}

export async function fetchUserLabRuns(userId: string): Promise<LabRun[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('lab_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error('Failed to fetch lab runs:', error?.message);
    return [];
  }

  return data.map(mapDbRowToLabRun);
}

export async function updateLabRunRatingsInDb(
  runId: string,
  ratings: LabRatings
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized.' };
  }

  const { error } = await supabase
    .from('lab_runs')
    .update({ ratings })
    .eq('id', runId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

