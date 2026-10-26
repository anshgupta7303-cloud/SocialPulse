import React from 'react';
import {
  Menu,
  Moon,
  Sun,
  Database,
  Bot,
  Brain,
  Upload,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { useApp } from '../../context/AppContext.tsx';

export interface TopBarProps {
  onToggleMobileMenu: () => void;
}

export function TopBar({ onToggleMobileMenu }: TopBarProps) {
  const {
    isDarkMode,
    toggleDarkMode,
    useSampleData,
    setUseSampleData,
    setIsCSVModalOpen,
    hindsightStatus,
    geminiStatus,
    supabaseStatus,
    currentUser,
    signOut,
    setIsAuthModalOpen,
  } = useApp();

  const hindsightBadgeStatus = hindsightStatus?.status || 'not_configured';
  const hindsightBadgeText =
    hindsightBadgeStatus === 'connected'
      ? 'Connected'
      : hindsightBadgeStatus === 'error'
      ? 'Error'
      : 'Not configured';

  const geminiBadgeStatus = geminiStatus?.configured ? 'connected' : 'not_configured';
  const geminiBadgeText = geminiStatus?.configured ? 'Connected' : 'Not configured';

  const supabaseBadgeStatus = supabaseStatus?.status || 'not_configured';
  const supabaseBadgeText =
    supabaseBadgeStatus === 'connected'
      ? 'Connected'
      : supabaseBadgeStatus === 'error'
      ? 'Error'
      : 'Not configured';

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Mobile Menu button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
            SocialPulse AI
          </span>
          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">/</span>
          <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400">
            Stage 4: Supabase Auth & Persistence
          </span>
        </div>
      </div>

      {/* Integration Badges (reflecting real status) */}
      <div className="hidden lg:flex items-center gap-2">
        <StatusBadge
          label="Supabase"
          status={supabaseBadgeStatus}
          statusText={supabaseBadgeText}
        />
        <StatusBadge
          label="Gemini"
          status={geminiBadgeStatus}
          statusText={geminiBadgeText}
        />
        <StatusBadge
          label="Hindsight"
          status={hindsightBadgeStatus}
          statusText={hindsightBadgeText}
        />
      </div>

      {/* Controls: Sample Toggle, CSV Upload, Theme, Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sample Data Toggle */}
        <button
          onClick={() => setUseSampleData(!useSampleData)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            useSampleData
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
          title="Toggle synthetic 60-post sample dataset (never written to database)"
        >
          {useSampleData ? (
            <ToggleRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-slate-400" />
          )}
          <span className="hidden xs:inline">Sample:</span>
          <span className="font-semibold">{useSampleData ? 'ON' : 'OFF'}</span>
        </button>

        {/* CSV Import Button */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex text-xs"
          leftIcon={<Upload className="w-3.5 h-3.5" />}
          onClick={() => setIsCSVModalOpen(true)}
        >
          CSV Import
        </Button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Supabase User Authentication Button / Profile Badge */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 pl-2.5 text-xs">
            <span className="max-w-[110px] truncate text-slate-700 dark:text-slate-300 font-medium" title={currentUser.email || 'User'}>
              {currentUser.email?.split('@')[0] || 'Authenticated'}
            </span>
            <button
              onClick={() => signOut()}
              className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
            onClick={() => setIsAuthModalOpen(true)}
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
