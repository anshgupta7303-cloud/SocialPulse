import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  BrainCircuit,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Filter,
  AlertTriangle,
  RotateCw,
  Search,
  Plus,
  Send,
  Layers,
  Sparkles,
  XCircle,
  HelpCircle,
  Target,
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Textarea,
  Input,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { MemoryEvent, LabRun } from '../types/index.ts';
import { retainMemory, recallMemory } from '../lib/hindsightClient.ts';
import { generateCandidateLessons, SuggestedLesson } from '../lib/lessonEngine.ts';
import { fetchUserLabRuns } from '../lib/db.ts';
import { matchLessonImpact } from '../lib/campaignEngine.ts';

export function MemoryActivity() {
  const {
    memoryEvents,
    importedPosts,
    campaigns,
    currentUser,
    useSampleData,
    setUseSampleData,
    hindsightStatus,
    refreshServerMemoryEvents,
    refreshHindsightStatus,
  } = useApp();

  const [operationFilter, setOperationFilter] = useState<'all' | 'retain' | 'recall'>('all');
  const [userLabRuns, setUserLabRuns] = useState<LabRun[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchUserLabRuns(currentUser.id)
        .then(setUserLabRuns)
        .catch(() => {});
    }
  }, [currentUser]);

  // Aggregate retained lessons from campaigns and memory events
  const retainedLessons = useMemo(() => {
    const list: Array<{
      id: string;
      text: string;
      source: string;
      retainedAt?: string;
    }> = [];

    const seen = new Set<string>();

    for (const c of campaigns || []) {
      const text = c.lessonsLearned || c.lessonDraft;
      if (text && (c.lessonRetainedAt || !c.isSample)) {
        const norm = text.toLowerCase().trim();
        if (!seen.has(norm)) {
          seen.add(norm);
          list.push({
            id: `camp-${c.id}`,
            text,
            source: `Campaign: ${c.title}`,
            retainedAt: c.lessonRetainedAt || undefined,
          });
        }
      }
    }

    for (const e of memoryEvents || []) {
      if (e.operation === 'retain' && e.status === 'success' && e.preview) {
        const norm = e.preview.toLowerCase().trim();
        if (!seen.has(norm)) {
          seen.add(norm);
          list.push({
            id: `evt-${e.id}`,
            text: e.preview,
            source: e.source || 'Direct Retain',
            retainedAt: e.timestamp,
          });
        }
      }
    }

    return list;
  }, [campaigns, memoryEvents]);

  // Honest Lessons State
  const [candidateLessons, setCandidateLessons] = useState<SuggestedLesson[]>([]);
  const [hasCalculatedLessons, setHasCalculatedLessons] = useState(false);
  const [retainingLessonId, setRetainingLessonId] = useState<string | null>(null);
  const [lessonRetainResults, setLessonRetainResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [editableLessons, setEditableLessons] = useState<Record<string, string>>({});

  // Manual Lesson Input State
  const [manualLessonText, setManualLessonText] = useState('');
  const [manualLessonContext, setManualLessonContext] = useState('format_strategy');
  const [isRetainingManual, setIsRetainingManual] = useState(false);
  const [manualRetainResult, setManualRetainResult] = useState<{ success: boolean; message: string } | null>(null);

  // Memory Test Panel State
  const [retainNote, setRetainNote] = useState('');
  const [retainSource, setRetainSource] = useState('campaign_experiment');
  const [isRetaining, setIsRetaining] = useState(false);
  const [retainResult, setRetainResult] = useState<{ success: boolean; message: string; raw?: any } | null>(null);

  const [recallQuery, setRecallQuery] = useState('');
  const [isRecalling, setIsRecalling] = useState(false);
  const [recallResult, setRecallResult] = useState<{ success: boolean; query?: string; raw?: any; message?: string } | null>(null);

  const isConfigured = hindsightStatus?.configured === true && hindsightStatus.status === 'connected';

  // Handler: Compute Candidate Lessons strictly from Real Imported Posts
  const handleSuggestLessons = () => {
    // Strictly real posts only; never sample data
    const suggestions = generateCandidateLessons(importedPosts);
    setCandidateLessons(suggestions);
    setHasCalculatedLessons(true);
    const initialTextMap: Record<string, string> = {};
    suggestions.forEach((s) => {
      initialTextMap[s.id] = `${s.lessonText} [${s.limitationText}]`;
    });
    setEditableLessons(initialTextMap);
  };

  // Handler: Retain a Suggested Lesson explicitly
  const handleRetainSuggestedLesson = async (lesson: SuggestedLesson) => {
    const textToRetain = editableLessons[lesson.id] || `${lesson.lessonText} [${lesson.limitationText}]`;
    setRetainingLessonId(lesson.id);
    const res = await retainMemory(textToRetain, { source: `honest_lesson_${lesson.category}` });
    setLessonRetainResults((prev) => ({
      ...prev,
      [lesson.id]: { success: res.success, message: res.message },
    }));
    setRetainingLessonId(null);
    await refreshServerMemoryEvents();
  };

  // Handler: Retain Manual Lesson
  const handleRetainManualLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLessonText.trim()) return;
    setIsRetainingManual(true);
    setManualRetainResult(null);
    const res = await retainMemory(manualLessonText.trim(), { source: `creator_manual_${manualLessonContext}` });
    setManualRetainResult({ success: res.success, message: res.message });
    setIsRetainingManual(false);
    if (res.success) {
      setManualLessonText('');
    }
    await refreshServerMemoryEvents();
  };

  const handleRetain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retainNote.trim()) return;

    setIsRetaining(true);
    setRetainResult(null);

    const res = await retainMemory(retainNote.trim(), { source: retainSource });
    setRetainResult({
      success: res.success,
      message: res.message,
      raw: res.data,
    });
    setIsRetaining(false);
    if (res.success) {
      setRetainNote('');
    }
    // Refresh server logs
    await refreshServerMemoryEvents();
  };

  const handleRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallQuery.trim()) return;

    setIsRecalling(true);
    setRecallResult(null);

    const res = await recallMemory(recallQuery.trim());
    setRecallResult({
      success: res.success,
      query: res.query,
      raw: res.data,
      message: res.message,
    });
    setIsRecalling(false);
    // Refresh server logs
    await refreshServerMemoryEvents();
  };

  const filteredEvents = memoryEvents.filter((ev) => {
    if (operationFilter !== 'all' && ev.operation !== operationFilter) return false;
    return true;
  });

  const lessonsTimeline = memoryEvents.filter((ev) => ev.lesson);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Memory Activity & Audit Log
            </h2>
            {useSampleData ? (
              <Badge variant="sample">SAMPLE DATA ACTIVE</Badge>
            ) : (
              <Badge variant="emerald">REAL HINDSIGHT EVENTS</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of memory ingestions (retain), context lookups (recall), and extracted growth principles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={() => {
              refreshServerMemoryEvents();
              refreshHindsightStatus();
            }}
          >
            Refresh Log
          </Button>

          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Operations</option>
            <option value="retain">Retain Only (Store)</option>
            <option value="recall">Recall Only (Retrieve)</option>
          </select>
        </div>
      </div>

      {/* LESSON IMPACT CARD */}
      <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm">
        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-base text-indigo-950 dark:text-indigo-100">
                  Lesson Impact & Recall Evidence
                </CardTitle>
                <CardDescription>
                  Audit trail of how retained empirical lessons are actively retrieved and used across Memory Lab runs and Content Studio generations.
                </CardDescription>
              </div>
            </div>
            <Badge variant="violet" size="sm">
              {retainedLessons.length} Stored Lesson(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {retainedLessons.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-xl border-slate-300 dark:border-slate-800">
              No empirical lessons stored yet. Evaluate a campaign or retain an empirical lesson to monitor its downstream impact.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {retainedLessons.map((item) => {
                const impact = matchLessonImpact(item.text, userLabRuns, []);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Source: {item.source}
                      </span>
                      {impact.totalRecalls === 0 ? (
                        <Badge variant="neutral" size="sm">
                          Stored, awaiting recall in future studio runs
                        </Badge>
                      ) : (
                        <Badge variant="emerald" size="sm">
                          Recalled in {impact.totalRecalls} Generation(s)
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{item.text}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>
                          Memory Lab Runs: <strong className="font-mono text-slate-700 dark:text-slate-300">{impact.labRunsCount}</strong>
                        </span>
                        {impact.totalRecalls > 0 && (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Actively influencing model output
                          </span>
                        )}
                      </div>
                      {item.retainedAt && (
                        <span className="font-mono">
                          Retained: {new Date(item.retainedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* HONEST LESSONS CARD (Derived in code from real posts only) */}
      <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm">
        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-base text-indigo-950 dark:text-indigo-100">
                  Honest Lessons from Real Data
                </CardTitle>
                <CardDescription>
                  Empirical insights computed in code from your real imported posts (never sample data). Requires ≥3 posts per cohort and skips missing metrics.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSuggestLessons}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Suggest Lessons from My Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Status of real data */}
          {importedPosts.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-1.5">
              <AlertTriangle className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No Real Imported Posts Found in Database
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Strict Rule: Lessons are derived strictly from your real imported posts and never from simulated sample data. Import a CSV on the Posts page to generate empirical rules.
              </p>
            </div>
          ) : hasCalculatedLessons && candidateLessons.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-1.5">
              <HelpCircle className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No Qualifying Comparison Cohorts (≥3 Posts Required)
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                You have {importedPosts.length} real posts, but at least 2 distinct formats or topics each with ≥3 posts having non-null save or engagement metrics are required to prevent statistical over-fitting.
              </p>
            </div>
          ) : candidateLessons.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Candidate Empirical Lessons ({candidateLessons.length})
                </span>
                <span className="text-[11px] text-slate-500 italic">
                  Review and edit before storing. Lessons are NEVER retained automatically.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {candidateLessons.map((lesson) => {
                  const retainStatus = lessonRetainResults[lesson.id];
                  const isRetainingThis = retainingLessonId === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="violet" size="sm">
                            {lesson.category === 'format' ? 'Format Comparison' : 'Topic Comparison'}
                          </Badge>
                          <Badge variant="neutral" size="sm">
                            Metric: {lesson.metricLabel}
                          </Badge>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Period: {lesson.dateRange.start} → {lesson.dateRange.end}
                        </span>
                      </div>

                      {/* Cohort Stats Pill */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-4">
                          <span>
                            <strong>{lesson.targetGroup}:</strong> {lesson.targetAvg}% (N={lesson.targetCount})
                          </span>
                          {lesson.comparisonGroup && (
                            <span>
                              <strong>vs {lesson.comparisonGroup}:</strong> {lesson.comparisonAvg}% (N={lesson.comparisonCount})
                            </span>
                          )}
                        </div>
                        {lesson.differencePercent !== undefined && (
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{lesson.differencePercent}% Advantage
                          </span>
                        )}
                      </div>

                      {/* Editable Textarea */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Lesson Text to Retain (Editable):
                        </label>
                        <Textarea
                          rows={2}
                          value={editableLessons[lesson.id] ?? `${lesson.lessonText} [${lesson.limitationText}]`}
                          onChange={(e) =>
                            setEditableLessons((prev) => ({
                              ...prev,
                              [lesson.id]: e.target.value,
                            }))
                          }
                          className="text-xs font-mono"
                        />
                      </div>

                      {/* Mandatory limitation line */}
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 italic bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200 dark:border-amber-900/40">
                        {lesson.limitationText}
                      </p>

                      {/* Action & Feedback */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {retainStatus && (
                            <span
                              className={`text-xs font-medium inline-flex items-center gap-1 ${
                                retainStatus.success
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {retainStatus.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {retainStatus.message}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRetainSuggestedLesson(lesson)}
                          isLoading={isRetainingThis}
                          disabled={retainStatus?.success}
                          leftIcon={<ArrowDownCircle className="w-3.5 h-3.5" />}
                        >
                          {retainStatus?.success ? 'Retained in Hindsight' : 'Retain in Hindsight'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Manual Lesson Creator */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Add My Own Observed Lesson (Manual Entry)
            </span>
            <form onSubmit={handleRetainManualLesson} className="space-y-3">
              <Textarea
                placeholder="e.g. Failure Post-Mortems: Detailed technical breakdowns of failed experiments yield 3x higher bookmark save rates than high-level motivational tips."
                value={manualLessonText}
                onChange={(e) => setManualLessonText(e.target.value)}
                rows={2}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Context tag (e.g. hook_format_test)"
                    value={manualLessonContext}
                    onChange={(e) => setManualLessonContext(e.target.value)}
                    className="text-xs w-56"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">
                    Target: User Isolated Bank
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isRetainingManual}
                  disabled={!manualLessonText.trim()}
                  leftIcon={<ArrowDownCircle className="w-3.5 h-3.5" />}
                >
                  Retain in Hindsight
                </Button>
              </div>

              {manualRetainResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                    manualRetainResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {manualRetainResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{manualRetainResult.message}</span>
                </div>
              )}
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Memory Test Panel (Interactive Live Retain & Recall Verification) */}
      <Card className="border-indigo-300 dark:border-indigo-800 shadow-md">
        <CardHeader className="bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-base text-indigo-950 dark:text-indigo-100">
                  Live Hindsight Memory Test Panel
                </CardTitle>
                <CardDescription>
                  Prove real retain and recall operations directly through the server-side proxy route.
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConfigured ? 'emerald' : 'amber'}>
              {isConfigured ? 'Connected to Bank' : 'Setup Required'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!isConfigured && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong className="block font-semibold">Setup Required: Hindsight API Key Missing or Not Connected</strong>
                <span>
                  Configure <code className="font-mono font-bold">HINDSIGHT_API_KEY</code> in AI Studio Secrets. Live retain and recall require verified connection to Hindsight Cloud. Calls will return clear error states instead of faking success.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Retain a Note */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-indigo-600" />
                  1. Retain Memory (Store)
                </span>
                <span className="text-[11px] font-mono text-slate-400">POST /api/memory/retain</span>
              </div>

              <form onSubmit={handleRetain} className="space-y-3">
                <Textarea
                  placeholder="e.g. Campaign Experiment: Visual flowchart on slide 3 boosted save rate to 4.9% vs 2.1% text list."
                  value={retainNote}
                  onChange={(e) => setRetainNote(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Context tag (e.g. campaign_sprint)"
                    value={retainSource}
                    onChange={(e) => setRetainSource(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isRetaining}
                    disabled={!retainNote.trim()}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Retain
                  </Button>
                </div>
              </form>

              {/* Retain Outcome Display */}
              {retainResult && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-2 font-mono ${
                    retainResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {retainResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Retain {retainResult.success ? 'Succeeded' : 'Failed'}</span>
                  </div>
                  <p className="text-[11px]">{retainResult.message}</p>
                  {retainResult.raw && (
                    <details className="text-[11px] group cursor-pointer border border-slate-200 dark:border-slate-800 rounded-md p-2 bg-white/60 dark:bg-slate-900/40">
                      <summary className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between select-none">
                        <span>Raw Hindsight Response (JSON)</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="mt-2 text-[10px] p-2 rounded bg-black/5 dark:bg-black/60 overflow-x-auto max-h-40 font-mono text-slate-800 dark:text-slate-200">
                        {JSON.stringify(retainResult.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Recall Memory */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                  2. Recall Memory (Retrieve)
                </span>
                <span className="text-[11px] font-mono text-slate-400">POST /api/memory/recall</span>
              </div>

              <form onSubmit={handleRecall} className="space-y-3">
                <Textarea
                  placeholder="e.g. which format gets more saves?"
                  value={recallQuery}
                  onChange={(e) => setRecallQuery(e.target.value)}
                  rows={3}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={isRecalling}
                  disabled={!recallQuery.trim()}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                >
                  Recall from Hindsight
                </Button>
              </form>

              {/* Recall Outcome Display with Exact Documented Fields */}
              {recallResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    recallResult.success
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      {recallResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span className={recallResult.success ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-rose-900 dark:text-rose-200 font-semibold'}>
                        Recall {recallResult.success ? 'Succeeded' : 'Failed'}
                      </span>
                    </div>
                    {recallResult.query && (
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                        Query: "{recallResult.query}"
                      </span>
                    )}
                  </div>

                  {!recallResult.success && recallResult.message && (
                    <p className="text-[11px] font-mono text-rose-700 dark:text-rose-300">
                      {recallResult.message}
                    </p>
                  )}

                  {recallResult.success && (() => {
                    const rawResults = recallResult.raw?.results;
                    const results: any[] = Array.isArray(rawResults)
                      ? rawResults
                      : Array.isArray(recallResult.raw)
                      ? recallResult.raw
                      : [];

                    if (results.length === 0) {
                      return (
                        <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center space-y-1">
                          <HelpCircle className="w-5 h-5 text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            No memories found
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Hindsight returned 0 matching memories for this query.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <span>Retrieved Memories ({results.length})</span>
                          <span className="font-mono text-[10px] text-slate-400">TEMPR Search</span>
                        </div>
                        {results.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 shadow-xs space-y-2 text-left"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                {item.type || 'memory'}
                              </span>
                              {item.context && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Context: <strong className="text-slate-700 dark:text-slate-300">{item.context}</strong>
                                </span>
                              )}
                              {item.mentioned_at && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(item.mentioned_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {recallResult.raw && (
                    <details className="text-[11px] group cursor-pointer border border-slate-200 dark:border-slate-800 rounded-md p-2 bg-white/60 dark:bg-slate-900/40">
                      <summary className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between select-none">
                        <span>Raw Hindsight Response (JSON)</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="mt-2 text-[10px] p-2 rounded bg-black/5 dark:bg-black/60 overflow-x-auto max-h-48 font-mono text-slate-800 dark:text-slate-200">
                        {JSON.stringify(recallResult.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retain/Recall Operations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Memory Operations Audit Trail</CardTitle>
            <CardDescription>
              Chronological log of retain and recall attempts. Temporary in-memory log resets when dev server restarts.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge size="sm" variant="violet">
              {filteredEvents.length} Events Logged
            </Badge>
            {useSampleData ? (
              <Badge size="sm" variant="sample">SAMPLE</Badge>
            ) : (
              <Badge size="sm" variant="emerald">LIVE AUDIT</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No real memory events recorded yet in this server session. Use the test panel above to execute your first retain or recall operation.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Time</TableHead>
                  <TableHead className="w-24">Operation</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Data Source</TableHead>
                  <TableHead>Source Scope</TableHead>
                  <TableHead>Preview Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-slate-400">
                      {item.timestamp}
                    </TableCell>
                    <TableCell>
                      {item.operation === 'retain' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          RETAIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          RECALL
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge size="sm" variant={item.status === 'success' ? 'emerald' : 'rose'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.isSample ? (
                        <Badge size="sm" variant="sample">Sample</Badge>
                      ) : (
                        <Badge size="sm" variant="blue">Real</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {item.source}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 max-w-md">
                      {item.preview}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* "Lessons Learned" Timeline */}
      {lessonsTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <CardTitle>Lessons Learned Timeline</CardTitle>
            </div>
            <CardDescription>
              Permanent cognitive memory extracted from campaign successes and failure modes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {lessonsTimeline.map((item, idx) => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center" />
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          Rule #{idx + 1} • {item.source}
                        </span>
                        {item.isSample && <Badge size="sm" variant="sample">Sample</Badge>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      "{item.lesson}"
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Context: {item.preview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
