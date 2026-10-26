import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Eye,
  TrendingUp,
  BrainCircuit,
  Upload,
  Sparkles,
  ArrowUpRight,
  Bookmark,
  Share2,
  Calendar,
  Layers,
  Info,
  CheckCircle2,
  Check,
  XCircle,
  AlertTriangle,
  FlaskConical,
  Sliders,
  GitCompare,
  Lightbulb,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  EmptyState,
  Tooltip,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import {
  calculateEngagementRate,
  formatMetricPercentage,
  formatCount,
  METRIC_DENOMINATORS,
} from '../lib/metrics.ts';
import { SAMPLE_RECOMMENDATIONS, IRLVANSH_ACCOUNT_INSIGHTS } from '../lib/sampleData.ts';
import { LabRun } from '../types/index.ts';
import { fetchUserLabRuns } from '../lib/db.ts';

export function Dashboard() {
  const {
    posts,
    useSampleData,
    setUseSampleData,
    setIsCSVModalOpen,
    campaigns,
    memoryEvents,
    currentUser,
  } = useApp();

  const [latestLabRun, setLatestLabRun] = useState<LabRun | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserLabRuns(currentUser.id)
        .then((runs) => {
          if (runs && runs.length > 0) {
            setLatestLabRun(runs[0]);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const isEmpty = posts.length === 0;

  // Aggregate metrics using pure functions (only count posts with non-null reach and metrics)
  const totalPosts = posts.length;
  const postsWithReach = posts.filter((p) => p.reach !== null && p.reach !== undefined && p.reach > 0);
  const totalReach = postsWithReach.length > 0
    ? postsWithReach.reduce((sum, p) => sum + (p.reach ?? 0), 0)
    : null;

  const fullyTrackedPosts = posts.filter(
    (p) =>
      p.reach !== null &&
      p.reach !== undefined &&
      p.reach > 0 &&
      p.likes !== null &&
      p.comments !== null &&
      p.shares !== null &&
      p.saves !== null
  );

  const aggregateEngagementRate = fullyTrackedPosts.length > 0 && totalReach
    ? calculateEngagementRate({
        reach: fullyTrackedPosts.reduce((sum, p) => sum + (p.reach ?? 0), 0),
        likes: fullyTrackedPosts.reduce((sum, p) => sum + (p.likes ?? 0), 0),
        comments: fullyTrackedPosts.reduce((sum, p) => sum + (p.comments ?? 0), 0),
        shares: fullyTrackedPosts.reduce((sum, p) => sum + (p.shares ?? 0), 0),
        saves: fullyTrackedPosts.reduce((sum, p) => sum + (p.saves ?? 0), 0),
      })
    : null;

  // Real Memory Statistics
  const lessonsRetainedCount = React.useMemo(() => {
    const fromCampaigns = (campaigns || []).filter((c) => !!c.lessonRetainedAt).length;
    const fromEvents = (memoryEvents || []).filter((e) => e.operation === 'retain' && e.status === 'success').length;
    return Math.max(fromCampaigns, fromEvents);
  }, [campaigns, memoryEvents]);

  const successfulRecallsCount = React.useMemo(() => {
    return (memoryEvents || []).filter((e) => e.operation === 'recall' && e.status === 'success').length;
  }, [memoryEvents]);

  const failedCallsCount = React.useMemo(() => {
    return (memoryEvents || []).filter((e) => e.status === 'failed').length;
  }, [memoryEvents]);

  // Latest campaign with evaluated outcome
  const latestCampaignOutcome = React.useMemo(() => {
    return (campaigns || []).find((c) => !!c.outcome);
  }, [campaigns]);

  // Best performing posts sorted by Engagement Rate or Save Rate
  const bestPosts = React.useMemo(() => {
    return [...posts]
      .filter((p) => p.engagementRate !== null && p.engagementRate !== undefined)
      .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
      .slice(0, 5);
  }, [posts]);

  // Recent recommendations
  const recentRecommendations = useSampleData ? SAMPLE_RECOMMENDATIONS.slice(0, 2) : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Growth Intelligence Dashboard
            </h2>
            {useSampleData && (
              <Badge variant="sample" size="md">
                SAMPLE DATA
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time delivery telemetry, memory-informed recommendations, and campaign experiment outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsCSVModalOpen(true)}
          >
            Import CSV
          </Button>
          {!useSampleData && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => setUseSampleData(true)}
            >
              Load Sample Data
            </Button>
          )}
        </div>
      </div>

      {/* Creator Profile & Verified 90-Day Telemetry Strip */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            @
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {IRLVANSH_ACCOUNT_INSIGHTS.handle}
              </span>
              <Badge variant="violet" size="sm">
                Instagram Creator
              </Badge>
              <Badge variant="emerald" size="sm">
                {IRLVANSH_ACCOUNT_INSIGHTS.period}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified Demographics: Delhi & Metro Youth (60.4% under 25, 75.9% Men) • Focus: High-Retention Short-Form Reels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono divide-x divide-slate-200 dark:divide-slate-800 pt-2 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
              Followers
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {IRLVANSH_ACCOUNT_INSIGHTS.followersFormatted}
            </span>
          </div>
          <div className="pl-4 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
              90D Views
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              {IRLVANSH_ACCOUNT_INSIGHTS.reelViewsFormatted}
            </span>
          </div>
          <div className="pl-4 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
              90D Shares
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {IRLVANSH_ACCOUNT_INSIGHTS.sharesFormatted}
            </span>
          </div>
          <div className="pl-4 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans">
              90D Reach
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {IRLVANSH_ACCOUNT_INSIGHTS.viewersFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* "How Memory Works Here" 4-Step Quick Explainer for Judges */}
      <Card className="border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/50 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-xs">
        <CardHeader className="py-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                How Memory Works in SocialPulse AI (10-Second Primer)
              </CardTitle>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Autonomous Loop: Observe → Retain → Recall → Compare
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-mono">
                  1
                </span>
                <span>Import Delivery Data</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Export real post metrics from Meta Business Suite (reach, impressions, saves). Real delivery is the only source of truth.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-mono">
                  2
                </span>
                <span>Retain Empirical Rules</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Formulate testable hypotheses in Campaigns, evaluate against post outcomes, and store verified lessons in your Hindsight bank.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center text-[10px] font-mono">
                  3
                </span>
                <span>Recall During Ideation</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Content Studio searches your isolated memory bank before querying Gemini, grounding hooks and scripts in what works for you.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-mono">
                  4
                </span>
                <span>Fair A/B Lab Verification</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Memory Lab tests Gemini side-by-side (without memory vs with recalled memory) at fixed 0.3 temp to prove real lift.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* When Empty: Show required EmptyState */}
      {isEmpty ? (
        <EmptyState
          title="No Instagram Data Found"
          description="Import a CSV exported from Meta Business Suite or load our synthetic 60-post creator dataset to preview analytics, recommendations, and memory logs."
          actionLabel="Import a CSV"
          onAction={() => setIsCSVModalOpen(true)}
          secondaryActionLabel="Load Sample Data"
          onSecondaryAction={() => setUseSampleData(true)}
        />
      ) : (
        <>
          {/* Stat Cards with Denominator Tooltips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Posts Analyzed */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Posts Analyzed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {formatCount(totalPosts)}
                  </span>
                  <span className="text-xs text-slate-400">total records</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Last 90 days across Reels, Carousels & Images
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Total Reach with Tooltip */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Total Reach
                    <Tooltip
                      content={
                        <span>
                          <strong>Reach:</strong> Unique accounts that saw your content at least once. Distinct from impressions (total views).
                        </span>
                      }
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </Tooltip>
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {formatCount(totalReach)}
                  </span>
                  <span className="text-xs text-slate-400">unique accounts</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Denominator for all engagement and save rates
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Avg Engagement Rate with Tooltip */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Avg Engagement Rate
                    <Tooltip
                      content={
                        <span>
                          <strong>Formula:</strong> {METRIC_DENOMINATORS.engagementRate.formula}
                          <br />
                          <strong>Denominator:</strong> {METRIC_DENOMINATORS.engagementRate.denominator}
                        </span>
                      }
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </Tooltip>
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatMetricPercentage(aggregateEngagementRate)}
                  </span>
                  <span className="text-xs text-slate-400">weighted avg</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  (Likes + Comments + Shares + Saves) ÷ Reach
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Real Stored Lessons */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Lessons Retained
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                    {lessonsRetainedCount}
                  </span>
                  <span className="text-xs text-slate-400">empirical rules</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Stored in user Hindsight memory bank
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real Memory & Audit Strip */}
          <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <BrainCircuit className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Lessons Retained
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {lessonsRetainedCount} empirical lesson(s) stored
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Successful Recalls
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {successfulRecallsCount} retrieval event(s)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                  failedCallsCount > 0 ? 'bg-rose-600' : 'bg-slate-400'
                }`}
              >
                {failedCallsCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  Failed API Calls
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {failedCallsCount} failed (transparent audit)
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column: Latest Lab Run & Latest Campaign Outcome */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Memory Lab Run */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Latest Memory Lab Comparison
                  </CardTitle>
                  <CardDescription>
                    Controlled A/B evaluation (without memory vs with retrieved memory).
                  </CardDescription>
                </div>
                <Link
                  to="/memory-lab"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Open Lab <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {latestLabRun ? (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {latestLabRun.taskLabel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(latestLabRun.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">Recalled Memories</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {latestLabRun.recalledCount} items
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">A/B Similarity</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {Math.round((latestLabRun.differences?.overallSimilarity ?? 1) * 100)}% overlap
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">Baseline Repeat</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {latestLabRun.baselineRepeat ? 'Evaluated' : 'None'}
                        </span>
                      </div>
                    </div>

                    {latestLabRun.recalled && latestLabRun.recalled.length > 0 && (
                      <div className="p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300">
                        <span className="font-semibold block mb-0.5">Retrieved Memory Sample:</span>
                        <span className="italic font-mono">"{latestLabRun.recalled[0]}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    No Memory Lab comparisons recorded yet.{' '}
                    <Link to="/memory-lab" className="text-indigo-600 underline">
                      Run an A/B evaluation
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Campaign Outcome */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                    Latest Campaign Outcome
                  </CardTitle>
                  <CardDescription>
                    Empirical validation of creator content hypotheses against real delivery.
                  </CardDescription>
                </div>
                <Link
                  to="/campaigns"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View Campaigns <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {latestCampaignOutcome ? (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {latestCampaignOutcome.title}
                      </span>
                      <Badge
                        size="sm"
                        variant={
                          latestCampaignOutcome.outcome?.verdict === 'met'
                            ? 'emerald'
                            : latestCampaignOutcome.outcome?.verdict === 'not met'
                            ? 'rose'
                            : 'amber'
                        }
                      >
                        {latestCampaignOutcome.outcome?.verdict.toUpperCase() || 'EVALUATED'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">Actual {latestCampaignOutcome.targetMetric || 'Metric'}</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {latestCampaignOutcome.outcome?.actualValue !== null
                            ? `${latestCampaignOutcome.outcome?.actualValue?.toFixed(2)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">Format Baseline</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {latestCampaignOutcome.outcome?.baselineValue !== null
                            ? `${latestCampaignOutcome.outcome?.baselineValue?.toFixed(2)}%`
                            : 'N/A'}{' '}
                          <span className="text-[10px] text-slate-400 font-mono">(n={latestCampaignOutcome.outcome?.baselineN})</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 italic text-[11px]">
                      "{latestCampaignOutcome.outcome?.verdictReason}"
                    </p>

                    {latestCampaignOutcome.lessonsLearned && (
                      <div className="p-2.5 rounded bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                        <span className="font-semibold block mb-0.5">Retained Lesson:</span>
                        <span>{latestCampaignOutcome.lessonsLearned}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    No evaluated campaign outcomes yet.{' '}
                    <Link to="/campaigns" className="text-indigo-600 underline">
                      Close the loop on a campaign
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 2-Column: Best Performing Posts & Recent Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Performing Posts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Performing Posts</CardTitle>
                  <CardDescription>
                    Ranked by engagement rate against unique accounts reached.
                  </CardDescription>
                </div>
                {useSampleData && <Badge variant="sample" size="sm">Sample</Badge>}
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bestPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <Badge size="sm" variant="neutral">{post.format}</Badge>
                          <span className="text-xs text-slate-400 font-mono">{post.date}</span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-1 font-medium">
                          {post.caption}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                          {formatMetricPercentage(post.engagementRate)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatCount(post.reach)} reach
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Recommendations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Memory-Informed Recommendations</CardTitle>
                  <CardDescription>
                    Latest concepts generated with Hindsight memory grounding.
                  </CardDescription>
                </div>
                {useSampleData && <Badge variant="sample" size="sm">Sample</Badge>}
              </CardHeader>
              <CardContent className="space-y-4">
                {recentRecommendations.length > 0 ? (
                  recentRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge size="sm" variant="violet">{rec.topic}</Badge>
                        <Badge size="sm" variant="neutral">{rec.format}</Badge>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Hook: "{rec.hook}"
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong className="text-indigo-600 dark:text-indigo-400">Why this recommendation: </strong>
                        {rec.whyThisRecommendation}
                      </p>
                      <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300">
                        <span className="font-semibold block">Hindsight Memory Used:</span>
                        <span>{rec.memoriesUsed[0]}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No recommendations generated yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
