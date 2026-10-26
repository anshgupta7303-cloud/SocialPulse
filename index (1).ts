export const PostFormat = {
  reel: 'reel',
  carousel: 'carousel',
  static_image: 'static_image',
  story: 'story',
} as const;
export type PostFormat = 'reel' | 'carousel' | 'static_image' | 'story';

export const ContentStatus = {
  draft: 'draft',
  planned: 'planned',
  published: 'published',
  rejected: 'rejected',
} as const;
export type ContentStatus = 'draft' | 'planned' | 'published' | 'rejected';

export const PostMetricData = {};
export const RecommendationIdea = {};
export const StudioGenerateRequest = {};
export const StudioGenerateResponse = {};

export interface PostMetricData {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  caption: string;
  topic: string | null;
  format: PostFormat;
  status: ContentStatus;
  // Instagram distinct delivery metrics
  reach: number | null; // Accounts reached (denominator for rates)
  impressions: number | null; // Total views including repeats
  views: number | null; // Video/Reel plays
  // Engagements (nullable, missing = null, never fake 0)
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  // Optional content and conversion metrics
  externalPostId?: string | null;
  hook?: string | null;
  callToAction?: string | null;
  profileVisits?: number | null;
  follows?: number | null;
  // Computed (from /lib/metrics.ts)
  engagementRate?: number | null;
  shareRate?: number | null;
  saveRate?: number | null;
  notes?: string;
  isSample?: boolean;
}

export interface RecommendationIdea {
  id: string;
  topic: string;
  hook: string;
  caption: string;
  format: PostFormat;
  callToAction: string;
  hashtags: string[];
  scriptOutline: string[];
  whyThisRecommendation: string;
  memoriesUsed: string[];
  predictedHypothesis: string;
  status?: ContentStatus;
  isSample?: boolean;
}

export interface StudioGenerateRequest {
  topic: string;
  goal?: string;
  format?: PostFormat;
  audience?: string;
  tone?: string;
  language?: string;
  objective?: string;
  cta?: string;
  numIdeas?: number;
  useMemory?: boolean;
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

export interface StudioGenerateResponse {
  ideas: RecommendationIdea[];
  memory: {
    requested: boolean;
    succeeded: boolean;
    recalledCount: number;
    recalled: string[];
    error?: string;
  };
  model: string;
  generatedAt: string;
  inputsEcho: {
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
  };
}

export const TargetMetric = {
  save_rate: 'save_rate',
  engagement_rate: 'engagement_rate',
  share_rate: 'share_rate',
} as const;
export type TargetMetric = 'save_rate' | 'engagement_rate' | 'share_rate';

export const TargetDirection = {
  above_baseline: 'above_baseline',
  below_baseline: 'below_baseline',
} as const;
export type TargetDirection = 'above_baseline' | 'below_baseline';

export const CampaignVerdict = {
  met: 'met',
  not_met: 'not met',
  inconclusive: 'inconclusive',
} as const;
export type CampaignVerdict = 'met' | 'not met' | 'inconclusive';

export const CampaignOutcome = {};
export const Campaign = {};
export const MemoryEvent = {};
export const AudienceFeedbackItem = {};
export const CreatorProfile = {};
export const CSVColumnMapping = {};
export const CSVValidationError = {};
export const CSVImportResult = {};
export const LabRatings = {};
export const LabRun = {};

export interface CampaignOutcome {
  actualValue: number | null;
  baselineValue: number | null;
  baselineN: number;
  absoluteDiff: number | null;
  percentDiff: number | null;
  verdict: CampaignVerdict;
  verdictReason: string;
  evaluatedAt: string;
  formula: string;
  denominatorInfo: string;
  isBaselineThin: boolean;
}

export interface Campaign {
  id: string;
  title: string;
  objective: string;
  hypothesis: string;
  format: PostFormat;
  topic: string;
  plannedDate: string;
  expectedOutcome: string;
  status: 'planning' | 'in_progress' | 'completed' | 'abandoned';
  actualResults?: string;
  lessonsLearned?: string;
  // Stage 6 Campaign "Close the Loop" fields
  linkedPostId?: string | null;
  linkedIdeaId?: string | null;
  targetMetric?: TargetMetric | null;
  targetDirection?: TargetDirection | null;
  baselineValue?: number | null;
  baselineN?: number | null;
  outcome?: CampaignOutcome | null;
  lessonDraft?: string | null;
  lessonRetainedAt?: string | null;
  lessonMemoryEventId?: string | null;
  isSample?: boolean;
}

export interface MemoryEvent {
  id: string;
  timestamp: string;
  operation: 'retain' | 'recall';
  status: 'success' | 'failed';
  source: string;
  preview: string;
  lesson?: string;
  isSample?: boolean;
}

export interface AudienceFeedbackItem {
  id: string;
  category: 'positive' | 'negative' | 'neutral' | 'question' | 'request';
  text: string;
  sourcePostId?: string;
  date: string;
  sentimentScore?: number;
}

export interface CreatorProfile {
  brandName: string;
  instagramHandle: string;
  niche: string;
  targetAudience: string;
  preferredFormats: PostFormat[];
  tone: string;
  goals: string;
}

export interface CSVColumnMapping {
  date: string;
  caption: string;
  topic: string;
  format: string;
  reach: string;
  impressions: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  externalPostId?: string;
  hook?: string;
  callToAction?: string;
  profileVisits?: string;
  follows?: string;
}

export interface CSVValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CSVImportResult {
  validRows: Partial<PostMetricData>[];
  errors: CSVValidationError[];
  skippedDuplicates: number;
  totalParsed: number;
  unmappedColumns: string[];
}

export interface LabRatings {
  scoreA: {
    relevance: number; // 1-5
    personalization: number; // 1-5
    evidenceUse: number; // 1-5
    usefulness: number; // 1-5
  };
  scoreB: {
    relevance: number; // 1-5
    personalization: number; // 1-5
    evidenceUse: number; // 1-5
    usefulness: number; // 1-5
  };
  notes?: string;
  submittedAt?: string;
}

export interface LabRun {
  id: string;
  userId?: string;
  createdAt: string;
  taskLabel: string;
  inputs: StudioGenerateRequest & { repeatBaseline?: boolean };
  model: string;
  temperature: number;
  promptTemplateVersion: string;
  memoryRequested: boolean;
  memorySucceeded: boolean;
  recalled: string[];
  recalledCount: number;
  outputA: RecommendationIdea[];
  outputB: RecommendationIdea[];
  aSucceeded: boolean;
  bSucceeded: boolean;
  errors: {
    geminiA?: string;
    geminiB?: string;
    geminiRepeat?: string;
    hindsight?: string;
  };
  differences: {
    overallSimilarity: number;
    baselineSimilarity?: number;
    ideasComparison: Array<{
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
    }>;
    hashtags: {
      added: string[];
      removed: string[];
      shared: string[];
    };
    recalledMemoriesCited: string[];
    factualSummary: string[];
    aiExplanation?: string;
  };
  ratings?: LabRatings | null;
  baselineRepeat?: RecommendationIdea[] | null;
  isSample?: boolean;
}

