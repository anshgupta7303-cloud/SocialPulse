import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  BrainCircuit,
  AlertCircle,
  HelpCircle,
  RotateCw,
  Hash,
  ListOrdered,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Brain,
  KeyRound,
  FlaskConical,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { PostFormat, RecommendationIdea, ContentStatus } from '../types/index.ts';
import { SAMPLE_RECOMMENDATIONS } from '../lib/sampleData.ts';
import { generateStudioIdeas, retainMemory } from '../lib/hindsightClient.ts';
import { calculateEngagementRate, calculateShareRate, calculateSaveRate } from '../lib/metrics.ts';

export function ContentStudio() {
  const {
    useSampleData,
    profile,
    posts,
    geminiStatus,
    hindsightStatus,
    refreshServerMemoryEvents,
    refreshHindsightStatus,
  } = useApp();
  const navigate = useNavigate();

  // Brief Form State
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('increase_saves');
  const [format, setFormat] = useState<PostFormat>('reel');
  const [audience, setAudience] = useState(profile.targetAudience || 'Solopreneurs & Tech Creators');
  const [tone, setTone] = useState(profile.tone || 'Pragmatic & Actionable');
  const [language, setLanguage] = useState('English');
  const [objective, setObjective] = useState('');
  const [cta, setCta] = useState('');
  const [numIdeas, setNumIdeas] = useState('3');
  const [useMemory, setUseMemory] = useState<boolean>(true);

  // Client form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generation status & error state
  const [generationError, setGenerationError] = useState<{ code?: string; message: string } | null>(null);

  // Memory panel state returned from server
  const [memoryMeta, setMemoryMeta] = useState<{
    requested: boolean;
    succeeded: boolean;
    recalledCount: number;
    recalled: string[];
    error?: string;
  } | null>(null);

  // Generated ideas state (held in React state)
  const [ideas, setIdeas] = useState<RecommendationIdea[]>(() => {
    return useSampleData ? SAMPLE_RECOMMENDATIONS : [];
  });

  // Inline editing state: ideaId -> partial fields being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    hook: string;
    caption: string;
    callToAction: string;
    hashtags: string;
  }>({ hook: '', caption: '', callToAction: '', hashtags: '' });

  // Teaching the Agent state: per-idea feedback box
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackDecision, setFeedbackDecision] = useState<'approve' | 'reject'>('approve');
  const [feedbackReason, setFeedbackReason] = useState<string>('');
  const [isRetainingLesson, setIsRetainingLesson] = useState(false);
  const [retainResult, setRetainResult] = useState<{ success: boolean; message: string } | null>(null);

  // Synchronize sample data toggle
  React.useEffect(() => {
    if (useSampleData) {
      setIdeas(SAMPLE_RECOMMENDATIONS);
      setMemoryMeta(null);
      setGenerationError(null);
    } else {
      // Clear sample ideas when Sample Data is turned OFF
      setIdeas([]);
      setMemoryMeta(null);
    }
  }, [useSampleData]);

  // Compute analytics summary on the client using /lib/metrics.ts (server never recomputes or invents)
  const analyticsSummary = useMemo(() => {
    if (!posts || posts.length === 0) {
      return {
        totalPostsSampled: 0,
        avgEngagementRate: null,
        avgShareRate: null,
        avgSaveRate: null,
        bestFormat: null,
      };
    }

    let engagementSum = 0;
    let engagementCount = 0;
    let shareSum = 0;
    let shareCount = 0;
    let saveSum = 0;
    let saveCount = 0;

    const formatSaves: Record<string, { sum: number; count: number }> = {};

    for (const post of posts) {
      const eng = calculateEngagementRate(post);
      if (eng !== null) {
        engagementSum += eng;
        engagementCount++;
      }
      const sh = calculateShareRate(post);
      if (sh !== null) {
        shareSum += sh;
        shareCount++;
      }
      const sv = calculateSaveRate(post);
      if (sv !== null) {
        saveSum += sv;
        saveCount++;
        const fmt = post.format;
        if (!formatSaves[fmt]) formatSaves[fmt] = { sum: 0, count: 0 };
        formatSaves[fmt].sum += sv;
        formatSaves[fmt].count++;
      }
    }

    let bestFormat: string | null = null;
    let maxAvgSave = -1;
    for (const [fmt, data] of Object.entries(formatSaves)) {
      if (data.count > 0) {
        const avg = data.sum / data.count;
        if (avg > maxAvgSave) {
          maxAvgSave = avg;
          bestFormat = fmt;
        }
      }
    }

    return {
      totalPostsSampled: posts.length,
      avgEngagementRate: engagementCount > 0 ? Number((engagementSum / engagementCount).toFixed(2)) : null,
      avgShareRate: shareCount > 0 ? Number((shareSum / shareCount).toFixed(2)) : null,
      avgSaveRate: saveCount > 0 ? Number((saveSum / saveCount).toFixed(2)) : null,
      bestFormat,
    };
  }, [posts]);

  // Real Server Generation Handler
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!topic.trim()) {
      newErrors.topic = 'Please provide a content topic or niche theme.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const parsedNumIdeas = parseInt(numIdeas, 10) || 3;
      const res = await generateStudioIdeas({
        topic: topic.trim(),
        goal,
        format,
        audience: audience.trim(),
        tone: tone.trim(),
        language,
        objective: objective.trim(),
        cta: cta.trim(),
        numIdeas: parsedNumIdeas,
        useMemory,
        profileSummary: {
          brandName: profile.brandName,
          niche: profile.niche,
          targetAudience: profile.targetAudience,
          tone: profile.tone,
          goals: profile.goals,
        },
        analyticsSummary,
      });

      setIdeas(res.ideas);
      setMemoryMeta(res.memory);
      // Refresh memory events audit trail so recent recall appears in memory logs
      refreshServerMemoryEvents();
    } catch (err: any) {
      setGenerationError({
        code: err?.code || 'generation_failed',
        message: err?.message || 'Failed to generate content ideas. Check server logs.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCaption = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status updates (draft / planned / rejected)
  const handleUpdateStatus = (id: string, newStatus: ContentStatus) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, status: newStatus } : idea))
    );
  };

  // Inline edit actions
  const handleStartEdit = (idea: RecommendationIdea) => {
    setEditingId(idea.id);
    setEditForm({
      hook: idea.hook,
      caption: idea.caption,
      callToAction: idea.callToAction,
      hashtags: idea.hashtags.join(' '),
    });
  };

  const handleSaveEdit = (id: string) => {
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== id) return idea;
        const rawHashtags = editForm.hashtags
          .split(/[\s,]+/)
          .map((h) => h.trim())
          .filter(Boolean)
          .map((h) => (h.startsWith('#') ? h : `#${h}`));

        return {
          ...idea,
          hook: editForm.hook.trim() || idea.hook,
          caption: editForm.caption.trim() || idea.caption,
          callToAction: editForm.callToAction.trim() || idea.callToAction,
          hashtags: rawHashtags.length > 0 ? rawHashtags : idea.hashtags,
        };
      })
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Teach the Agent: open feedback dialog
  const handleOpenFeedback = (idea: RecommendationIdea, decision: 'approve' | 'reject') => {
    setActiveFeedbackId(idea.id);
    setFeedbackDecision(decision);
    setRetainResult(null);

    // Update the idea status immediately
    handleUpdateStatus(idea.id, decision === 'approve' ? 'planned' : 'rejected');

    // Default contextual reason
    if (decision === 'approve') {
      setFeedbackReason(
        `Approved hook and format for "${idea.topic}": clear actionable structure and aligned CTA.`
      );
    } else {
      setFeedbackReason(
        `Rejected approach for "${idea.topic}": avoid theoretical lists or generic claims; need specific step-by-step guidance.`
      );
    }
  };

  // Teach the Agent: submit lesson to Hindsight
  const handleSaveLessonToHindsight = async (idea: RecommendationIdea) => {
    if (!feedbackReason.trim()) return;

    setIsRetainingLesson(true);
    setRetainResult(null);

    const lessonText = `Creator Lesson (${feedbackDecision.toUpperCase()} on "${idea.topic}"): ${feedbackReason.trim()}`;
    const result = await retainMemory(lessonText, {
      type: 'creator_studio_feedback',
      date: new Date().toISOString(),
      source: `Content Studio Feedback [${idea.format}]`,
    });

    setIsRetainingLesson(false);
    setRetainResult({
      success: result.success,
      message: result.message,
    });

    if (result.success) {
      refreshServerMemoryEvents();
    }
  };

  const isGeminiConfigured = geminiStatus?.configured ?? false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Content Studio
            </h2>
            {useSampleData ? (
              <Badge variant="sample">SAMPLE DATA</Badge>
            ) : (
              <Badge variant="violet">Gemini + Hindsight</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real Gemini generation grounded in Hindsight memory facts and creator analytics.
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 max-w-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Recommendations are hypotheses based on historical trends, not guaranteed engagement increases.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Creative Brief & Parameters</CardTitle>
              <CardDescription>
                Parameters are validated and sent to the server. Ideas are synthesized using Gemini and grounded in Hindsight memories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <Input
                  label="Topic / Subject *"
                  placeholder="e.g. AI Prompt Optimization or Notion Systems"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  error={errors.topic}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Primary Goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    options={[
                      { value: 'increase_saves', label: 'Max Save Rate (Bookmarks)' },
                      { value: 'increase_shares', label: 'Max Share Rate (Virality)' },
                      { value: 'drive_comments', label: 'Max Comment Triggers' },
                      { value: 'reach_expansion', label: 'Expand Non-Follower Reach' },
                    ]}
                  />

                  <Select
                    label="Format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as PostFormat)}
                    options={[
                      { value: 'reel', label: 'Reel (Short Video)' },
                      { value: 'carousel', label: 'Carousel (Multi-slide)' },
                      { value: 'static_image', label: 'Static Image / Infographic' },
                      { value: 'story', label: 'Story Series' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Target Audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. Tech Founders"
                  />

                  <Input
                    label="Tone of Voice"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. Punchy, pragmatic"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    options={[
                      { value: 'English', label: 'English' },
                      { value: 'Spanish', label: 'Spanish' },
                      { value: 'French', label: 'French' },
                      { value: 'German', label: 'German' },
                    ]}
                  />

                  <Select
                    label="Number of Ideas"
                    value={numIdeas}
                    onChange={(e) => setNumIdeas(e.target.value)}
                    options={[
                      { value: '1', label: '1 idea' },
                      { value: '2', label: '2 ideas' },
                      { value: '3', label: '3 ideas (recommended)' },
                      { value: '4', label: '4 ideas' },
                      { value: '5', label: '5 ideas' },
                    ]}
                  />
                </div>

                <Textarea
                  label="Experiment Objective"
                  placeholder="What specific outcome or audience behavior are we testing? (optional)"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={2}
                />

                <Input
                  label="Call to Action (CTA)"
                  placeholder="e.g. Comment 'BLUEPRINT' for the schema link (optional)"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />

                {/* Use Hindsight Memory Toggle */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                      <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Use Hindsight Memory
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recall past retained campaign lessons to ground recommendations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseMemory(!useMemory)}
                    className="p-1 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                    aria-label="Toggle Hindsight memory usage"
                  >
                    {useMemory ? (
                      <ToggleRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isGenerating}
                  leftIcon={<Wand2 className="w-4 h-4" />}
                >
                  Generate Content Concepts
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gemini Not Configured Warning Card */}
          {!isGeminiConfigured && !useSampleData && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-amber-300">
                <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Setup Required: Configure GEMINI_API_KEY</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                Real Content Studio generation requires <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">GEMINI_API_KEY</code>.
                Open the <strong>AI Studio Secrets panel</strong> (in the top/left AI Studio environment bar) and add your Gemini API key.
                No sample ideas are displayed here when Sample Data is OFF.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={refreshHindsightStatus}
                  leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                >
                  Refresh Connection State
                </Button>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {generationError && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-rose-900 dark:text-rose-200">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Generation Error ({generationError.code || 'Failed'})</span>
              </div>
              <p className="text-xs leading-relaxed font-mono">
                {generationError.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs mt-2"
                onClick={() => handleGenerate()}
                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              >
                Retry Generation
              </Button>
            </div>
          )}

          {/* Honest "Memories used" Status Panel */}
          {memoryMeta !== null && (
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Hindsight Memory Recall Status:</span>
                </div>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  {memoryMeta.requested ? `${memoryMeta.recalledCount} recalled` : 'Disabled'}
                </span>
              </div>

              {/* Honest States */}
              {!memoryMeta.requested && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Memory not requested (toggle was turned OFF).
                </p>
              )}

              {memoryMeta.requested && memoryMeta.error?.includes('not configured') && (
                <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Hindsight not configured. Generation proceeded without past memory grounding.</span>
                </div>
              )}

              {memoryMeta.requested && !memoryMeta.succeeded && !memoryMeta.error?.includes('not configured') && (
                <div className="text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Recall failed: {memoryMeta.error || 'Unknown memory recall failure'}.</span>
                </div>
              )}

              {memoryMeta.requested && memoryMeta.succeeded && memoryMeta.recalledCount === 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                  No relevant memories found in memory bank for this query.
                </p>
              )}

              {memoryMeta.requested && memoryMeta.succeeded && memoryMeta.recalledCount > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-indigo-900 dark:text-indigo-300">
                    Exact memories recalled from Hindsight Cloud:
                  </p>
                  <ul className="space-y-1 text-xs">
                    {memoryMeta.recalled.map((mem, idx) => (
                      <li
                        key={idx}
                        className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-700 dark:text-slate-300 font-mono flex items-start gap-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        <span>{mem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Results List or Empty State */}
          {ideas.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-10 h-10 text-indigo-400" />}
              title="No Content Concepts Generated Yet"
              description={
                isGeminiConfigured
                  ? "Fill out the content brief on the left and click 'Generate Content Concepts' to run server Gemini synthesis."
                  : "Add your GEMINI_API_KEY in AI Studio Secrets to generate real ideas, or toggle 'Sample Data: ON' in the top bar to preview sample concepts."
              }
              actionLabel={useSampleData ? 'Reset Sample Concepts' : undefined}
              onAction={
                useSampleData
                  ? () => {
                      setIdeas(SAMPLE_RECOMMENDATIONS);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Generated Recommendations ({ideas.length})
                </h3>
                <span className="text-xs text-slate-400">
                  {useSampleData ? 'Sample concept drafts' : 'Real model output'}
                </span>
              </div>

              {ideas.map((idea, idx) => (
                <Card key={idea.id} hoverable>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge size="sm" variant="violet">
                          Idea #{idx + 1}
                        </Badge>
                        <Badge size="sm" variant="neutral">
                          {idea.format.toUpperCase()}
                        </Badge>
                        {idea.isSample && (
                          <Badge size="sm" variant="sample">
                            SAMPLE
                          </Badge>
                        )}
                        {/* Status selector */}
                        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-md p-0.5 text-[10px]">
                          {(['draft', 'planned', 'rejected'] as ContentStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleUpdateStatus(idea.id, st)}
                              className={`px-1.5 py-0.5 rounded capitalize font-medium cursor-pointer transition-colors ${
                                idea.status === st || (!idea.status && st === 'draft')
                                  ? st === 'planned'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold'
                                    : st === 'rejected'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleStartEdit(idea)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={
                            copiedId === idea.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )
                          }
                          onClick={() =>
                            handleCopyCaption(
                              idea.id,
                              `${idea.hook}\n\n${idea.caption}\n\n${idea.hashtags.join(' ')}`
                            )
                          }
                        >
                          {copiedId === idea.id ? 'Copied' : 'Copy'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          leftIcon={<FlaskConical className="w-3.5 h-3.5 text-indigo-600" />}
                          onClick={() => navigate('/campaigns', { state: { fromIdea: idea } })}
                        >
                          Create campaign from this idea
                        </Button>
                      </div>
                    </div>

                    {/* Inline Edit Form OR Hook Display */}
                    {editingId === idea.id ? (
                      <div className="mt-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/30 space-y-3">
                        <Input
                          label="Hook Headline"
                          value={editForm.hook}
                          onChange={(e) => setEditForm({ ...editForm, hook: e.target.value })}
                        />
                        <Textarea
                          label="Caption Draft"
                          value={editForm.caption}
                          onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                          rows={3}
                        />
                        <Input
                          label="Call to Action (CTA)"
                          value={editForm.callToAction}
                          onChange={(e) => setEditForm({ ...editForm, callToAction: e.target.value })}
                        />
                        <Input
                          label="Hashtags (space separated)"
                          value={editForm.hashtags}
                          onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value })}
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" variant="primary" onClick={() => handleSaveEdit(idea.id)}>
                            Save Edits
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CardTitle className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
                        "{idea.hook}"
                      </CardTitle>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    {/* Caption */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Caption Draft
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        {idea.caption}
                      </p>
                    </div>

                    {/* Script Outline */}
                    {idea.scriptOutline && idea.scriptOutline.length > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <ListOrdered className="w-3.5 h-3.5" />
                          Script / Slide Sequence
                        </span>
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {idea.scriptOutline.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-mono">
                                {sIdx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Hashtags & CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {idea.hashtags.map((h, hIdx) => (
                          <span
                            key={hIdx}
                            className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>CTA:</strong> {idea.callToAction}
                      </div>
                    </div>

                    {/* "Why This Recommendation" Panel */}
                    <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-900 dark:text-violet-200">
                        <Lightbulb className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <span>Why this recommendation:</span>
                      </div>
                      <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">
                        {idea.whyThisRecommendation}
                      </p>
                    </div>

                    {/* "Memories Used" Panel - ONLY rendered if non-empty */}
                    {idea.memoriesUsed && idea.memoriesUsed.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                          <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Hindsight Memories Used:</span>
                        </div>
                        <div className="space-y-1">
                          {idea.memoriesUsed.map((mem, mIdx) => (
                            <div
                              key={mIdx}
                              className="text-[11px] text-indigo-800 dark:text-indigo-300 font-mono flex items-start gap-1.5"
                            >
                              <span className="text-indigo-400">•</span>
                              <span>{mem}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 4: "Let Me Teach The Agent" (Approve & Reject with Hindsight retention) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-indigo-600" />
                          Teach The Agent:
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={idea.status === 'planned' ? 'primary' : 'outline'}
                            size="sm"
                            className="text-xs h-7"
                            leftIcon={<ThumbsUp className="w-3 h-3 text-emerald-600" />}
                            onClick={() => handleOpenFeedback(idea, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant={idea.status === 'rejected' ? 'destructive' : 'outline'}
                            size="sm"
                            className="text-xs h-7"
                            leftIcon={<ThumbsDown className="w-3 h-3 text-rose-600" />}
                            onClick={() => handleOpenFeedback(idea, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>

                      {/* Active Teaching / Lesson Retention Box */}
                      {activeFeedbackId === idea.id && (
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <span>
                              {feedbackDecision === 'approve'
                                ? 'Approve & Retain Success Lesson'
                                : 'Reject & Retain Improvement Lesson'}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                                feedbackDecision === 'approve'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {feedbackDecision}
                            </span>
                          </div>

                          <Textarea
                            placeholder={`Explain why you ${feedbackDecision}d this concept for Hindsight to remember...`}
                            value={feedbackReason}
                            onChange={(e) => setFeedbackReason(e.target.value)}
                            rows={2}
                          />

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs"
                              isLoading={isRetainingLesson}
                              onClick={() => handleSaveLessonToHindsight(idea)}
                              leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
                            >
                              Save as lesson in Hindsight
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                setActiveFeedbackId(null);
                                setRetainResult(null);
                              }}
                            >
                              Dismiss
                            </Button>
                          </div>

                          {/* Real Feedback Status Indicator */}
                          {retainResult && (
                            <div
                              className={`p-2 rounded text-xs flex items-start gap-1.5 ${
                                retainResult.success
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                              }`}
                            >
                              {retainResult.success ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              )}
                              <div className="leading-relaxed">
                                <strong className="block font-semibold">
                                  {retainResult.success
                                    ? 'Saved into Hindsight Memory Bank!'
                                    : 'Retain Failed:'}
                                </strong>
                                <span>{retainResult.message}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
