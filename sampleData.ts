import type {
  PostMetricData,
  RecommendationIdea,
  Campaign,
  MemoryEvent,
  AudienceFeedbackItem,
  CreatorProfile,
  PostFormat,
  ContentStatus,
} from '../types/index.ts';
import {
  calculateEngagementRate,
  calculateShareRate,
  calculateSaveRate,
} from './metrics.ts';

/**
 * Authentic 90-Day Account Insights extracted directly from:
 * Account_insights_for_irlvansh__Jul_27__2026_-_Oct_25__2026___1__40fef916.csv
 */
export const IRLVANSH_ACCOUNT_INSIGHTS = {
  handle: '@irlvansh',
  brandName: 'irlvansh',
  period: 'Jul 27 - Oct 25, 2026',
  periodDays: 90,
  followers: 4040,
  followersFormatted: '4,040',
  reelsCount: 321,
  reelViews: 32000000,
  reelViewsFormatted: '32M',
  viewersReach: 12000000,
  viewersFormatted: '12M',
  likes: 2200000,
  likesFormatted: '2.2M',
  comments: 26000,
  commentsFormatted: '26K',
  reposts: 55000,
  repostsFormatted: '55K',
  shares: 2300000,
  sharesFormatted: '2.3M',
  saves: 163000,
  savesFormatted: '163K',
  exportSource: 'Exported from Edits (TCPDF)',
  gender: {
    men: 75.9,
    women: 24.1,
  },
  ageRanges: [
    { range: '18-24', percentage: 38.0 },
    { range: '25-34', percentage: 23.6 },
    { range: '13-17', percentage: 22.4 },
    { range: '35-44', percentage: 10.6 },
    { range: '45-54', percentage: 3.6 },
    { range: '55-64', percentage: 0.9 },
    { range: '65+', percentage: 0.9 },
  ],
  topCountries: [
    { country: 'India', percentage: 87.7 },
    { country: 'Pakistan', percentage: 6.0 },
    { country: 'Bangladesh', percentage: 2.5 },
    { country: 'Nepal', percentage: 1.8 },
    { country: 'United Arab Emirates', percentage: 0.2 },
  ],
  topCities: [
    { city: 'Delhi', percentage: 24.5 },
    { city: 'Mumbai', percentage: 6.9 },
    { city: 'Bangalore', percentage: 4.3 },
    { city: 'Kolkata', percentage: 4.0 },
    { city: 'Karachi', percentage: 3.6 },
  ],
};

const TOPICS = [
  'Viral Reels Timing & Audio Hooks',
  'Delhi & Metro Youth Relatable Edits',
  'Short-Form Video Retention Secrets',
  'Creator Workflow & Video Editing Hacks',
  'Behind the Scenes: 32M Views Breakdown',
  'Micro-Skits & Student Reality',
];

const REEL_HOOKS = [
  'Why this 1.2s audio cut got 1.4M views in Delhi & Mumbai.',
  'POV: You post at 9 PM thinking the algorithm will save you.',
  'The exact edit transition that turned a 50k view reel into 2.3M shares.',
  'Behind the scenes of 32M views: what actually broke during the 90 days.',
  'If your watch time drops at second 3, you are doing this wrong.',
  'How to turn relatable Indian student moments into viral Reels.',
];

const CAROUSEL_TITLES = [
  'The @irlvansh 90-Day Viral Reel Playbook (32M Views Breakdown)',
  '5 Sound-Sync Editing Patterns That Drove 2.3M Shares',
  'Audience Blueprint: Retaining the 18-24 Demographic',
  'Why Shares Outperformed Saves by 14x on Our Best Reels',
  'The Step-by-Step Color & Pacing Checklist for High Retention',
];

/**
 * Deterministically generates ~60 sample posts across the last 90 days.
 */
