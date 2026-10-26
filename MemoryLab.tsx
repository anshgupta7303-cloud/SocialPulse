import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BrainCircuit,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  History,
  Star,
  Check,
  TrendingUp,
  LineChart as LineChartIcon,
  HelpCircle,
  ArrowRight,
  Layers,
  FileText,
  CheckSquare,
  Circle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { PostFormat, LabRun, LabRatings, RecommendationIdea } from '../types/index.ts';
import { fetchUserLabRuns, updateLabRunRatingsInDb } from '../lib/db.ts';
import { getSupabaseToken } from '../lib/supabaseClient.ts';

export function MemoryLab() {
  const {
    currentUser,
    profile,
    importedPosts,
    campaigns,
    serverMemoryEvents,
    useSampleData,
    hindsightStatus,
    geminiStatus,
    setIsAuthModalOpen,
  } = useApp();

  // Tab State: 'lab' (Runner) | 'curve' (Learning Curve)
  const [activeTab, setActiveTab] = useState<'lab' | 'curve'>('lab');

  // Shared inputs panel state
  const [topic, setTopic] = useState('High-Retention Hooks for Carousels');
  const [format, setFormat] = useState<PostFormat>('carousel');
  const [goal, setGoal] = useState('increase_saves');
  const [audience, setAudience] = useState(profile.targetAudience || 'Tech Creators & Solopreneurs');
  const [objective, setObjective] = useState('Compare how retrieved memories adapt technical slide frameworks.');
  const [cta, setCta] = useState('Save for reference');
  const [numIdeas, setNumIdeas] = useState<number>(2);
  const [repeatBaseline, setRepeatBaseline] = useState<boolean>(true);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<LabRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<LabRun[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Ratings State for Current Run
  const [ratings, setRatings] = useState<{
    scoreA: { relevance: number; personalization: number; evidenceUse: number; usefulness: number };
    scoreB: { relevance: number; personalization: number; evidenceUse: number; usefulness: number };
    notes: string;
  }>({
    scoreA: { relevance: 3, personalization: 3, evidenceUse: 2, usefulness: 3 },
    scoreB: { relevance: 4, personalization: 4, evidenceUse: 4, usefulness: 4 },
    notes: '',
  });
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);

  // Check configuration
  const isHindsightConfigured = hindsightStatus?.configured === true && hindsightStatus.status === 'connected';
  const isGeminiConfigured = geminiStatus?.configured === true;

  // Load history runs from Supabase or server API
  const loadHistory = async () => {
    if (!currentUser) return;
    setIsLoadingHistory(true);
    try {
      const runs = await fetchUserLabRuns(currentUser.id);
      setHistoryRuns(runs);
    } catch {
      // Fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadHistory();
    }
  }, [currentUser]);

  // Handle Run Lab Experiment
  const handleRunExperiment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setRatingSaved(false);

    try {
      const token = (await getSupabaseToken()) || '';
      const res = await fetch('/api/lab/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          format,
          goal,
          audience: audience.trim(),
          objective: objective.trim(),
          cta: cta.trim(),
          numIdeas,
          repeatBaseline,
          taskLabel: `${topic.trim()} (${format})`,
          profileSummary: {
            brandName: profile.brandName,
            niche: profile.niche,
            targetAudience: profile.targetAudience,
            tone: profile.tone,
            goals: profile.goals,
          },
          analyticsSummary: {
            totalPostsSampled: importedPosts.length,
            avgEngagementRate: null,
            avgShareRate: null,
            avgSaveRate: null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Lab run failed (HTTP ${res.status})`);
      }

      setCurrentRun(data);
      // Reset ratings state for new run
      setRatings({
        scoreA: { relevance: 3, personalization: 3, evidenceUse: 2, usefulness: 3 },
        scoreB: { relevance: 4, personalization: 4, evidenceUse: 4, usefulness: 4 },
        notes: '',
      });

      // Refresh history
      loadHistory();
    } catch (err: any) {
      setRunError(err?.message || 'Failed to execute Memory Lab experiment.');
    } finally {
      setIsRunning(false);
    }
  };

  // Handle Save Ratings
  const handleSaveRatings = async () => {
    if (!currentRun || !currentRun.id) return;
    setIsSavingRating(true);

    const payload: LabRatings = {
      scoreA: ratings.scoreA,
      scoreB: ratings.scoreB,
      notes: ratings.notes.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await updateLabRunRatingsInDb(currentRun.id, payload);
      if (res.success) {
        setRatingSaved(true);
        setCurrentRun({ ...currentRun, ratings: payload });
        loadHistory();
      } else {
        // Fallback to server route
        const token = (await getSupabaseToken()) || '';
        await fetch(`/api/lab/run/${encodeURIComponent(currentRun.id)}/rating`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ratings: payload }),
        });
        setRatingSaved(true);
        setCurrentRun({ ...currentRun, ratings: payload });
        loadHistory();
      }
    } catch (err) {
      console.error('Failed to save ratings:', err);
    } finally {
      setIsSavingRating(false);
    }
  };

  // Restore a historical run into the inspector without regeneration
  const handleSelectHistoryRun = (run: LabRun) => {
    setCurrentRun(run);
    if (run.ratings) {
      setRatings({
        scoreA: run.ratings.scoreA,
        scoreB: run.ratings.scoreB,
        notes: run.ratings.notes || '',
      });
      setRatingSaved(true);
    } else {
      setRatingSaved(false);
    }
  };

  // Learning curve calculation from history runs (min 2 runs required)
  const learningCurveData = React.useMemo(() => {
    if (historyRuns.length < 2) return null;

    // Sort chronologically ascending for the line chart
    const sorted = [...historyRuns].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((run, idx) => {
      const dateLabel = new Date(run.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      // Calculate average user rating for B if present
      let avgRatingB: number | null = null;
      let avgRatingA: number | null = null;
      if (run.ratings) {
        const b = run.ratings.scoreB;
        avgRatingB = Math.round(((b.relevance + b.personalization + b.evidenceUse + b.usefulness) / 4) * 10) / 10;
        const a = run.ratings.scoreA;
        avgRatingA = Math.round(((a.relevance + a.personalization + a.evidenceUse + a.usefulness) / 4) * 10) / 10;
      }

      const similarityPct = run.differences?.overallSimilarity !== undefined
        ? Math.round(run.differences.overallSimilarity * 100)
        : null;

      return {
        runNum: `#${idx + 1}`,
        date: dateLabel,
        task: run.taskLabel,
        recalledCount: run.recalledCount || 0,
        similarityPct,
        ratingB: avgRatingB,
        ratingA: avgRatingA,
      };
    });
  }, [historyRuns]);

  // Guided Demo Flow Checklist State
  const hasRealPosts = importedPosts.some((p) => !p.isSample);
  const isMemoryConnected = hindsightStatus?.status === 'connected';
  const hasGeneratedWithMemory = (serverMemoryEvents || []).some((e) => e.operation === 'recall');
  const hasLabRun = historyRuns.length > 0 || currentRun !== null;
  const hasLinkedCampaign = (campaigns || []).some((c) => !c.isSample && !!c.linkedPostId);
  const hasRetainedLesson = (campaigns || []).some((c) => !c.isSample && !!c.lessonRetainedAt);


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Memory Lab: Controlled A/B Experiment
            </h2>
            <Badge variant="violet">Controlled Protocol</Badge>
            {useSampleData && <Badge variant="sample">SAMPLE DATA ACTIVE</Badge>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reproducible comparison: Test A (Zero-Shot) vs. Test B (Hindsight Memory). Low fixed temperature (0.3), shared prompt template, code-calculated differences.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'lab'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            A/B Experiment Runner
          </button>
          <button
            onClick={() => setActiveTab('curve')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'curve'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Learning Curve
          </button>
        </div>
      </div>

      {/* Setup Required Banner if Gemini or Hindsight is missing */}
      {(!isGeminiConfigured || !isHindsightConfigured) && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
              Setup Required for Live Memory Lab
            </h4>
            <p>
              {!isGeminiConfigured && 'GEMINI_API_KEY is not configured in secrets. '}
              {!isHindsightConfigured && 'HINDSIGHT_API_KEY is not configured in secrets. '}
              Configure keys in AI Studio Secrets to execute real model generation and Hindsight bank lookups.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: EXPERIMENT RUNNER */}
      {activeTab === 'lab' && (
        <div className="space-y-6">

          {/* Shared Inputs Panel */}
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Shared Inputs Panel (Fixed Temperature: 0.3)
                </CardTitle>
                <span className="text-[11px] font-mono text-slate-400">
                  Model: {geminiStatus?.model || 'gemini-3.8-flash'} • Temp: 0.3
                </span>
              </div>
              <CardDescription>
                Both Test A and Test B evaluate against this exact same brief, temperature, and JSON schema. The ONLY independent variable is the recalled memory block.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="Topic / Subject"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Visual Carousel Frameworks"
                />
                <Select
                  label="Post Format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as PostFormat)}
                  options={[
                    { value: 'carousel', label: 'Carousel (Multi-slide)' },
                    { value: 'reel', label: 'Reel (Short Video)' },
                    { value: 'static_image', label: 'Static Image' },
                    { value: 'story', label: 'Story' },
                  ]}
                />
                <Select
                  label="Optimization Goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  options={[
                    { value: 'increase_saves', label: 'Increase Bookmark Saves' },
                    { value: 'increase_shares', label: 'Increase Direct Shares' },
                    { value: 'increase_comments', label: 'Increase Comment Rate' },
                    { value: 'profile_growth', label: 'Maximize Profile Visits' },
                  ]}
                />
                <Input
                  label="Target Audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Experiment Objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  />
                </div>
                <Input
                  label="Call to Action (CTA)"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />
              </div>

              {/* Lab Controls & Baseline Repeat Checkbox */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={repeatBaseline}
                    onChange={(e) => setRepeatBaseline(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Include baseline repeat (A')</strong> — Run Test A a second time to measure natural output variation without memory.
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  {currentRun && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunExperiment()}
                      disabled={isRunning}
                      leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                    >
                      Re-run with Same Inputs
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRunExperiment()}
                    isLoading={isRunning}
                    disabled={!topic.trim()}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Run Memory Lab
                  </Button>
                </div>
              </div>

              {runError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                  <strong>Run Error:</strong> {runError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Run Side-by-Side Comparison */}
          {currentRun ? (
            <div className="space-y-6">
              {/* Dual Column: Test A vs Test B */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Test A (Without memory) */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <CardTitle className="text-sm">Test A: Without Memory (Zero-Shot)</CardTitle>
                      </div>
                      <Badge
                        size="sm"
                        variant={currentRun.aSucceeded ? 'neutral' : 'rose'}
                      >
                        {currentRun.aSucceeded ? 'Succeeded (0 Memories)' : 'Failed'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Standard prompt with no past memory block. Raw model capabilities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 text-xs">
                    {currentRun.outputA.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 italic">
                        {currentRun.errors.geminiA || 'No concepts generated for Test A.'}
                      </div>
                    ) : (
                      currentRun.outputA.map((idea, idx) => (
                        <div
                          key={idea.id || idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                              Concept #{idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400">{idea.format}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Hook
                            </span>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              "{idea.hook}"
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Outline
                            </span>
                            <ul className="space-y-1 text-slate-600 dark:text-slate-400 pl-3 list-disc">
                              {idea.scriptOutline.slice(0, 4).map((pt, pIdx) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                              CTA
                            </span>
                            <p className="text-slate-600 dark:text-slate-400">{idea.callToAction}</p>
                          </div>

                          {idea.hashtags && idea.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {idea.hashtags.map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] text-slate-500 font-mono">
                                  #{tag.replace(/^#/, '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Right Column: Test B (With retrieved memory) */}
                <Card className="border-indigo-300 dark:border-indigo-800 shadow-sm">
                  <CardHeader className="bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <CardTitle className="text-sm text-indigo-950 dark:text-indigo-100">
                          Test B: With Retrieved Memory
                        </CardTitle>
                      </div>
                      <Badge
                        size="sm"
                        variant={
                          !currentRun.memorySucceeded || currentRun.recalledCount === 0
                            ? 'amber'
                            : currentRun.bSucceeded
                            ? 'violet'
                            : 'rose'
                        }
                      >
                        {!currentRun.memorySucceeded
                          ? 'Recall Failed'
                          : currentRun.recalledCount === 0
                          ? 'No Memory Available'
                          : `${currentRun.recalledCount} Facts Injected`}
                      </Badge>
                    </div>
                    <CardDescription>
                      Same prompt augmented with verified past learnings from Hindsight.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 text-xs">
                    {currentRun.recalledCount === 0 && (
                      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-[11px]">
                        <strong>No Memory Available:</strong> Hindsight returned 0 matching memories for this query. Test B generated without memory augmentation.
                      </div>
                    )}

                    {currentRun.outputB.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 italic">
                        {currentRun.errors.geminiB || 'No concepts generated for Test B.'}
                      </div>
                    ) : (
                      currentRun.outputB.map((idea, idx) => (
                        <div
                          key={idea.id || idx}
                          className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                              Concept #{idx + 1} • Augmented
                            </span>
                            <span className="text-[10px] text-slate-400">{idea.format}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">
                              Hook
                            </span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              "{idea.hook}"
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Outline
                            </span>
                            <ul className="space-y-1 text-slate-700 dark:text-slate-300 pl-3 list-disc">
                              {idea.scriptOutline.slice(0, 4).map((pt, pIdx) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                              CTA
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{idea.callToAction}</p>
                          </div>

                          {/* Strictly verified memory citations */}
                          {idea.memoriesUsed && idea.memoriesUsed.length > 0 && (
                            <div className="p-2 rounded-lg bg-indigo-100/50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-[11px] space-y-1">
                              <span className="font-bold text-indigo-700 dark:text-indigo-300 block">
                                Cited Hindsight Memories:
                              </span>
                              {idea.memoriesUsed.map((mem, mIdx) => (
                                <div key={mIdx} className="font-mono text-[10px] text-indigo-900 dark:text-indigo-200">
                                  • "{mem}"
                                </div>
                              ))}
                            </div>
                          )}

                          {idea.hashtags && idea.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {idea.hashtags.map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                  #{tag.replace(/^#/, '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Baseline Repeat (A') Panel if executed */}
              {currentRun.baselineRepeat && currentRun.baselineRepeat.length > 0 && (
                <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        Baseline Repeat Check (Test A' Natural Variation)
                      </CardTitle>
                      <Badge size="sm" variant="neutral">
                        Variation Similarity: {((currentRun.differences.baselineSimilarity ?? 1.0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <CardDescription>
                      Ran Test A a second time with identical inputs to quantify natural LLM variability vs. intentional memory adaptation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-1 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentRun.baselineRepeat.map((idea, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <span className="text-[10px] font-mono text-slate-400 block mb-1">Repeat A' #{idx + 1}</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">"{idea.hook}"</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Retrieved Memories Panel & Differences Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Retrieved Memories Panel */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                        Retrieved Memories from Hindsight ({currentRun.recalledCount})
                      </CardTitle>
                      <span className="text-[10px] font-mono text-slate-400">Exact Hindsight Store</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {currentRun.recalled.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No memories were returned by Hindsight for this query.
                      </div>
                    ) : (
                      currentRun.recalled.map((mem, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-2.5 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] font-mono text-slate-800 dark:text-slate-200"
                        >
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">
                            [Fact #{mIdx + 1}]:
                          </span>
                          "{mem}"
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Differences Panel (Code-computed facts first, AI explanation second) */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                        Differences Analysis (Code Computed)
                      </CardTitle>
                      <span className="text-[10px] font-mono text-slate-400">
                        A vs B Similarity: {((currentRun.differences?.overallSimilarity ?? 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {/* Code-computed factual bullets */}
                    <div className="space-y-1.5">
                      {currentRun.differences?.factualSummary?.map((fact, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>

                    {/* AI explanation clearly labeled */}
                    {currentRun.differences?.aiExplanation && (
                      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        <span className="font-semibold not-italic block text-slate-800 dark:text-slate-200 mb-0.5">
                          {currentRun.differences.aiExplanation.split(':')[0]}:
                        </span>
                        {currentRun.differences.aiExplanation.split(':').slice(1).join(':')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Status Row */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {currentRun.memorySucceeded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Recall: {currentRun.memorySucceeded ? `Succeeded (${currentRun.recalledCount} facts)` : currentRun.errors.hindsight || 'Failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentRun.aSucceeded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Test A: {currentRun.aSucceeded ? 'Succeeded' : currentRun.errors.geminiA || 'Failed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentRun.bSucceeded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Test B: {currentRun.bSucceeded ? 'Succeeded' : currentRun.errors.geminiB || 'Failed'}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-400">
                  Run ID: {currentRun.id}
                </span>
              </div>

              {/* Human Rating Panel (User scores A and B; never auto-picks winner) */}
              <Card className="border-indigo-200 dark:border-indigo-900/60">
                <CardHeader className="py-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Creator Evaluation & Rating Panel
                      </CardTitle>
                      <CardDescription>
                        Strict Rule: The system never declares a winner automatically. Rate both outputs from 1 (poor) to 5 (excellent).
                      </CardDescription>
                    </div>
                    {ratingSaved && (
                      <Badge variant="emerald" size="sm">
                        Ratings Saved to DB
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Score Test A */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                        Rate Test A (Zero-Shot Standard)
                      </span>
                      {(['relevance', 'personalization', 'evidenceUse', 'usefulness'] as const).map((dim) => (
                        <div key={dim} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-700 dark:text-slate-300">
                            {dim === 'evidenceUse' ? 'Evidence Use' : dim}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setRatings((prev) => ({
                                    ...prev,
                                    scoreA: { ...prev.scoreA, [dim]: val },
                                  }))
                                }
                                className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                  ratings.scoreA[dim] === val
                                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Score Test B */}
                    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                        Rate Test B (With Retrieved Memory)
                      </span>
                      {(['relevance', 'personalization', 'evidenceUse', 'usefulness'] as const).map((dim) => (
                        <div key={dim} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-slate-700 dark:text-slate-300">
                            {dim === 'evidenceUse' ? 'Evidence Use' : dim}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setRatings((prev) => ({
                                    ...prev,
                                    scoreB: { ...prev.scoreB, [dim]: val },
                                  }))
                                }
                                className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                  ratings.scoreB[dim] === val
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 italic">
                      Scores persist in Supabase `lab_runs` to power the empirical Learning Curve tab.
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveRatings}
                      isLoading={isSavingRating}
                    >
                      {ratingSaved ? 'Update Saved Ratings' : 'Save Evaluation to Run'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/40 dark:bg-slate-900/20">
              <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Ready to Run Memory Lab Protocol
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure your brief above and click "Run Memory Lab". The system will execute Test A (zero-shot) and Test B (with Hindsight recall) with identical temperature 0.3, then compute token similarities and structural differences.
              </p>
            </div>
          )}

          {/* Run History List */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  Saved Lab Runs History ({historyRuns.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  isLoading={isLoadingHistory}
                  leftIcon={<RotateCw className="w-3 h-3" />}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {historyRuns.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No previous lab runs recorded in database. Run your first experiment above.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyRuns.slice(0, 10).map((run) => (
                    <div
                      key={run.id}
                      onClick={() => handleSelectHistoryRun(run)}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between gap-4 transition-colors ${
                        currentRun?.id === run.id ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {run.taskLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Recalled: <strong>{run.recalledCount}</strong> memories</span>
                          <span>
                            Similarity: <strong>{((run.differences?.overallSimilarity ?? 1) * 100).toFixed(1)}%</strong>
                          </span>
                          {run.ratings && (
                            <span className="text-indigo-600 dark:text-indigo-400">
                              Rated: B ({(
                                (run.ratings.scoreB.relevance +
                                  run.ratings.scoreB.personalization +
                                  run.ratings.scoreB.evidenceUse +
                                  run.ratings.scoreB.usefulness) / 4
                              ).toFixed(1)}★)
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Inspect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: LEARNING CURVE */}
      {activeTab === 'curve' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <CardTitle>Empirical Memory Learning Curve</CardTitle>
              </div>
              <CardDescription>
                Tracks how memory recall depth and user evaluation scores evolve across repeated lab runs. Built purely from saved runs in Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyRuns.length < 2 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Insufficient Runs for Trend Analysis
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    At least 2 saved lab runs are required to compute learning curve trajectories and similarity deltas over time. Execute and save at least two runs in the A/B Experiment tab to unlock this chart.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Recharts LineChart */}
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={learningCurveData || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="runNum" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" domain={[0, 'auto']} tick={{ fontSize: 11 }} label={{ value: 'Recalled Facts', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[1, 5]} tick={{ fontSize: 11 }} label={{ value: 'Avg User Rating (1-5)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="recalledCount" name="Recalled Memories Count" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="ratingB" name="User Rating Test B (Memory)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        <Line yAxisId="right" type="monotone" dataKey="ratingA" name="User Rating Test A (Zero-Shot)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* A/B Similarity Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-800">
                      Similarity Change & Rating Delta Over Time
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-2.5">Run #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Task Label</th>
                          <th className="p-2.5">Recalled Facts</th>
                          <th className="p-2.5">A vs B Overlap</th>
                          <th className="p-2.5">Score A</th>
                          <th className="p-2.5">Score B</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(learningCurveData || []).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{row.runNum}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">{row.date}</td>
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{row.task}</td>
                            <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{row.recalledCount}</td>
                            <td className="p-2.5 font-mono">{row.similarityPct !== null ? `${row.similarityPct}%` : 'N/A'}</td>
                            <td className="p-2.5 text-slate-500">{row.ratingA !== null ? `${row.ratingA} ★` : '—'}</td>
                            <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">{row.ratingB !== null ? `${row.ratingB} ★` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
