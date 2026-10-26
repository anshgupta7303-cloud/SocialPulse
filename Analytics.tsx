import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  EmptyState,
  Tooltip,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import {
  calculateEngagementRate,
  calculateShareRate,
  calculateSaveRate,
  formatMetricPercentage,
  formatCount,
  METRIC_DENOMINATORS,
} from '../lib/metrics.ts';
import { IRLVANSH_ACCOUNT_INSIGHTS } from '../lib/sampleData.ts';

export function Analytics() {
  const { posts, importedPosts, useSampleData, setUseSampleData, setIsCSVModalOpen } = useApp();
  const [metricView, setMetricView] = useState<'engagement' | 'save' | 'share'>('engagement');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'imported' | 'sample'>('all');

  const activePosts = React.useMemo(() => {
    if (sourceFilter === 'imported') {
      return importedPosts;
    }
    if (sourceFilter === 'sample') {
      return posts.filter((p) => p.isSample);
    }
    return posts;
  }, [posts, importedPosts, sourceFilter]);

  if (activePosts.length === 0 && posts.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Content Analytics
          </h2>
        </div>
        <EmptyState
          title="No Analytics Data Available"
          description="Import an Instagram post metrics CSV or enable the sample dataset to inspect historical trends, format efficiency, and topic comparisons."
          actionLabel="Import a CSV"
          onAction={() => setIsCSVModalOpen(true)}
          secondaryActionLabel="Load Sample Data"
          onSecondaryAction={() => setUseSampleData(true)}
        />
      </div>
    );
  }

  // 1. Performance Over Time Data (chronological order)
  const timeSeriesData = [...activePosts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((post) => ({
      date: post.date.slice(5), // MM-DD
      reach: post.reach ?? 0,
      impressions: post.impressions ?? 0,
      engagementRate: post.engagementRate ?? 0,
      saveRate: post.saveRate ?? 0,
      shareRate: post.shareRate ?? 0,
      format: post.format,
      isSample: post.isSample,
    }));

  // 2. Format Comparison Aggregation
  const formatGroups = activePosts.reduce<Record<string, { count: number; reach: number; likes: number; comments: number; shares: number; saves: number }>>(
    (acc, post) => {
      const fmt = post.format;
      if (!acc[fmt]) {
        acc[fmt] = { count: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
      }
      acc[fmt].count += 1;
      acc[fmt].reach += post.reach ?? 0;
      acc[fmt].likes += post.likes ?? 0;
      acc[fmt].comments += post.comments ?? 0;
      acc[fmt].shares += post.shares ?? 0;
      acc[fmt].saves += post.saves ?? 0;
      return acc;
    },
    {}
  );

  const formatComparisonData = Object.entries(formatGroups).map(([fmt, data]) => {
    const raw = {
      reach: data.reach,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
    };
    return {
      format: fmt === 'static_image' ? 'Static Image' : fmt.charAt(0).toUpperCase() + fmt.slice(1),
      count: data.count,
      avgReach: Math.round(data.reach / data.count),
      engagementRate: calculateEngagementRate(raw) ?? 0,
      saveRate: calculateSaveRate(raw) ?? 0,
      shareRate: calculateShareRate(raw) ?? 0,
    };
  });

  // 3. Topic Comparison Aggregation
  const topicGroups = activePosts.reduce<Record<string, { count: number; reach: number; likes: number; comments: number; shares: number; saves: number }>>(
    (acc, post) => {
      const topic = post.topic || 'Uncategorized';
      if (!acc[topic]) {
        acc[topic] = { count: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
      }
      acc[topic].count += 1;
      acc[topic].reach += post.reach ?? 0;
      acc[topic].likes += post.likes ?? 0;
      acc[topic].comments += post.comments ?? 0;
      acc[topic].shares += post.shares ?? 0;
      acc[topic].saves += post.saves ?? 0;
      return acc;
    },
    {}
  );

  const topicComparisonData = Object.entries(topicGroups).map(([topic, data]) => {
    const raw = {
      reach: data.reach,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
    };
    return {
      topic: topic.length > 20 ? topic.slice(0, 18) + '...' : topic,
      fullTopic: topic,
      count: data.count,
      engagementRate: calculateEngagementRate(raw) ?? 0,
      saveRate: calculateSaveRate(raw) ?? 0,
      avgReach: Math.round(data.reach / data.count),
    };
  });

  const containsSampleRecords = activePosts.some((p) => p.isSample);
  const containsImportedRecords = activePosts.some((p) => !p.isSample);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Content Analytics & Metric Benchmarks
            </h2>
            {containsSampleRecords && <Badge variant="sample">SAMPLE DATA ACTIVE</Badge>}
            {containsImportedRecords && (
              <Badge variant="emerald" size="md">
                {importedPosts.length} IMPORTED POSTS
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical delivery curves and format attribution evaluated against verified reach denominators.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {importedPosts.length > 0 && useSampleData && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Data Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Records ({posts.length})</option>
                <option value="imported">Imported CSV Only ({importedPosts.length})</option>
                <option value="sample">Sample Only (60)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Metric Focus:</span>
            <select
              value={metricView}
              onChange={(e) => setMetricView(e.target.value as any)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="engagement">Engagement Rate (%)</option>
              <option value="save">Save Rate (%)</option>
              <option value="share">Share Rate (%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 90-Day Account Insights Overview Card from @irlvansh export */}
      <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              @
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {IRLVANSH_ACCOUNT_INSIGHTS.handle} Verified Account Insights
                </h3>
                <Badge variant="emerald" size="sm">
                  {IRLVANSH_ACCOUNT_INSIGHTS.period} (90 Days)
                </Badge>
                <Badge variant="neutral" size="sm">
                  {IRLVANSH_ACCOUNT_INSIGHTS.followersFormatted} Followers
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aggregated 90-day delivery across {IRLVANSH_ACCOUNT_INSIGHTS.reelsCount} reels. Source: {IRLVANSH_ACCOUNT_INSIGHTS.exportSource}.
              </p>
            </div>
          </div>
          <Badge variant="violet" size="sm">
            Audience: 60.4% aged 13-24 • 75.9% Men • Top: Delhi (24.5%)
          </Badge>
        </div>

        {/* 6 Key Stat Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Reel Views
            </span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.reelViewsFormatted}
            </span>
            <span className="text-[10px] text-slate-500">{IRLVANSH_ACCOUNT_INSIGHTS.reelsCount} Reels</span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Viewers (Reach)
            </span>
            <span className="text-xl font-bold text-sky-600 dark:text-sky-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.viewersFormatted}
            </span>
            <span className="text-[10px] text-slate-500">Unique accounts</span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Total Shares
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.sharesFormatted}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">19.1% share rate</span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Total Likes
            </span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.likesFormatted}
            </span>
            <span className="text-[10px] text-slate-500">18.3% like rate</span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Total Saves
            </span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.savesFormatted}
            </span>
            <span className="text-[10px] text-slate-500">1.36% bookmark rate</span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Reposts & Comments
            </span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 block mt-0.5">
              {IRLVANSH_ACCOUNT_INSIGHTS.repostsFormatted}
            </span>
            <span className="text-[10px] text-slate-500">{IRLVANSH_ACCOUNT_INSIGHTS.commentsFormatted} comments</span>
          </div>
        </div>
      </div>

      {/* Chart 1: Performance Over Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Performance Timeline (90 Days)
              <Tooltip
                content={
                  <span>
                    Rates are computed as <strong>Engagements ÷ Reach</strong> for each post date. Reach is the unique accounts reached.
                  </span>
                }
              >
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Chronological tracking of unique reach and percentage engagement rates.
            </CardDescription>
          </div>
          {useSampleData && <Badge variant="sample" size="sm">Sample</Badge>}
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  stroke="#6366f1"
                  fontSize={11}
                  tickFormatter={(val) => `${val}%`}
                />
                <YAxis
                  yAxisId="reach"
                  orientation="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Date: {data.date} ({data.format})
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            Reach: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCount(data.reach)}</span> accounts
                          </p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            Engagement Rate: {data.engagementRate}%
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Save Rate: {data.saveRate}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  yAxisId="reach"
                  type="monotone"
                  dataKey="reach"
                  name="Unique Reach"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey={
                    metricView === 'engagement'
                      ? 'engagementRate'
                      : metricView === 'save'
                      ? 'saveRate'
                      : 'shareRate'
                  }
                  name={
                    metricView === 'engagement'
                      ? 'Engagement Rate (%)'
                      : metricView === 'save'
                      ? 'Save Rate (%)'
                      : 'Share Rate (%)'
                  }
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Grid: Format & Topic Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format Comparison */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5">
                Format Comparison
                <Tooltip
                  content={
                    <span>
                      Rates compare total engagements by format divided by total format reach.
                    </span>
                  }
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Reels vs Carousels vs Static Images performance
              </CardDescription>
            </div>
            {useSampleData && <Badge variant="sample" size="sm">Sample</Badge>}
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="format" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{d.format} ({d.count} posts)</p>
                            <p className="text-slate-600 dark:text-slate-400">Avg Reach: {formatCount(d.avgReach)}</p>
                            <p className="text-indigo-600 font-semibold">Engagement: {d.engagementRate}%</p>
                            <p className="text-emerald-600 font-semibold">Save Rate: {d.saveRate}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="engagementRate" name="Engagement Rate (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saveRate" name="Save Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Topic Comparison */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Topic Efficiency Breakdown</CardTitle>
              <CardDescription>
                Pillar performance across content subjects
              </CardDescription>
            </div>
            {useSampleData && <Badge variant="sample" size="sm">Sample</Badge>}
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicComparisonData} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="topic" stroke="#94a3b8" fontSize={10} width={90} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{d.fullTopic}</p>
                            <p className="text-slate-600 dark:text-slate-400">Post Count: {d.count}</p>
                            <p className="text-indigo-600 font-semibold">Engagement: {d.engagementRate}%</p>
                            <p className="text-emerald-600 font-semibold">Save Rate: {d.saveRate}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="engagementRate" name="Engagement Rate (%)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Saved Post Records & Results Table (Saved from CSV Uploads) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Saved Post Records & Results ({activePosts.length} Total)
            </CardTitle>
            <CardDescription>
              Detailed delivery and engagement results saved from your uploaded CSV files.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              {activePosts.length} Records
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setIsCSVModalOpen(true)}
            >
              Upload New CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t border-slate-100 dark:border-slate-800 max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-20">Format</TableHead>
                  <TableHead className="w-36">Topic</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Saves</TableHead>
                  <TableHead className="text-right">Eng. Rate</TableHead>
                  <TableHead className="text-right">Save Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePosts.slice(0, 50).map((post, i) => (
                  <TableRow key={post.id || i}>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {post.date}
                    </TableCell>
                    <TableCell>
                      <Badge
                        size="sm"
                        variant={post.format === 'carousel' ? 'violet' : post.format === 'reel' ? 'blue' : 'neutral'}
                      >
                        {post.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                      {post.topic || <span className="text-slate-400 italic">n/a</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-800 dark:text-slate-200 truncate max-w-xs" title={post.caption}>
                      {post.caption}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCount(post.reach)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCount(post.likes)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-sky-600 dark:text-sky-400 font-semibold">
                      {formatCount(post.shares)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCount(post.saves)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {formatMetricPercentage(post.engagementRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMetricPercentage(post.saveRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Required Note Area: Sample Sizes and Limitations */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Sample Sizes, Statistical Confidence & Algorithmic Limitations
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-slate-100 block mb-1">
              Sample Size Caveat (N = {posts.length})
            </strong>
            <p>
              Metrics derived from under 30 posts per format lack statistical power. Instagram's distribution varies widely based on initial hour velocity and follower activity windows.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-slate-100 block mb-1">
              Denominator Integrity
            </strong>
            <p>
              All rates strictly divide by <strong>Reach</strong> (unique accounts), never Impressions. If Reach is unavailable from Meta API exports, the metric evaluates to <span className="font-mono">n/a</span>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-slate-100 block mb-1">
              No Guaranteed Outcomes
            </strong>
            <p>
              Historical correlation does not guarantee future algorithm preference. Recommendations highlight high-probability patterns, not engagement guarantees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