export function generateSamplePosts(): PostMetricData[] {
  const posts: PostMetricData[] = [];
  const baseDate = new Date('2026-10-24T12:00:00Z');

  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor((i * 90) / 60);
    const postDate = new Date(baseDate.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = postDate.toISOString().split('T')[0];

    const formatIndex = i % 10;
    let format: PostFormat = 'reel';
    if (formatIndex === 2 || formatIndex === 5 || formatIndex === 8) {
      format = 'carousel';
    } else if (formatIndex === 4 || formatIndex === 9) {
      format = 'static_image';
    }

    const topic = TOPICS[i % TOPICS.length];
    const isReel = format === 'reel';
    const isCarousel = format === 'carousel';

    // Base reaches with some viral outliers
    let reach = Math.floor(1800 + ((i * 387) % 7200));
    if (i === 4 || i === 19 || i === 42) {
      reach = Math.floor(22000 + (i * 450)); // viral posts
    } else if (i === 11 || i === 31) {
      reach = Math.floor(14500 + (i * 200));
    }

    // Impressions always exceed reach (repeat views)
    const impressions = Math.floor(reach * (1.25 + ((i % 5) * 0.08)));
    // Views for reels or video carousels
    const views = isReel ? Math.floor(reach * (1.15 + ((i % 4) * 0.12))) : null;

    // Engagements tuned realistically by format
    let likeRatio = isReel ? 0.045 : isCarousel ? 0.038 : 0.025;
    let commentRatio = isReel ? 0.006 : isCarousel ? 0.009 : 0.004;
    let shareRatio = isReel ? 0.018 : isCarousel ? 0.012 : 0.003;
    let saveRatio = isCarousel ? 0.042 : isReel ? 0.024 : 0.015;

    // Some topic modifiers
    if (topic.includes('Playbook') || topic.includes('Checklist')) {
      saveRatio *= 1.4;
    }
    if (topic.includes('Automation') || topic.includes('Stop doing')) {
      shareRatio *= 1.35;
    }

    const likes = Math.max(12, Math.floor(reach * likeRatio));
    const comments = Math.max(2, Math.floor(reach * commentRatio));
    const shares = Math.max(1, Math.floor(reach * shareRatio));
    const saves = Math.max(3, Math.floor(reach * saveRatio));

    const caption = isReel
      ? REEL_HOOKS[i % REEL_HOOKS.length]
      : isCarousel
      ? CAROUSEL_TITLES[i % CAROUSEL_TITLES.length]
      : `Behind the scenes insight: ${topic}. What workflow step are you struggling with?`;

    let status: ContentStatus = 'published';
    if (dayOffset <= 3 && i === 0) status = 'planned';
    else if (dayOffset <= 1) status = 'draft';

    const rawInput = { reach, likes, comments, shares, saves };
    const engagementRate = calculateEngagementRate(rawInput);
    const shareRate = calculateShareRate(rawInput);
    const saveRate = calculateSaveRate(rawInput);

    posts.push({
      id: `sample-post-${i + 1}`,
      date: dateStr,
      caption,
      topic,
      format,
      status,
      reach,
      impressions,
      views,
      likes,
      comments,
      shares,
      saves,
      engagementRate,
      shareRate,
      saveRate,
      notes: i % 7 === 0 ? 'Hindsight memory flagged: High bookmark retention on slide 3.' : undefined,
      isSample: true,
    });
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export const SAMPLE_RECOMMENDATIONS: RecommendationIdea[] = [
  {
    id: 'rec-1',
    topic: 'Prompt Engineering Playbooks',
    hook: 'Why 90% of custom GPTs fail in week 2 (and the 2-variable fix).',
    caption:
      'We analyzed 45 automation sequences built by solopreneurs. The bottleneck was rarely model intelligence—it was input context leakage. Here is the framework that restored 99% accuracy:',
    format: 'carousel',
    callToAction: 'Comment "OS" and I’ll send the full schema diagram.',
    hashtags: ['#PromptEngineering', '#SolopreneurTech', '#AIEfficiency', '#WorkflowHacks'],
    scriptOutline: [
      'Slide 1: The Context Bottleneck (Diagram of where inputs drop off)',
      'Slide 2: Mistake #1 - Dumping 4,000 words into system prompts',
      'Slide 3: The 2-Variable Sandbox Pattern',
      'Slide 4: Before vs After execution telemetry',
      'Slide 5: Action checklist + Comment CTA',
    ],
    whyThisRecommendation:
      'Past campaign analysis shows carousels covering concrete tactical schemas generate 3.8x higher Save Rate (4.6%) than conceptual reels.',
    memoriesUsed: [
      'Memory #M-104: Carousel schema posts average 4.8% save rate vs 2.1% text dumps.',
      'Memory #M-089: Comments increased +42% when CTA prompted single-word keyword instead of broad questions.',
    ],
    predictedHypothesis:
      'Testing high-density technical carousels with a specific trigger keyword will yield >= 4.2% save rate and >= 80 comment queries.',
  },
  {
    id: 'rec-2',
    topic: 'AI Workflow Automation',
    hook: 'I let an autonomous agent manage my inbox for 7 days. Here’s what broke.',
    caption:
      'Everyone shows the highlights. Nobody shows the edge cases where an agent confirmed a meeting in the middle of the night. 3 safeguards you must configure before setting any agent live:',
    format: 'reel',
    callToAction: 'Save this before connecting your next webhook.',
    hashtags: ['#AIAgents', '#AutomationFailures', '#ProductivityHacks', '#NoCodeTech'],
    scriptOutline: [
      '0:00 - 0:03 Fast hook: Screenshot of agent mistake with facecam reaction',
      '0:03 - 0:12 Breakdown of failure mode: unconstrained tool permissions',
      '0:12 - 0:28 The 3 guardrails (Human-in-the-loop gate, rate limiting, token limits)',
      '0:28 - 0:42 Screen recording showing the fail-safe toggle in action',
      '0:42 - 0:50 Outro and save prompt',
    ],
    whyThisRecommendation:
      'Reels featuring "What broke / Honest vulnerability" had 2.4x higher Share Rate (2.3%) than positive tutorial reels.',
    memoriesUsed: [
      'Memory #M-061: Failure-post mortem reels hold retention 18 seconds longer than standard tutorials.',
      'Memory #M-033: Screen recording demonstration beats static talking-head format by 65% reach.',
    ],
    predictedHypothesis:
      'Transparent post-mortems trigger discussion threads that elevate algorithm distribution by 25-35%.',
  },
  {
    id: 'rec-3',
    topic: 'Creator Monetization',
    hook: 'The $0 to $10k digital asset breakdown that doesn’t require 100k followers.',
    caption:
      'Followers are a vanity metric if your offer isn’t tied to a specific transformation. Here is the micro-product roadmap we deployed with 4,200 engaged accounts:',
    format: 'carousel',
    callToAction: 'Which tier are you building this quarter? Let me know below.',
    hashtags: ['#CreatorEconomy', '#MonetizationStrategy', '#DigitalProducts', '#GrowthAgent'],
    scriptOutline: [
      'Slide 1: The Audience vs Offer Matrix',
      'Slide 2: Tier 1: $19 Quick-start Notion template',
      'Slide 3: Tier 2: $97 Micro-workshop',
      'Slide 4: Conversion benchmarks from 4.2k audience test',
      'Slide 5: Next steps & discussion question',
    ],
    whyThisRecommendation:
      'Financial roadmap carousels drive strong comments when framed around achievable follower counts rather than massive audiences.',
    memoriesUsed: [
      'Memory #M-112: Audience reacts with high skepticism to claims above $50k/mo; grounded micro-numbers perform 2.1x better.',
    ],
    predictedHypothesis:
      'Focusing on micro-audience monetization generates trust-building comment engagement from qualified prospective clients.',
  },
];

export const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    title: 'High-Density Carousel Schema Sprint',
    objective: 'Drive Save Rate above 4.5% using architectural blueprints',
    hypothesis:
      'If we replace conversational carousels with dense technical schematics on slides 2-4, then bookmark save rate will increase by at least 40%.',
    format: 'carousel',
    topic: 'AI Workflow Automation',
    plannedDate: '2026-10-18',
    expectedOutcome: 'Save rate >= 4.5%, reach >= 8,000, 300+ total saves',
    status: 'completed',
    actualResults: 'Achieved 4.92% Save Rate with 418 saves on 8,500 reach.',
    lessonsLearned:
      'Hindsight recorded: Readers specifically highlighted slide 3 flowchart in comments. Visual schemas outperform bulleted text by 2.1x on save rate.',
    isSample: true,
  },
  {
    id: 'camp-2',
    title: 'Fail-Forward Reel Experiment',
    objective: 'Test transparent post-mortem hooks vs aspirational tutorial hooks',
    hypothesis:
      'Reels highlighting broken automation workflows will achieve >2.0% share rate compared to the 0.8% baseline on positive tutorials.',
    format: 'reel',
    topic: 'Deep Work Tech Stack',
    plannedDate: '2026-10-22',
    expectedOutcome: 'Share rate >= 2.0%, reach >= 15,000',
    status: 'completed',
    actualResults: 'Reached 24,100 accounts with 2.38% Share Rate (573 shares).',
    lessonsLearned:
      'Hindsight recorded: Emotional validation and relief ("I thought I was the only one having this issue") drove direct DMs and story shares.',
    isSample: true,
  },
  {
    id: 'camp-3',
    title: 'Comment Keyword Automation Trigger',
    objective: 'Evaluate conversion of single-word DM triggers vs multi-word phrases',
    hypothesis:
      'Using a 2-letter keyword ("OS" or "AI") will yield 60% higher comment count than "Comment WORKFLOW below".',
    format: 'carousel',
    topic: 'Prompt Engineering Playbooks',
    plannedDate: '2026-10-28',
    expectedOutcome: '120+ comments, comment rate >= 1.2%',
    status: 'in_progress',
    actualResults: '142 comments logged in initial 24 hours. Tracking ongoing.',
    lessonsLearned: 'Pending final window completion.',
    isSample: true,
  },
  {
    id: 'camp-4',
    title: 'Static Infographic Contrast Test',
    objective: 'Verify whether high-contrast single-image infographics can still compete with Reels in 2026',
    hypothesis:
      'High-contrast cheatsheet image with black background and neon indicators will achieve at least 3.0% engagement rate.',
    format: 'static_image',
    topic: 'No-Code Tools Review',
    plannedDate: '2026-11-02',
    expectedOutcome: 'Reach >= 4,000, engagement rate >= 3.0%',
    status: 'planning',
    isSample: true,
  },
];

