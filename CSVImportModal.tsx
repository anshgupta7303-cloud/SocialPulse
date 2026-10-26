import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Modal,
  Button,
  Badge,
} from '../ui/index.ts';
import {
  analyzeCSVContent,
  CSVAnalysisResult,
} from '../../lib/csvParser.ts';
import { PostMetricData } from '../../types/index.ts';
import {
  formatMetricPercentage,
  formatCount,
} from '../../lib/metrics.ts';
import { useApp } from '../../context/AppContext.tsx';

export interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (importedPosts: Partial<PostMetricData>[]) => void;
}

export function CSVImportModal({ isOpen, onClose, onImportComplete }: CSVImportModalProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'info'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<CSVAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { importedPosts } = useApp();
  const navigate = useNavigate();

  const resetAll = () => {
    setCurrentStep('upload');
    setFileName('');
    setAnalysis(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const processFile = (text: string, name: string) => {
    setFileName(name);
    const result = analyzeCSVContent(name, text, importedPosts);
    setAnalysis(result);

    // Automatically save into the app state and database
    if (onImportComplete && result.validRows.length > 0) {
      onImportComplete(result.validRows);
    }

    setCurrentStep('info');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      processFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      processFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleGoToAnalytics = () => {
    handleClose();
    navigate('/analytics');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        currentStep === 'upload'
          ? 'Upload CSV Metrics File'
          : 'CSV Information & Saved to Analytics'
      }
      description={
        currentStep === 'upload'
          ? 'Upload your Instagram CSV export to analyze your delivery and engagement metrics.'
          : `Extracted and saved ${analysis?.validRows.length ?? 0} records from "${fileName}" into your Analytics tab.`
      }
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {currentStep === 'info' && analysis && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Saved into Analytics tab</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStep === 'upload' && (
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            )}

            {currentStep === 'info' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                  onClick={resetAll}
                >
                  Upload Another File
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={handleGoToAnalytics}
                >
                  View in Analytics Tab
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* 1. UPLOAD VIEW - Clean, focused, no distracting options */}
      {currentStep === 'upload' && (
        <div className="py-2 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-4 ring-indigo-100 dark:ring-indigo-900/40'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 hover:border-indigo-400 dark:hover:border-indigo-600'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Upload className="w-8 h-8" />
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Drag & Drop your CSV file here
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Compatible with Meta Business Suite, Instagram Creator Studio, and spreadsheet post metrics exports (.csv).
            </p>

            <div className="mt-6">
              <label className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm transition-all hover:scale-102">
                <span>Browse Files (.csv)</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 2. CSV INFO VIEW - Tells the user info in the CSV & confirms it's saved in Analytics */}
      {currentStep === 'info' && analysis && (
        <div className="space-y-5 py-1">
          {/* Success Banner */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-start gap-3 shadow-2xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                Data Saved to Analytics Tab!
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                Extracted <strong>{analysis.validRows.length} post records</strong> from{' '}
                <span className="font-mono font-semibold">{analysis.fileName}</span>. All delivery metrics, engagement rates, and format benchmarks are updated in your Analytics tab.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={handleGoToAnalytics}
              className="text-xs shrink-0"
            >
              Open Analytics
            </Button>
          </div>

          {/* Section: Information in the CSV File */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Information Extracted From CSV File:
              </h5>
              <span className="text-[11px] font-mono text-slate-400">
                {analysis.totalLines} lines • {analysis.headers.length} columns detected
              </span>
            </div>

            {/* 6 Key Extracted Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Card 1: Posts Count */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Total Posts / Reels
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {analysis.accountInsights?.reelsCount
                    ? `${analysis.accountInsights.reelsCount} Reels`
                    : formatCount(analysis.totalPosts)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {Object.entries(analysis.formatsCount).map(([k, v]) => `${v} ${k}s`).join(', ') || 'posts'}
                </span>
              </div>

              {/* Card 2: Accounts Reached */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Accounts Reached
                </span>
                <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {analysis.accountInsights ? analysis.accountInsights.viewersFormatted : formatCount(analysis.totalReach)}
                </span>
                <span className="text-[10px] text-slate-500">Unique accounts reached</span>
              </div>

              {/* Card 3: Engagements Rate */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Avg Engagement Rate
                </span>
                <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {formatMetricPercentage(analysis.avgEngagementRate)}
                </span>
                <span className="text-[10px] text-slate-500">(Total Engagements ÷ Reach)</span>
              </div>

              {/* Card 4: Save Rate */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Save Rate (Bookmarks)
                </span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatMetricPercentage(analysis.avgSaveRate)}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  {analysis.accountInsights ? analysis.accountInsights.savesFormatted : formatCount(analysis.totalSaves)} total saves
                </span>
              </div>

              {/* Card 5: Share Rate */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Share Rate (Virality)
                </span>
                <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5 block">
                  {formatMetricPercentage(analysis.avgShareRate)}
                </span>
                <span className="text-[10px] text-sky-600 font-medium">
                  {analysis.accountInsights ? analysis.accountInsights.sharesFormatted : formatCount(analysis.totalShares)} total shares
                </span>
              </div>

              {/* Card 6: Total Likes */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Likes & Comments
                </span>
                <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {analysis.accountInsights ? analysis.accountInsights.likesFormatted : formatCount(analysis.totalLikes)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {analysis.accountInsights
                    ? `${analysis.accountInsights.commentsFormatted} comments`
                    : `${formatCount(analysis.totalComments)} comments`}
                </span>
              </div>
            </div>

            {/* File Metadata Details Strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Columns Detected in CSV:
                </span>
                {analysis.headers.slice(0, 10).map((h, idx) => (
                  <Badge key={idx} size="sm" variant="neutral">
                    {h}
                  </Badge>
                ))}
                {analysis.headers.length > 10 && (
                  <span className="text-[10px] text-slate-400">+{analysis.headers.length - 10} more</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Date Range: <strong>{analysis.dateRange ? `${analysis.dateRange.start} to ${analysis.dateRange.end}` : 'N/A'}</strong>
                </span>
                {analysis.accountInsights && (
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium">
                    <span>Account: <strong>{analysis.accountInsights.handle}</strong></span>
                    <span>•</span>
                    <span>Followers: <strong>{analysis.accountInsights.followersFormatted}</strong></span>
                    {analysis.accountInsights.topCities && analysis.accountInsights.topCities[0] && (
                      <>
                        <span>•</span>
                        <span>Top City: <strong>{analysis.accountInsights.topCities[0].city}</strong></span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Validation Notes (if errors or duplicates) */}
            {analysis.errors.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">
                    {analysis.errors.length} rows excluded due to invalid date or formatting.
                  </strong>
                  <span>Only verified rows were saved into Analytics.</span>
                </div>
              </div>
            )}
            {analysis.skippedDuplicates > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                {analysis.skippedDuplicates} duplicate records matching existing posts were skipped.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
