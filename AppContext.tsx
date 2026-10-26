import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  PostMetricData,
  Campaign,
  MemoryEvent,
  AudienceFeedbackItem,
  CreatorProfile,
} from '../types/index.ts';
import {
  generateSamplePosts,
  SAMPLE_CAMPAIGNS,
  SAMPLE_MEMORY_EVENTS,
  SAMPLE_FEEDBACK,
  SAMPLE_PROFILE,
} from '../lib/sampleData.ts';
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabaseClient.ts';
import {
  fetchUserProfile,
  upsertUserProfile,
  fetchUserPosts,
  importBatchPostsToDb,
  deleteAllUserPostsFromDb,
  fetchUserCampaigns,
  createUserCampaign,
  updateUserCampaign,
  deleteUserCampaign,
  fetchUserMemoryEvents,
} from '../lib/db.ts';
import { checkHindsightStatus, fetchServerMemoryEvents } from '../lib/hindsightClient.ts';

export interface SupabaseStatusState {
  configured: boolean;
  status: 'not_configured' | 'connected' | 'error';
  message: string;
  latencyMs?: number;
}

interface AppContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Supabase Auth & Session
  currentUser: User | null;
  session: Session | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
  supabaseStatus: SupabaseStatusState | null;
  refreshSupabaseStatus: () => Promise<SupabaseStatusState>;

  // Sample data toggle
  useSampleData: boolean;
  setUseSampleData: (val: boolean) => void;

  // Data collections (reactive to sample data toggle and local actions)
  posts: PostMetricData[];
  importedPosts: PostMetricData[];
  campaigns: Campaign[];
  memoryEvents: MemoryEvent[];
  audienceFeedback: AudienceFeedbackItem[];
  profile: CreatorProfile;

  // Actions
  addCampaign: (campaign: Omit<Campaign, 'id'>) => Promise<void> | void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void> | void;
  deleteCampaign: (id: string) => Promise<void> | void;
  addFeedback: (text: string, category: AudienceFeedbackItem['category']) => void;
  updateProfile: (updates: Partial<CreatorProfile>) => Promise<void> | void;
  importCSVPosts: (newPosts: Partial<PostMetricData>[]) => Promise<{ inserted: number; skipped: number }>;
  clearImportedData: () => Promise<void> | void;

  // Real Backend Status & Events
  hindsightStatus: {
    configured: boolean;
    status: 'not_configured' | 'connected' | 'error';
    message: string;
    bankId?: string;
    latencyMs?: number;
  } | null;
  geminiStatus: { configured: boolean; model: string } | null;
  refreshHindsightStatus: () => Promise<any>;
  serverMemoryEvents: MemoryEvent[];
  refreshServerMemoryEvents: () => Promise<void>;

  // Modal controls
  isCSVModalOpen: boolean;
  setIsCSVModalOpen: (open: boolean) => void;
}