export const SAMPLE_MEMORY_EVENTS: MemoryEvent[] = [
  {
    id: 'mem-1',
    timestamp: '2026-10-24 18:42:10',
    operation: 'retain',
    status: 'success',
    source: 'Campaign: High-Density Carousel Schema Sprint',
    preview: 'Retained rule: Visual schematics on slide 2-4 lift Save Rate to 4.92% (baseline: 2.1%).',
    lesson: 'Prioritize architectural diagrams over text lists for bookmarkable assets.',
    isSample: true,
  },
  {
    id: 'mem-2',
    timestamp: '2026-10-24 14:15:02',
    operation: 'recall',
    status: 'success',
    source: 'Content Studio Generation Query',
    preview: 'Recalled 3 memories matching query "Carousel schema for Prompt Engineering"',
    lesson: 'Context injection applied: Hook pattern, keyword CTA, and 5-slide constraint.',
    isSample: true,
  },
  {
    id: 'mem-3',
    timestamp: '2026-10-23 09:30:45',
    operation: 'retain',
    status: 'success',
    source: 'Post #sample-post-4 Performance Ingestion',
    preview: 'Retained insight: Video views dropped 40% after second 3 when intro had no captions.',
    lesson: 'Hard requirement: burn-in captions or animated kinetic typography in opening 3 seconds.',
    isSample: true,
  },
  {
    id: 'mem-4',
    timestamp: '2026-10-22 21:05:18',
    operation: 'recall',
    status: 'success',
    source: 'Campaign Planning: Fail-Forward Reel',
    preview: 'Recalled negative pattern: Overly polished studio lighting reduced comment authenticity by 35%.',
    lesson: 'Suggested raw desk setup / screencast over formal studio setup.',
    isSample: true,
  },
  {
    id: 'mem-5',
    timestamp: '2026-10-21 16:11:00',
    operation: 'retain',
    status: 'success',
    source: 'Audience Feedback Sentiment Clustering',
    preview: 'Retained topic demand: 28 comments requested a deep dive on Zapier vs Make cost differences.',
    lesson: 'High audience urgency around tool billing surprises.',
    isSample: true,
  },
];

