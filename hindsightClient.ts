import { StudioGenerateRequest, StudioGenerateResponse } from '../types/index.ts';
import { getSupabaseToken } from './supabaseClient.ts';

export interface HindsightStatusResponse {
  configured: boolean;
  status: 'not_configured' | 'connected' | 'error';
  message: string;
  bankId?: string;
  latencyMs?: number;
  gemini?: {
    configured: boolean;
    model: string;
  };
  hindsight?: {
    configured: boolean;
    status: 'not_configured' | 'connected' | 'error';
    message: string;
    bankId?: string;
    latencyMs?: number;
  };
}

export interface RealMemoryEvent {
  id: string;
  timestamp: string;
  operation: 'retain' | 'recall';
  status: 'success' | 'failed';
  scope: string;
  preview: string;
  errorMessage?: string;
  rawResponse?: any;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkHindsightStatus(): Promise<HindsightStatusResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/status', { headers });
    if (!res.ok) {
      return {
        configured: false,
        status: 'error',
        message: res.status === 401 ? 'Please sign in to view live connection status.' : `Status check failed with HTTP ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      status: 'error',
      message: `Failed to connect to backend server: ${err?.message || 'Network error'}`,
    };
  }
}

export async function fetchServerMemoryEvents(): Promise<{ events: RealMemoryEvent[]; total: number; disclaimer: string }> {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      return { events: [], total: 0, disclaimer: 'Sign in to access persistent server memory events.' };
    }
    const res = await fetch('/api/memory/events', { headers });
    if (!res.ok) {
      return { events: [], total: 0, disclaimer: '' };
    }
    return await res.json();
  } catch {
    return { events: [], total: 0, disclaimer: '' };
  }
}

export async function retainMemory(
  text: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; status: 'success' | 'failed'; message: string; memoryEventId?: string; data?: any; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/memory/retain', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, metadata }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: 'failed',
        message: json.message || `Retain failed (HTTP ${res.status})`,
        error: json.error,
        data: json.rawResponse,
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      message: `Client error: ${err?.message || 'Network failure'}`,
      error: 'network_error',
    };
  }
}

export async function draftCampaignLesson(
  campaignId: string
): Promise<{ success: boolean; lessonDraft?: string; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/lesson`, {
      method: 'POST',
      headers,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: json.message || `Draft lesson failed (HTTP ${res.status})`,
      };
    }
    return {
      success: true,
      lessonDraft: json.lessonDraft,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error: ${err?.message || 'Failed to connect to lesson service'}`,
    };
  }
}

export async function recallMemory(
  query: string
): Promise<{ success: boolean; status: 'success' | 'failed'; message?: string; query?: string; bankId?: string; data?: any; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/memory/recall', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: 'failed',
        message: json.message || `Recall failed (HTTP ${res.status})`,
        error: json.error,
        query,
        data: json.rawResponse ?? json.data ?? json,
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      message: `Client error: ${err?.message || 'Network failure'}`,
      error: 'network_error',
    };
  }
}

export async function generateStudioIdeas(
  params: StudioGenerateRequest
): Promise<StudioGenerateResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/studio/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || `Generation failed (HTTP ${res.status})`;
    const err = new Error(errorMsg) as Error & { code?: string; details?: any };
    err.code = data.error || `HTTP_${res.status}`;
    err.details = data.errors || data;
    throw err;
  }

  return data;
}

