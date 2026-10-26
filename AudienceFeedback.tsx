import React, { useState } from 'react';
import {
  MessageSquareHeart,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  HelpCircle,
  FileQuestion,
  Lightbulb,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
  Select,
  Badge,
  Tabs,
  EmptyState,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { AudienceFeedbackItem } from '../types/index.ts';
import { IRLVANSH_ACCOUNT_INSIGHTS } from '../lib/sampleData.ts';
import { Users, MapPin, Globe, PieChart, Sparkles } from 'lucide-react';

export function AudienceFeedback() {
  const { audienceFeedback, addFeedback, useSampleData, setUseSampleData } = useApp();

  // Local form state
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState<AudienceFeedbackItem['category']>('positive');
  const [error, setError] = useState('');

  // Active category tab filter
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setError('Feedback or comment text cannot be empty.');
      return;
    }
    setError('');
    addFeedback(feedbackText.trim(), category);
    setFeedbackText('');
  };

  const categories = [
    { id: 'all', label: 'All Feedback', count: audienceFeedback.length },
    { id: 'positive', label: 'Positive', count: audienceFeedback.filter((f) => f.category === 'positive').length },
    { id: 'negative', label: 'Negative / Friction', count: audienceFeedback.filter((f) => f.category === 'negative').length },
    { id: 'neutral', label: 'Neutral', count: audienceFeedback.filter((f) => f.category === 'neutral').length },
    { id: 'question', label: 'Questions', count: audienceFeedback.filter((f) => f.category === 'question').length },
    { id: 'request', label: 'Feature Requests', count: audienceFeedback.filter((f) => f.category === 'request').length },
  ];

  const filteredItems = audienceFeedback.filter((item) => {
    if (activeTab !== 'all' && item.category !== activeTab) return false;
    return true;
  });

  const getCategoryIcon = (cat: AudienceFeedbackItem['category']) => {
    switch (cat) {
      case 'positive':
        return <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />;
      case 'negative':
        return <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />;
      case 'neutral':
        return <Minus className="w-3.5 h-3.5 text-slate-500" />;
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5 text-sky-600" />;
      case 'request':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  const getCategoryBadgeVariant = (cat: AudienceFeedbackItem['category']) => {
    switch (cat) {
      case 'positive':
        return 'emerald';
      case 'negative':
        return 'rose';
      case 'neutral':
        return 'neutral';
      case 'question':
        return 'blue';
      case 'request':
        return 'amber';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Audience Feedback Intelligence
            </h2>
            {useSampleData && <Badge variant="sample">SAMPLE DATA</Badge>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cluster qualitative DM conversations, comment inquiries, and objection signals to influence future experiment themes.
          </p>
        </div>
      </div>

      {/* Verified Follower Demographics & Geography Card (@irlvansh 90-Day Export) */}
      <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                @
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {IRLVANSH_ACCOUNT_INSIGHTS.handle} Follower Demographics & Audience Profile
                  </CardTitle>
                  <Badge variant="emerald" size="sm">
                    Verified {IRLVANSH_ACCOUNT_INSIGHTS.period}
                  </Badge>
                  <Badge variant="violet" size="sm">
                    {IRLVANSH_ACCOUNT_INSIGHTS.followersFormatted} Followers
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Demographic telemetry from Meta/Edits CSV: 32M views • 12M viewers • 2.3M shares • 321 reels.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                Youth Lean: 60.4% under 25
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-1">
          {/* 4 Demographics & Location Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Age Distribution */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Age Distribution
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Peak: 18-24
                </span>
              </div>
              <div className="space-y-1.5">
                {IRLVANSH_ACCOUNT_INSIGHTS.ageRanges.map((item) => (
                  <div key={item.range} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.range}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Gender Split */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Gender Breakdown
                </span>
                <span className="text-[10px] text-slate-400">Self-reported</span>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Men</span>
                  </div>
                  <span className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {IRLVANSH_ACCOUNT_INSIGHTS.gender.men}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Women</span>
                  </div>
                  <span className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
                    {IRLVANSH_ACCOUNT_INSIGHTS.gender.women}%
                  </span>
                </div>

                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-indigo-600"
                    style={{ width: `${IRLVANSH_ACCOUNT_INSIGHTS.gender.men}%` }}
                    title={`Men: ${IRLVANSH_ACCOUNT_INSIGHTS.gender.men}%`}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${IRLVANSH_ACCOUNT_INSIGHTS.gender.women}%` }}
                    title={`Women: ${IRLVANSH_ACCOUNT_INSIGHTS.gender.women}%`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Heavily skewed toward male creator & college demographic
                </p>
              </div>
            </div>

            {/* 3. Top Cities */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Top Cities
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Delhi #1
                </span>
              </div>
              <div className="space-y-1.5">
                {IRLVANSH_ACCOUNT_INSIGHTS.topCities.map((item) => (
                  <div key={item.city} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.city}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(item.percentage / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Top Countries */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Top Countries
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                  India 87.7%
                </span>
              </div>
              <div className="space-y-1.5">
                {IRLVANSH_ACCOUNT_INSIGHTS.topCountries.map((item) => (
                  <div key={item.country} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">{item.country}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${(item.percentage / 90) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback & Demographic Correlation Banner */}
          <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Memory Correlation:</strong> With 60.4% under age 25 and 24.5% based in Delhi, feedback signals heavily reflect fast-paced video editing techniques, Premiere Pro audio cuts, and relatable campus skits. Retained lessons reflect this specific demographic profile.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Area (5 cols) */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Log Audience Comment / Signal</CardTitle>
              <CardDescription>
                Record verbatim feedback from Instagram comments, DMs, or story question stickers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <Textarea
                  label="Verbatim Feedback Text *"
                  placeholder="Paste comment or DM message text..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  error={error}
                  rows={4}
                />

                <Select
                  label="Category Classification *"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  options={[
                    { value: 'positive', label: 'Positive (Praise, bookmark confirmation)' },
                    { value: 'negative', label: 'Negative (Friction, speed complaints, skepticism)' },
                    { value: 'neutral', label: 'Neutral (Staging tests, remarks)' },
                    { value: 'question', label: 'Question (Technical questions, doubts)' },
                    { value: 'request', label: 'Request (Templates, deeper breakdowns, links)' },
                  ]}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Log Audience Signal
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Categorized Results Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {categories.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback Items List */}
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<MessageSquareHeart className="w-10 h-10 text-slate-400" />}
              title="No Feedback Logged in Category"
              description="Log audience comments on the left or enable the sample dataset to preview clustered audience reactions."
              actionLabel="Load Sample Feedback"
              onAction={() => setUseSampleData(true)}
            />
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge size="sm" variant={getCategoryBadgeVariant(item.category) as any}>
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(item.category)}
                          <span className="capitalize">{item.category}</span>
                        </span>
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                    </div>

                    {item.sentimentScore !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Sentiment: {item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    "{item.text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