export const SAMPLE_FEEDBACK: AudienceFeedbackItem[] = [
  {
    id: 'fb-1',
    category: 'positive',
    text: 'That slide 3 flowchart made more sense than a 20-minute YouTube video. Bookmarked immediately!',
    date: '2026-10-24',
    sentimentScore: 0.94,
  },
  {
    id: 'fb-2',
    category: 'positive',
    text: 'Finally someone who talks about the actual failure cases instead of just pretending agents are magic.',
    date: '2026-10-23',
    sentimentScore: 0.91,
  },
  {
    id: 'fb-3',
    category: 'question',
    text: 'How do you handle API credential security when running webhooks with third-party extensions?',
    date: '2026-10-23',
    sentimentScore: 0.1,
  },
  {
    id: 'fb-4',
    category: 'request',
    text: 'Can you please do a breakdown comparing n8n self-hosting vs Make.com enterprise pricing?',
    date: '2026-10-22',
    sentimentScore: 0.35,
  },
  {
    id: 'fb-5',
    category: 'negative',
    text: 'The text was scrolling a bit too fast in the first 5 seconds to read without pausing.',
    date: '2026-10-22',
    sentimentScore: -0.65,
  },
  {
    id: 'fb-6',
    category: 'request',
    text: 'Where can we download the Notion checklist referenced in slide 5?',
    date: '2026-10-21',
    sentimentScore: 0.4,
  },
  {
    id: 'fb-7',
    category: 'neutral',
    text: 'Noticed the reach on your 9 PM drops is higher on Fridays than Tuesdays in Delhi.',
    date: '2026-10-21',
    sentimentScore: 0.1,
  },
  {
    id: 'fb-8',
    category: 'question',
    text: 'How do you keep retention above 65% on viral reels without losing pacing?',
    date: '2026-10-20',
    sentimentScore: 0.25,
  },
];

export const SAMPLE_PROFILE: CreatorProfile = {
  brandName: 'irlvansh',
  instagramHandle: '@irlvansh',
  niche: 'Relatable Short-Form Reels & Youth Culture',
  targetAudience: 'Youth & Creators: 60.4% aged 13-24 (38% 18-24, 22.4% 13-17), 75.9% Men, top in India (Delhi 24.5%, Mumbai 6.9%, Bangalore 4.3%)',
  preferredFormats: ['reel'],
  tone: 'Authentic, viral, fast-hook, high-share, culturally grounded',
  goals: 'Sustain explosive viral distribution (32M views, 2.3M shares across 321 reels) while converting reach into long-term community and 163K+ saves.',
};
