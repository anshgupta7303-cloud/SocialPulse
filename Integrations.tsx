import React, { useState } from 'react';
import {
  Database,
  Bot,
  Brain,
  Plug2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Layers,
  RotateCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LogIn,
  Key,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  StatusBadge,
  Badge,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';

export function Integrations() {
  const {
    hindsightStatus,
    geminiStatus,
    refreshHindsightStatus,
    supabaseStatus,
    refreshSupabaseStatus,
    currentUser,
    setIsAuthModalOpen,
  } = useApp();

  const [isTestingHindsight, setIsTestingHindsight] = useState(false);
  const [hindsightTestResult, setHindsightTestResult] = useState<any>(null);

  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<any>(null);

  const handleTestHindsight = async () => {
    setIsTestingHindsight(true);
    setHindsightTestResult(null);
    try {
      const res = await refreshHindsightStatus();
      setHindsightTestResult(res);
    } catch (err: any) {
      setHindsightTestResult({
        configured: false,
        status: 'error',
        message: err?.message || 'Failed to execute status test',
      });
    } finally {
      setIsTestingHindsight(false);
    }
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const res = await refreshSupabaseStatus();
      setSupabaseTestResult(res);
    } catch (err: any) {
      setSupabaseTestResult({
        configured: false,
        status: 'error',
        message: err?.message || 'Failed to execute Supabase test',
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const hindsightStat = hindsightStatus?.status || 'not_configured';
  const isGeminiReady = Boolean(geminiStatus?.configured);
  const supabaseStat = supabaseStatus?.status || 'not_configured';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Service Integrations & Backend Connectors
          </h2>
          <Badge variant="emerald">Stage 4: Supabase Auth & Persistence</Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time status diagnostics for persistent databases, multimodal LLMs, and cognitive memory services.
        </p>
      </div>

      {/* Boundary & Security Policy Notice */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100 block mb-0.5">
            Key Security & Architecture Policy
          </strong>
          Supabase uses Row Level Security (RLS) with public anon credentials (<code className="font-mono text-emerald-600 dark:text-emerald-400">VITE_SUPABASE_URL</code> and <code className="font-mono text-emerald-600 dark:text-emerald-400">VITE_SUPABASE_ANON_KEY</code>). All private LLM and cognitive keys are kept strictly in server-side runtime memory and never leaked into client-side code (<code className="font-mono text-indigo-600 dark:text-indigo-400">GEMINI_API_KEY</code> and <code className="font-mono text-indigo-600 dark:text-indigo-400">HINDSIGHT_API_KEY</code>).
        </div>
      </div>

      {/* Three Cards: Supabase, Gemini, Hindsight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Supabase (LIVE STAGE 4 INTEGRATION) */}
        <Card className={`flex flex-col justify-between ${supabaseStat === 'connected' ? 'border-emerald-200 dark:border-emerald-900 shadow-md' : ''}`}>
          <div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <StatusBadge
                  label="Supabase"
                  status={supabaseStat}
                  statusText={supabaseStat === 'connected' ? 'Connected' : supabaseStat === 'error' ? 'Error' : 'Not configured'}
                />
              </div>
              <CardTitle>Supabase PostgreSQL</CardTitle>
              <CardDescription>
                Relational PostgreSQL database with Row Level Security (RLS) & Auth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              {supabaseStat === 'connected' && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Database Connection Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {supabaseStatus?.message}
                  </p>
                  <div className="pt-1 text-[10px] font-mono border-t border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                    <span>Latency: {supabaseStatus?.latencyMs}ms</span>
                    {currentUser && <span className="block mt-0.5 truncate">User: {currentUser.email}</span>}
                  </div>
                </div>
              )}

              {supabaseStat === 'error' && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Connection Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-mono">
                    {supabaseStatus?.message}
                  </p>
                </div>
              )}

              {supabaseStat === 'not_configured' && (
                <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Setup Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Add <code className="font-mono">VITE_SUPABASE_URL</code> and public <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in the <strong>AI Studio Secrets panel</strong>.
                  </p>
                </div>
              )}

              <div>
                <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                  Active Capabilities in Stage 4:
                </strong>
                <ul className="space-y-1 list-disc pl-4 text-slate-500 dark:text-slate-400">
                  <li>Row Level Security (RLS) isolated by <code className="font-mono">auth.uid()</code></li>
                  <li>Persistent tables: profiles, posts, ideas, campaigns, events</li>
                  <li>Per-user isolated Hindsight memory banks</li>
                </ul>
              </div>
            </CardContent>
          </div>
          <CardFooter className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              isLoading={isTestingSupabase}
              leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              onClick={handleTestSupabase}
            >
              Test Supabase Connection
            </Button>
            {!currentUser && supabaseStat === 'connected' && (
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                leftIcon={<LogIn className="w-3.5 h-3.5" />}
                onClick={() => setIsAuthModalOpen(true)}
              >
                Sign In to Supabase
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Card 2: Gemini (LIVE STAGE 3 INTEGRATION) */}
        <Card className={`flex flex-col justify-between ${isGeminiReady ? 'border-indigo-200 dark:border-indigo-900 shadow-md' : ''}`}>
          <div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <StatusBadge
                  label="Gemini"
                  status={isGeminiReady ? 'connected' : 'not_configured'}
                  statusText={isGeminiReady ? 'Connected' : 'Not configured'}
                />
              </div>
              <CardTitle>Gemini AI</CardTitle>
              <CardDescription>
                Server-side structured generation grounded in Hindsight memories and creator analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              {isGeminiReady ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Real Connection Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Gemini generation is active on the server. Ready to synthesize grounded hooks, captions, and outlines.
                  </p>
                  <div className="pt-1 text-[10px] font-mono border-t border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                    <span>Model: {geminiStatus?.model || 'gemini-3.8-flash'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Setup Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    <code className="font-mono font-semibold">GEMINI_API_KEY</code> is not configured. Add your key in the <strong>AI Studio Secrets panel</strong> to activate real server generation.
                  </p>
                </div>
              )}
              <div>
                <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                  Active Capabilities in Stage 3:
                </strong>
                <ul className="space-y-1 list-disc pl-4 text-slate-500 dark:text-slate-400">
                  <li><code className="font-mono text-indigo-600">POST /api/studio/generate</code> (Server Gemini SDK)</li>
                  <li>Memory-grounded hook & caption synthesis</li>
                  <li>Structured JSON output schema validation</li>
                </ul>
              </div>
            </CardContent>
          </div>
          <CardFooter>
            <Button
              variant={isGeminiReady ? 'outline' : 'primary'}
              size="sm"
              className="w-full text-xs"
              onClick={handleTestHindsight}
              isLoading={isTestingHindsight}
            >
              {isGeminiReady ? `Model: ${geminiStatus?.model || 'gemini-3.8-flash'}` : 'Check Status'}
            </Button>
          </CardFooter>
        </Card>

        {/* Card 3: Hindsight (LIVE STAGE 2 INTEGRATION) */}
        <Card className="flex flex-col justify-between border-indigo-200 dark:border-indigo-900 shadow-md">
          <div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Brain className="w-5 h-5" />
                </div>
                <StatusBadge
                  label="Hindsight"
                  status={hindsightStat}
                  statusText={hindsightStat === 'connected' ? 'Connected' : hindsightStat === 'error' ? 'Error' : 'Not configured'}
                />
              </div>
              <CardTitle>Hindsight Memory</CardTitle>
              <CardDescription>
                Cross-campaign episodic memory, multi-strategy recall, and rule retention.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              {/* Real status diagnostic box */}
              {hindsightStat === 'connected' && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Real Connection Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {hindsightStatus?.message}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono border-t border-emerald-200/60 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                    <span>Bank: {currentUser ? `socialpulse-${currentUser.id.slice(0, 8)}...` : hindsightStatus?.bankId}</span>
                    <span>Latency: {hindsightStatus?.latencyMs}ms</span>
                  </div>
                </div>
              )}

              {hindsightStat === 'error' && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Connection Error</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-mono">
                    {hindsightStatus?.message}
                  </p>
                </div>
              )}

              {hindsightStat === 'not_configured' && (
                <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Setup Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Hindsight Cloud API key is not yet configured. Register at{' '}
                    <a
                      href="https://ui.hindsight.vectorize.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold"
                    >
                      ui.hindsight.vectorize.io
                    </a>{' '}
                    and add your key as <code className="font-mono">HINDSIGHT_API_KEY</code> in AI Studio Secrets.
                  </p>
                </div>
              )}

              <div>
                <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                  Active Capabilities in Stage 2:
                </strong>
                <ul className="space-y-1 list-disc pl-4 text-slate-500 dark:text-slate-400">
                  <li><code className="font-mono text-indigo-600">POST /api/memory/retain</code> (Live fact ingestion)</li>
                  <li><code className="font-mono text-indigo-600">POST /api/memory/recall</code> (Parallel 4-channel search)</li>
                  <li>Scoped to per-user isolated bank in Stage 4</li>
                </ul>
              </div>
            </CardContent>
          </div>
          <CardFooter className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full text-xs"
              isLoading={isTestingHindsight}
              leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              onClick={handleTestHindsight}
            >
              Test Real Hindsight Connection
            </Button>
            {hindsightTestResult && (
              <p className={`text-[10px] text-center font-mono ${hindsightTestResult.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                Result: {hindsightTestResult.status} ({hindsightTestResult.message})
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
