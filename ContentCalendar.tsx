import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  List,
  Grid,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  EmptyState,
  Select,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { ContentStatus, PostFormat, PostMetricData } from '../types/index.ts';
import { formatCount, formatMetricPercentage } from '../lib/metrics.ts';

export function ContentCalendar() {
  const { posts, useSampleData, setUseSampleData, setIsCSVModalOpen } = useApp();
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (formatFilter !== 'all' && p.format !== formatFilter) return false;
      return true;
    });
  }, [posts, statusFilter, formatFilter]);

  if (posts.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Content Calendar
              </h2>
              <Badge variant="amber">Planning tool only</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Draft, schedule, and review post experiment timelines.
            </p>
          </div>
        </div>
        <EmptyState
          icon={<CalendarIcon className="w-10 h-10 text-slate-400" />}
          title="No Scheduled or Published Posts"
          description="Import your historical Instagram export or toggle sample data to explore the monthly planning calendar."
          actionLabel="Import a CSV"
          onAction={() => setIsCSVModalOpen(true)}
          secondaryActionLabel="Load Sample Calendar"
          onSecondaryAction={() => setUseSampleData(true)}
        />
      </div>
    );
  }

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case 'published':
        return <Badge size="sm" variant="emerald">Published</Badge>;
      case 'planned':
        return <Badge size="sm" variant="violet">Planned</Badge>;
      case 'draft':
        return <Badge size="sm" variant="neutral">Draft</Badge>;
      case 'rejected':
        return <Badge size="sm" variant="rose">Rejected</Badge>;
    }
  };

  // Month grid simulation (October 2026)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header with Required "Planning tool only" Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Content Calendar
            </h2>
            <Badge variant="amber" size="md">
              Planning tool only
            </Badge>
            {useSampleData && <Badge variant="sample">SAMPLE DATA</Badge>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Map out experiment cadences, format rotations, and status checkpoints across the month.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List ({filteredPosts.length})</span>
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Formats</option>
            <option value="reel">Reels</option>
            <option value="carousel">Carousels</option>
            <option value="static_image">Static Images</option>
          </select>
        </div>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                October 2026
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Published
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Planned
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Draft
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-semibold py-2 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {daysInMonth.map((day) => {
                const dayStr = day < 10 ? `0${day}` : `${day}`;
                const fullDate = `2026-10-${dayStr}`;
                const postsOnDay = filteredPosts.filter((p) => p.date === fullDate);

                return (
                  <div
                    key={day}
                    className="min-h-24 p-2 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono font-medium ${day === 24 ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                        {day}
                      </span>
                      {postsOnDay.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {postsOnDay.length} posts
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1">
                      {postsOnDay.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className="px-1.5 py-0.5 rounded text-[10px] truncate border font-medium flex items-center justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          title={p.caption}
                        >
                          <span className="truncate">{p.caption}</span>
                          <span className="ml-1 uppercase text-[8px] text-slate-400 font-mono shrink-0">
                            {p.format === 'static_image' ? 'IMG' : p.format.slice(0, 3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled & Logged Posts</CardTitle>
            <CardDescription>
              Chronological post schedule with status and metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium text-slate-400">
                        {post.date}
                      </span>
                      {getStatusBadge(post.status)}
                      <Badge size="sm" variant="neutral">{post.format}</Badge>
                      <span className="text-xs font-medium text-slate-500">
                        Topic: {post.topic || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                      {post.caption}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Reach</span>
                      <span className="font-mono font-semibold">{formatCount(post.reach)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Eng. Rate</span>
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatMetricPercentage(post.engagementRate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Save Rate</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMetricPercentage(post.saveRate)}
                      </span>
                    </div>
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