const EMPTY_PROFILE: CreatorProfile = {
  brandName: 'irlvansh',
  instagramHandle: '@irlvansh',
  niche: 'Relatable Short-Form Reels & Youth Culture',
  targetAudience: 'Youth & Creators: 60.4% aged 13-24 (38% 18-24, 22.4% 13-17), 75.9% Men, top in India (Delhi, Mumbai, Bangalore)',
  preferredFormats: ['reel'],
  tone: 'Authentic, viral, fast-hook, high-share, culturally grounded',
  goals: 'Sustain explosive viral distribution (32M views, 2.3M shares across 321 reels) while converting reach into long-term community and saves.',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('socialpulse_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Supabase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusState | null>(null);

  // App domain state
  const [useSampleData, setUseSampleData] = useState<boolean>(true);
  const [importedPosts, setImportedPosts] = useState<PostMetricData[]>([]);
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>([]);
  const [userFeedback, setUserFeedback] = useState<AudienceFeedbackItem[]>([]);
  const [userProfile, setUserProfile] = useState<CreatorProfile>(EMPTY_PROFILE);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  const [hindsightStatus, setHindsightStatus] = useState<{
    configured: boolean;
    status: 'not_configured' | 'connected' | 'error';
    message: string;
    bankId?: string;
    latencyMs?: number;
  } | null>(null);

  const [geminiStatus, setGeminiStatus] = useState<{
    configured: boolean;
    model: string;
  } | null>(null);

  const [serverMemoryEvents, setServerMemoryEvents] = useState<MemoryEvent[]>([]);

  // -------------------------------------------------------------
  // Supabase Connection & Session Listener
  // -------------------------------------------------------------

  const refreshSupabaseStatus = async (): Promise<SupabaseStatusState> => {
    const status = await checkSupabaseConnection();
    setSupabaseStatus(status);
    return status;
  };

  const loadUserData = async (userId: string) => {
    try {
      // 1. Load Profile
      const prof = await fetchUserProfile(userId);
      if (prof) {
        setUserProfile(prof);
      }

      // 2. Load Posts
      const postsData = await fetchUserPosts(userId);
      setImportedPosts(postsData);

      // 3. Load Campaigns
      const campData = await fetchUserCampaigns(userId);
      setUserCampaigns(campData);

      // 4. Load Memory Events
      const events = await fetchUserMemoryEvents(userId);
      setServerMemoryEvents(events);
    } catch (err) {
      console.error('[SocialPulse] Failed loading user data from Supabase:', err);
    }
  };

  useEffect(() => {
    refreshSupabaseStatus();

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setCurrentUser(data.session?.user || null);
        if (data.session?.user) {
          loadUserData(data.session.user.id);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setCurrentUser(newSession?.user || null);
        if (newSession?.user) {
          loadUserData(newSession.user.id);
        } else {
          // Cleared on sign out
          setUserProfile(EMPTY_PROFILE);
          setImportedPosts([]);
          setUserCampaigns([]);
          setServerMemoryEvents([]);
        }
        refreshSupabaseStatus();
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setSession(null);
    setUserProfile(EMPTY_PROFILE);
    setImportedPosts([]);
    setUserCampaigns([]);
    setServerMemoryEvents([]);
  };

  // -------------------------------------------------------------
  // Backend Service Statuses
  // -------------------------------------------------------------

  const refreshHindsightStatus = async () => {
    try {
      const data = await checkHindsightStatus();
      setHindsightStatus(data.hindsight || (data as any));
      if (data.gemini) {
        setGeminiStatus(data.gemini);
      }
      return data;
    } catch {
      // fallback
    }
    const fallback = { configured: false, status: 'not_configured' as const, message: 'Status unavailable' };
    setHindsightStatus(fallback);
    return fallback;
  };

  const refreshServerMemoryEvents = async () => {
    // If user is authenticated, query Supabase directly for accurate RLS records
    if (!currentUser) {
      return;
    }

    try {
      const events = await fetchUserMemoryEvents(currentUser.id);
      setServerMemoryEvents(events);
    } catch {
      // Direct client failed, try server route with token
      try {
        const { events } = await fetchServerMemoryEvents();
        if (Array.isArray(events)) {
          const mapped: MemoryEvent[] = events.map((e: any) => ({
            id: e.id,
            timestamp: e.timestamp,
            operation: e.operation,
            status: e.status === 'failed' ? 'failed' : 'success',
            source: `Hindsight Bank [${e.scope}]`,
            preview: e.errorMessage ? `Error: ${e.errorMessage} (Attempted: "${e.preview}")` : e.preview,
            isSample: false,
          }));
          setServerMemoryEvents(mapped);
        }
      } catch {
        // Ignore fallback errors
      }
    }
  };

  useEffect(() => {
    refreshHindsightStatus();
    refreshServerMemoryEvents();
  }, [currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('socialpulse_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('socialpulse_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // -------------------------------------------------------------
  // Data Collections (Sample vs Real)
  // SAMPLE DATA is purely in-memory and NEVER written to Supabase!
  // -------------------------------------------------------------

  const samplePosts = React.useMemo(() => (useSampleData ? generateSamplePosts() : []), [useSampleData]);
  const posts = React.useMemo(() => {
    return [...importedPosts, ...samplePosts];
  }, [importedPosts, samplePosts]);

  const campaigns = React.useMemo(() => {
    if (useSampleData) {
      return [...userCampaigns, ...SAMPLE_CAMPAIGNS];
    }
    return userCampaigns;
  }, [useSampleData, userCampaigns]);

  const memoryEvents = React.useMemo(() => {
    if (useSampleData) {
      return SAMPLE_MEMORY_EVENTS;
    }
    return serverMemoryEvents;
  }, [useSampleData, serverMemoryEvents]);

  const audienceFeedback = React.useMemo(() => {
    if (useSampleData) {
      return [...userFeedback, ...SAMPLE_FEEDBACK];
    }
    return userFeedback;
  }, [useSampleData, userFeedback]);

  const profile = React.useMemo(() => {
    if (userProfile.brandName || userProfile.niche) {
      return userProfile;
    }
    return useSampleData ? SAMPLE_PROFILE : EMPTY_PROFILE;
  }, [useSampleData, userProfile]);

  // -------------------------------------------------------------
  // Persistent Actions
  // -------------------------------------------------------------

  const addCampaign = async (campData: Omit<Campaign, 'id'>) => {
    if (currentUser) {
      try {
        const created = await createUserCampaign(currentUser.id, campData);
        setUserCampaigns((prev) => [created, ...prev]);
        return;
      } catch (err) {
        console.error('Failed to create campaign in DB:', err);
      }
    }

    // Local in-memory fallback
    const newCamp: Campaign = {
      ...campData,
      id: `camp-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isSample: false,
    };
    setUserCampaigns((prev) => [newCamp, ...prev]);
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (currentUser && !id.startsWith('camp-sample')) {
      try {
        await updateUserCampaign(currentUser.id, id, updates);
      } catch (err) {
        console.error('Failed to update campaign in DB:', err);
      }
    }
    setUserCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCampaign = async (id: string) => {
    if (currentUser && !id.startsWith('camp-sample')) {
      try {
        await deleteUserCampaign(currentUser.id, id);
      } catch (err) {
        console.error('Failed to delete campaign from DB:', err);
      }
    }
    setUserCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const addFeedback = (text: string, category: AudienceFeedbackItem['category']) => {
    const newItem: AudienceFeedbackItem = {
      id: `fb-user-${Date.now()}`,
      category,
      text,
      date: new Date().toISOString().split('T')[0],
      sentimentScore: category === 'positive' ? 0.8 : category === 'negative' ? -0.7 : 0.0,
    };
    setUserFeedback((prev) => [newItem, ...prev]);
  };

  const updateProfile = async (updates: Partial<CreatorProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
    if (currentUser) {
      try {
        await upsertUserProfile(currentUser.id, updates);
      } catch (err) {
        console.error('Failed to persist profile in Supabase:', err);
      }
    }
  };

  const importCSVPosts = async (newRows: Partial<PostMetricData>[]): Promise<{ inserted: number; skipped: number }> => {
    // 1. Deduplicate input against existing posts in memory
    const existingKeys = new Set<string>();
    for (const p of importedPosts) {
      if (p.externalPostId) {
        existingKeys.add(`id:${p.externalPostId.toLowerCase()}`);
      }
      if (p.date && p.caption) {
        existingKeys.add(`content:${p.date}|${p.caption.toLowerCase()}`);
      }
    }

    const deduplicated: Partial<PostMetricData>[] = [];
    for (let i = 0; i < newRows.length; i++) {
      const r = newRows[i];
      if (!r.date || (!r.caption && !r.externalPostId)) {
        continue;
      }
      const idKey = r.externalPostId ? `id:${r.externalPostId.toLowerCase()}` : null;
      const contentKey = r.caption ? `content:${r.date}|${r.caption.toLowerCase()}` : null;

      if ((idKey && existingKeys.has(idKey)) || (contentKey && existingKeys.has(contentKey))) {
        continue;
      }

      if (idKey) existingKeys.add(idKey);
      if (contentKey) existingKeys.add(contentKey);

      deduplicated.push(r);
    }

    // 2. If authenticated, persist deduplicated batch into Supabase posts table
    if (currentUser && deduplicated.length > 0) {
      try {
        const result = await importBatchPostsToDb(currentUser.id, deduplicated);
        // Reload fresh rows from DB to ensure IDs and computed columns match Postgres exactly
        const freshPosts = await fetchUserPosts(currentUser.id);
        setImportedPosts(freshPosts);
        return {
          inserted: result.insertedCount,
          skipped: result.skippedCount + (newRows.length - deduplicated.length),
        };
      } catch (err) {
        console.error('Failed to persist posts into Supabase:', err);
      }
    }

    // 3. In-memory fallback if not authenticated
    const formatted: PostMetricData[] = deduplicated.map((r, i) => ({
      id: r.id || `csv-row-${Date.now()}-${i}`,
      externalPostId: r.externalPostId ?? null,
      date: r.date || new Date().toISOString().slice(0, 10),
      caption: r.caption ?? '',
      topic: r.topic ?? null,
      format: r.format || 'reel',
      status: r.status || 'published',
      reach: r.reach !== undefined ? r.reach : null,
      impressions: r.impressions !== undefined ? r.impressions : null,
      views: r.views !== undefined ? r.views : null,
      likes: r.likes !== undefined ? r.likes : null,
      comments: r.comments !== undefined ? r.comments : null,
      shares: r.shares !== undefined ? r.shares : null,
      saves: r.saves !== undefined ? r.saves : null,
      profileVisits: r.profileVisits !== undefined ? r.profileVisits : null,
      follows: r.follows !== undefined ? r.follows : null,
      hook: r.hook ?? null,
      callToAction: r.callToAction ?? null,
      engagementRate: r.engagementRate ?? null,
      shareRate: r.shareRate ?? null,
      saveRate: r.saveRate ?? null,
      isSample: false,
    }));

    setImportedPosts((prev) => [...formatted, ...prev]);
    return {
      inserted: formatted.length,
      skipped: newRows.length - formatted.length,
    };
  };

  const clearImportedData = async () => {
    if (currentUser) {
      try {
        await deleteAllUserPostsFromDb(currentUser.id);
      } catch (err) {
        console.error('Failed to delete user posts from Supabase:', err);
      }
    }
    setImportedPosts([]);
  };

  return (
    <AppContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        currentUser,
        session,
        isAuthModalOpen,
        setIsAuthModalOpen,
        signOut,
        supabaseStatus,
        refreshSupabaseStatus,
        useSampleData,
        setUseSampleData,
        posts,
        importedPosts,
        campaigns,
        memoryEvents,
        audienceFeedback,
        profile,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        addFeedback,
        updateProfile,
        importCSVPosts,
        clearImportedData,
        hindsightStatus,
        geminiStatus,
        refreshHindsightStatus,
        serverMemoryEvents,
        refreshServerMemoryEvents,
        isCSVModalOpen,
        setIsCSVModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
