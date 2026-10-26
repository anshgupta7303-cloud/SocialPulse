import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Target,
  Plus,
  FlaskConical,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  Lightbulb,
  Trash2,
  Link2,
  Sparkles,
  BrainCircuit,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  HelpCircle,
  Check,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import {
  Campaign,
  PostFormat,
  TargetMetric,
  TargetDirection,
  PostMetricData,
  CampaignOutcome,
  RecommendationIdea,
} from '../types/index.ts';
import {
  computeCampaignBaseline,
  getPostMetricValue,
  evaluateCampaignOutcome,
  isDuplicateLesson,
} from '../lib/campaignEngine.ts';
import { retainMemory, draftCampaignLesson } from '../lib/hindsightClient.ts';
import { formatMetricPercentage, formatCount } from '../lib/metrics.ts';

export function Campaigns() {
  const location = useLocation();
  const {
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    importedPosts,
    useSampleData,
    setUseSampleData,
    refreshServerMemoryEvents,
    hindsightStatus,
  } = useApp();

  const [showForm, setShowForm] = useState(false);

  // Form local state
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [format, setFormat] = useState<PostFormat>('reel');
  const [topic, setTopic] = useState('');
  const [targetMetric, setTargetMetric] = useState<TargetMetric>('save_rate');
  const [targetDirection, setTargetDirection] = useState<TargetDirection>('above_baseline');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [linkedIdeaId, setLinkedIdeaId] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Active interactive states per campaign
  const [selectedPostIds, setSelectedPostIds] = useState<Record<string, string>>({});
  const [isDraftingLesson, setIsDraftingLesson] = useState<Record<string, boolean>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [editableDrafts, setEditableDrafts] = useState<Record<string, string>>({});
  const [isRetainingLesson, setIsRetainingLesson] = useState<Record<string, boolean>>({});
  const [retainFeedback, setRetainFeedback] = useState<Record<string, { success: boolean; message: string }>>({});

  // Only real imported posts (never sample data) can be linked
  const realImportedPosts = React.useMemo(() => {
    return (importedPosts || []).filter(
      (p) => !p.isSample && (!p.id || (!p.id.startsWith('sample') && !p.id.startsWith('post-sample')))
    );
  }, [importedPosts]);

  // Handle incoming idea pre-fill from Content Studio navigation
  useEffect(() => {
    const fromIdea = location.state?.fromIdea as RecommendationIdea | undefined;
    if (fromIdea) {
      setTitle(`Experiment: ${fromIdea.topic} - ${fromIdea.hook.slice(0, 30)}...`);
      setTopic(fromIdea.topic);
      setFormat(fromIdea.format);
      setHypothesis(
        fromIdea.predictedHypothesis ||
          `If we use "${fromIdea.hook}" as the hook, then save rate will increase because ${fromIdea.whyThisRecommendation || 'it addresses a specific pain point'}.`
      );
      setObjective(fromIdea.whyThisRecommendation || 'Increase audience retention and bookmarking frequency.');
      setExpectedOutcome('Save rate exceeds format baseline');
      setLinkedIdeaId(fromIdea.id);
      setShowForm(true);

      // Clean history state so reload doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Dynamic preview of baseline for the currently configured format & metric
  const liveBaseline = React.useMemo(() => {
    return computeCampaignBaseline(realImportedPosts, format, targetMetric, null);
  }, [realImportedPosts, format, targetMetric]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Campaign title is required.';
    if (!objective.trim()) newErrors.objective = 'Objective statement is required.';
    if (!hypothesis.trim()) newErrors.hypothesis = 'Hypothesis statement is required (If... then...).';
    if (!topic.trim()) newErrors.topic = 'Topic is required.';
    if (!expectedOutcome.trim()) newErrors.expectedOutcome = 'Expected outcome metric is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // Compute baseline value and n in code from real published posts of same format
    const baseline = computeCampaignBaseline(realImportedPosts, format, targetMetric, null);

    addCampaign({
      title,
      objective,
      hypothesis,
      format,
      topic,
      plannedDate,
      expectedOutcome,
      status: 'planning',
      targetMetric,
      targetDirection,
      baselineValue: baseline.baselineValue,
      baselineN: baseline.baselineN,
      linkedIdeaId,
    });

    // Reset & close
    setTitle('');
    setObjective('');
    setHypothesis('');
    setTopic('');
    setExpectedOutcome('');
    setLinkedIdeaId(null);
    setShowForm(false);
  };

  // Close the Loop: 1. Link Real Post
  const handleSelectPostForCampaign = (campaignId: string, postId: string) => {
    setSelectedPostIds((prev) => ({ ...prev, [campaignId]: postId }));
    updateCampaign(campaignId, { linkedPostId: postId });
  };

  // Close the Loop: 2. Evaluate Outcome in Code
  const handleEvaluateOutcome = (campaign: Campaign) => {
    const postId = selectedPostIds[campaign.id] || campaign.linkedPostId;
    if (!postId) return;

    const linkedPost = realImportedPosts.find((p) => p.id === postId);
    if (!linkedPost) return;

    const metric = campaign.targetMetric || 'save_rate';
    const actualVal = getPostMetricValue(linkedPost, metric);

    if (actualVal === null) return;

    // Recalculate baseline excluding the linked post
    const baseline = computeCampaignBaseline(
      realImportedPosts,
      campaign.format,
      metric,
      linkedPost.id
    );

    const outcome = evaluateCampaignOutcome({
      actualValue: actualVal,
      baselineValue: baseline.baselineValue,
      baselineN: baseline.baselineN,
      targetDirection: campaign.targetDirection || 'above_baseline',
      targetMetric: metric,
    });

    const resultsSummary = `Actual: ${actualVal.toFixed(2)}% vs Baseline ${baseline.baselineValue !== null ? baseline.baselineValue.toFixed(2) : 'N/A'}% (n=${baseline.baselineN}). Verdict: ${outcome.verdict.toUpperCase()}.`;

    updateCampaign(campaign.id, {
      outcome,
      status: 'completed',
      actualResults: resultsSummary,
      baselineValue: baseline.baselineValue,
      baselineN: baseline.baselineN,
    });
  };

  // Close the Loop: 3. Draft Lesson via Server Route
  const handleDraftLesson = async (campaign: Campaign) => {
    setIsDraftingLesson((prev) => ({ ...prev, [campaign.id]: true }));
    setDraftErrors((prev) => ({ ...prev, [campaign.id]: '' }));

    try {
      const res = await draftCampaignLesson(campaign.id);
      if (res.success && res.lessonDraft) {
        setEditableDrafts((prev) => ({ ...prev, [campaign.id]: res.lessonDraft! }));
        updateCampaign(campaign.id, { lessonDraft: res.lessonDraft });
      } else {
        setDraftErrors((prev) => ({
          ...prev,
          [campaign.id]: res.message || 'Failed to draft lesson from experiment outcome.',
        }));
      }
    } catch (err: any) {
      setDraftErrors((prev) => ({
        ...prev,
        [campaign.id]: `Error drafting lesson: ${err?.message || 'Network error'}`,
      }));
    } finally {
      setIsDraftingLesson((prev) => ({ ...prev, [campaign.id]: false }));
    }
  };

  // Close the Loop: 4. Retain in Hindsight
  const handleRetainLesson = async (campaign: Campaign) => {
    const textToRetain = editableDrafts[campaign.id] || campaign.lessonDraft;
    if (!textToRetain || !textToRetain.trim()) {
      setRetainFeedback((prev) => ({
        ...prev,
        [campaign.id]: { success: false, message: 'Lesson draft cannot be empty.' },
      }));
      return;
    }

    // Check duplicate retention
    const dupCheck = isDuplicateLesson(
      campaign.lessonDraft,
      campaign.lessonRetainedAt,
      textToRetain
    );

    if (dupCheck.isDuplicate && dupCheck.reason) {
      setRetainFeedback((prev) => ({
        ...prev,
        [campaign.id]: { success: false, message: dupCheck.reason! },
      }));
      return;
    }

    setIsRetainingLesson((prev) => ({ ...prev, [campaign.id]: true }));
    setRetainFeedback((prev) => ({ ...prev, [campaign.id]: { success: false, message: '' } }));

    try {
      const res = await retainMemory(textToRetain, {
        campaignId: campaign.id,
        date: new Date().toISOString(),
        verdict: campaign.outcome?.verdict || 'inconclusive',
        n: campaign.outcome?.baselineN || campaign.baselineN || 0,
        type: 'campaign_lesson',
      });

      if (res.success) {
        const retainedAt = new Date().toISOString();
        const eventId = res.memoryEventId || null;

        updateCampaign(campaign.id, {
          lessonDraft: textToRetain,
          lessonsLearned: textToRetain,
          lessonRetainedAt: retainedAt,
          lessonMemoryEventId: eventId,
        });

        setRetainFeedback((prev) => ({
          ...prev,
          [campaign.id]: {
            success: true,
            message: `Lesson retained into Hindsight memory bank!`,
          },
        }));

        refreshServerMemoryEvents();
      } else {
        setRetainFeedback((prev) => ({
          ...prev,
          [campaign.id]: {
            success: false,
            message: res.message || 'Failed to retain memory into Hindsight.',
          },
        }));
      }
    } catch (err: any) {
      setRetainFeedback((prev) => ({
        ...prev,
        [campaign.id]: {
          success: false,
          message: `Network error: ${err?.message || 'Retain request failed'}`,
        },
      }));
    } finally {
      setIsRetainingLesson((prev) => ({ ...prev, [campaign.id]: false }));
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="emerald">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="amber">In Progress</Badge>;
      case 'planning':
        return <Badge variant="violet">Planning</Badge>;
      case 'abandoned':
        return <Badge variant="rose">Abandoned</Badge>;
    }
  };

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case 'met':
        return <Badge variant="emerald" size="sm">Verdict: Hypothesis Met</Badge>;
      case 'not met':
        return <Badge variant="rose" size="sm">Verdict: Not Met (Contradicted)</Badge>;
      case 'inconclusive':
      default:
        return <Badge variant="amber" size="sm">Verdict: Inconclusive (Baseline &lt; 3)</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Growth Experiments & Campaigns
            </h2>
            {useSampleData && <Badge variant="sample">SAMPLE DATA</Badge>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Close the loop: formulate falsifiable hypotheses, evaluate against real post delivery data, and retain validated lessons into Hindsight.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Close Experiment Form' : 'New Growth Experiment'}
        </Button>
      </div>

      {/* Create Campaign Form Modal / Collapsible */}
      {showForm && (
        <Card className="border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                Configure Growth Experiment & Baseline
              </CardTitle>
              {linkedIdeaId && (
                <Badge variant="violet" size="sm">
                  Pre-filled from Content Studio Idea
                </Badge>
              )}
            </div>
            <CardDescription>
              Select target metric and direction. The baseline will be automatically computed in code from your real published posts (excluding sample data).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <Input
                label="Campaign Title *"
                placeholder="e.g. Slide 3 Diagram vs Text Carousel Sprint"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Select
                  label="Content Format *"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as PostFormat)}
                  options={[
                    { value: 'reel', label: 'Reel' },
                    { value: 'carousel', label: 'Carousel' },
                    { value: 'static_image', label: 'Static Image' },
                    { value: 'story', label: 'Story Series' },
                  ]}
                />

                <Select
                  label="Target Metric *"
                  value={targetMetric}
                  onChange={(e) => setTargetMetric(e.target.value as TargetMetric)}
                  options={[
                    { value: 'save_rate', label: 'Save Rate (Saves ÷ Reach)' },
                    { value: 'engagement_rate', label: 'Engagement Rate ((Likes+Comments+Shares+Saves) ÷ Reach)' },
                    { value: 'share_rate', label: 'Share Rate (Shares ÷ Reach)' },
                  ]}
                />

                <Select
                  label="Target Direction *"
                  value={targetDirection}
                  onChange={(e) => setTargetDirection(e.target.value as TargetDirection)}
                  options={[
                    { value: 'above_baseline', label: 'Above Baseline (Improvement)' },
                    { value: 'below_baseline', label: 'Below Baseline' },
                  ]}
                />

                <Input
                  label="Topic / Subject *"
                  placeholder="e.g. AI Automation"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  error={errors.topic}
                />
              </div>

              {/* Real-time Baseline Preview Banner */}
              <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-950 dark:text-indigo-200">
                    Calculated Format Baseline ({format}):
                  </span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    {liveBaseline.baselineValue !== null ? `${liveBaseline.baselineValue.toFixed(2)}%` : 'No data'}
                  </span>
                  <span className="text-slate-500 font-mono">
                    (n = {liveBaseline.baselineN} real published posts)
                  </span>
                </div>

                {liveBaseline.isThin && (
                  <Badge variant="amber" size="sm">
                    Baseline too thin to conclude anything (n &lt; 3)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Planned Launch Date *"
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                />

                <Input
                  label="Expected Outcome Benchmark *"
                  placeholder="e.g. Save Rate >= 4.5% and 150+ saves"
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  error={errors.expectedOutcome}
                />
              </div>

              <Textarea
                label="Primary Objective *"
                placeholder="What core creator behavior or audience metric are you attempting to move?"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                error={errors.objective}
                rows={2}
              />

              <Textarea
                label="Falsifiable Hypothesis *"
                placeholder="If we [change X about content], then [outcome Y will happen] because [reason Z]."
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                error={errors.hypothesis}
                rows={2}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Register Campaign Experiment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="w-10 h-10 text-indigo-400" />}
          title="No Campaigns Registered"
          description="Create your first content experiment above or enable the sample dataset to preview past experiment outcomes and lessons learned."
          actionLabel="Create Campaign"
          onAction={() => setShowForm(true)}
          secondaryActionLabel="Load Sample Campaigns"
          onSecondaryAction={() => setUseSampleData(true)}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {campaigns.map((camp) => {
              const currentPostId = selectedPostIds[camp.id] || camp.linkedPostId || '';
              const linkedPost = realImportedPosts.find((p) => p.id === currentPostId);
              const targetMetric = camp.targetMetric || 'save_rate';
              const postMetricVal = linkedPost ? getPostMetricValue(linkedPost, targetMetric) : null;
              const isMetricUnavailable = linkedPost !== undefined && postMetricVal === null;

              const isDrafting = isDraftingLesson[camp.id];
              const draftError = draftErrors[camp.id];
              const currentDraft = editableDrafts[camp.id] ?? camp.lessonDraft ?? '';
              const isRetaining = isRetainingLesson[camp.id];
              const feedback = retainFeedback[camp.id];

              return (
                <Card key={camp.id} hoverable className="border border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {camp.title}
                        </h3>
                        {getStatusBadge(camp.status)}
                        <Badge size="sm" variant="neutral">{camp.format}</Badge>
                        <span className="text-xs text-slate-500 font-medium">Topic: {camp.topic}</span>
                        {camp.targetMetric && (
                          <Badge size="sm" variant="violet">
                            Metric: {camp.targetMetric.replace('_', ' ')} ({camp.targetDirection === 'above_baseline' ? 'Above' : 'Below'})
                          </Badge>
                        )}
                        {camp.baselineN !== undefined && camp.baselineN !== null && camp.baselineN < 3 && (
                          <Badge size="sm" variant="amber">
                            baseline too thin to conclude anything (n={camp.baselineN})
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{camp.plannedDate}</span>
                        </div>
                        {!camp.isSample && (
                          <button
                            onClick={() => deleteCampaign(camp.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete campaign"
                            aria-label="Delete campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Experiment Brief Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                          Objective
                        </strong>
                        <p className="text-slate-800 dark:text-slate-200">{camp.objective}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                          Baseline & Expected Target
                        </strong>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          Baseline: {camp.baselineValue !== null && camp.baselineValue !== undefined ? `${camp.baselineValue.toFixed(2)}%` : 'None'} (n={camp.baselineN ?? 0}) • Expected: {camp.expectedOutcome}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                      <strong className="text-indigo-900 dark:text-indigo-200 uppercase tracking-wider text-[10px] block mb-1">
                        Tested Falsifiable Hypothesis
                      </strong>
                      <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed font-mono">
                        "{camp.hypothesis}"
                      </p>
                    </div>

                    {/* CLOSE THE LOOP INTERACTIVE PANEL (Real Posts Only) */}
                    {!camp.isSample && (
                      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <Target className="w-4 h-4 text-indigo-600" />
                            Close the Loop: Post Delivery Evaluation
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Strict: Real imported posts only
                          </span>
                        </div>

                        {/* Step A: Link Real Imported Post */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            1. Link Real Published Post for this Campaign:
                          </label>

                          {realImportedPosts.length === 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                              No real imported posts found. Import a CSV of your posts to link and evaluate real performance data.
                            </p>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <select
                                value={currentPostId}
                                onChange={(e) => handleSelectPostForCampaign(camp.id, e.target.value)}
                                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                              >
                                <option value="">-- Choose a published post ({camp.format}) --</option>
                                {realImportedPosts.map((p) => {
                                  const metricVal = getPostMetricValue(p, targetMetric);
                                  const metricStr = metricVal !== null ? `${metricVal.toFixed(2)}%` : 'metric unavailable';
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.date} • [{p.format}] "{p.caption.slice(0, 45)}..." ({targetMetric}: {metricStr})
                                    </option>
                                  );
                                })}
                              </select>

                              {/* Evaluate Result Action Button */}
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={!currentPostId || isMetricUnavailable}
                                onClick={() => handleEvaluateOutcome(camp)}
                                leftIcon={<Target className="w-3.5 h-3.5" />}
                              >
                                Evaluate Result
                              </Button>
                            </div>
                          )}

                          {/* Block Warning if Metric Unavailable */}
                          {isMetricUnavailable && (
                            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Metric unavailable for this post:</strong> Reach or component metrics were missing in the source data. Evaluation is blocked to prevent fake zero distortion.
                              </span>
                            </div>
                          )}

                          {linkedPost && !isMetricUnavailable && postMetricVal !== null && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Linked post metric value: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{postMetricVal.toFixed(2)}%</strong> (Reach: {formatCount(linkedPost.reach)} accounts)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Step B: Evaluated Outcome Breakdown */}
                        {camp.outcome && (
                          <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  Computed Empirical Outcome:
                                </span>
                                {getVerdictBadge(camp.outcome.verdict)}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                Evaluated: {new Date(camp.outcome.evaluatedAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Numbers & Denominator Card */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 block uppercase">Actual Post</span>
                                <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                                  {camp.outcome.actualValue !== null ? `${camp.outcome.actualValue.toFixed(2)}%` : 'n/a'}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 block uppercase">Baseline Avg</span>
                                <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                                  {camp.outcome.baselineValue !== null ? `${camp.outcome.baselineValue.toFixed(2)}%` : 'n/a'}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">n = {camp.outcome.baselineN}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 block uppercase">Abs Difference</span>
                                <span
                                  className={`text-sm font-bold font-mono ${
                                    (camp.outcome.absoluteDiff ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {(camp.outcome.absoluteDiff ?? 0) >= 0 ? '+' : ''}
                                  {camp.outcome.absoluteDiff !== null ? `${camp.outcome.absoluteDiff.toFixed(2)}%` : 'n/a'}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 block uppercase">Relative Shift</span>
                                <span
                                  className={`text-sm font-bold font-mono ${
                                    (camp.outcome.percentDiff ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {(camp.outcome.percentDiff ?? 0) >= 0 ? '+' : ''}
                                  {camp.outcome.percentDiff !== null ? `${camp.outcome.percentDiff.toFixed(1)}%` : 'n/a'}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[11px]">
                              <strong>Formula:</strong> {camp.outcome.formula} • <strong>Denominator:</strong> {camp.outcome.denominatorInfo}
                            </p>

                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                              "{camp.outcome.verdictReason}"
                            </p>

                            {/* Association Disclaimer */}
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              * Principle: Reflected as observed association, not proven cause.
                            </p>

                            {/* Step C: Draft Lesson with Gemini */}
                            <div className="pt-2 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  2. Synthesize Lesson Draft:
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  isLoading={isDrafting}
                                  onClick={() => handleDraftLesson(camp)}
                                  leftIcon={<Sparkles className="w-3 h-3 text-indigo-600" />}
                                >
                                  {camp.lessonDraft ? 'Re-draft Lesson with Gemini' : 'Draft Lesson with Gemini'}
                                </Button>
                              </div>

                              {draftError && (
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">
                                  {draftError}
                                </p>
                              )}

                              {/* Editable Lesson Draft Box */}
                              {(currentDraft || isDrafting) && (
                                <div className="space-y-2 pt-1">
                                  <Textarea
                                    label="Editable Empirical Lesson (Review and modify before storing in Hindsight):"
                                    value={currentDraft}
                                    onChange={(e) =>
                                      setEditableDrafts((prev) => ({ ...prev, [camp.id]: e.target.value }))
                                    }
                                    rows={3}
                                    placeholder="Gemini will draft an honest, grounded lesson from your numbers..."
                                  />

                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        className="text-xs"
                                        isLoading={isRetaining}
                                        onClick={() => handleRetainLesson(camp)}
                                        leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
                                      >
                                        Retain in Hindsight
                                      </Button>
                                      {camp.lessonRetainedAt && (
                                        <Badge variant="emerald" size="sm">
                                          Retained {new Date(camp.lessonRetainedAt).toLocaleDateString()}
                                        </Badge>
                                      )}
                                    </div>

                                    {feedback && (
                                      <span
                                        className={`text-xs font-medium flex items-center gap-1 ${
                                          feedback.success ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                      >
                                        {feedback.success ? (
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        ) : (
                                          <XCircle className="w-3.5 h-3.5" />
                                        )}
                                        {feedback.message}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stored Lessons Learned (Read-only for sample or persisted campaigns) */}
                    {camp.lessonsLearned && (
                      <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-2 text-xs">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-900 dark:text-emerald-100 block">
                            Retained Lesson in Hindsight Memory:
                          </strong>
                          <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed font-mono text-[11px] mt-0.5">
                            {camp.lessonsLearned}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
