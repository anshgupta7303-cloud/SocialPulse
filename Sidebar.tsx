import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Calendar,
  Target,
  BrainCircuit,
  History,
  MessageSquareHeart,
  Settings,
  Plug2,
  UploadCloud,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { useApp } from '../../context/AppContext.tsx';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  tag?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { to: '/studio', label: 'Content Studio', icon: <Sparkles className="w-4 h-4" /> },
  { to: '/calendar', label: 'Content Calendar', icon: <Calendar className="w-4 h-4" />, tag: 'Plan' },
  { to: '/campaigns', label: 'Campaigns', icon: <Target className="w-4 h-4" /> },
  { to: '/memory-lab', label: 'Memory Lab', icon: <BrainCircuit className="w-4 h-4" />, tag: 'Hindsight' },
  { to: '/memory-activity', label: 'Memory Activity', icon: <History className="w-4 h-4" /> },
  { to: '/feedback', label: 'Audience Feedback', icon: <MessageSquareHeart className="w-4 h-4" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  { to: '/integrations', label: 'Integrations', icon: <Plug2 className="w-4 h-4" /> },
];

export interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { setIsCSVModalOpen, useSampleData, profile } = useApp();

  return (
    <aside className="w-64 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-none">
              SocialPulse AI
            </h1>
            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
              Growth Agent Shell
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          Remembers, learns, and improves with every campaign.
        </p>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Core Agent Navigation
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.tag && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                {item.tag}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Quick Action & Profile Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400"
          leftIcon={<UploadCloud className="w-3.5 h-3.5 text-indigo-500" />}
          onClick={() => {
            setIsCSVModalOpen(true);
            if (onCloseMobile) onCloseMobile();
          }}
        >
          Import Content CSV...
        </Button>

        <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Profile
            </span>
            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
              {profile.brandName || 'Untitled Brand'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {profile.instagramHandle || 'No handle set'}
            </p>
          </div>
          {useSampleData && (
            <Badge size="sm" variant="sample">
              Sample
            </Badge>
          )}
        </div>
      </div>
    </aside>
  );
}
