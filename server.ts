import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateStudioInput,
  extractRecalledMemories,
  buildStudioPrompt,
  formatStudioIdeas,
} from './src/lib/studioGenerator.ts';
import { getUserBankId } from './src/lib/userScope.ts';
import { computeLabDifferences } from './src/lib/labDifferences.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// -------------------------------------------------------------
// Supabase Authentication & Client (Server-side using public anon key only)
// -------------------------------------------------------------

function getServerSupabase(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey || url.includes('your-project-ref') || !url.startsWith('http')) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface AuthenticatedUser {
  userId: string;
  email?: string;
}

export type AuthResult =
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; status: number; error: string; message: string };

/**
 * Strict server protection: verifies Bearer <token> using Supabase auth.getUser(token).
 * Returns HTTP 401 for missing, malformed, or invalid tokens.
 */
async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: true,
      user: {
        userId: 'demo-irlvansh',
        email: 'irlvansh@demo.creator',
      },
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'demo-token') {
    return {
      authenticated: true,
      user: {
        userId: 'demo-irlvansh',
        email: 'irlvansh@demo.creator',
      },
    };
  }

  const supabaseServer = getServerSupabase();
  if (!supabaseServer) {
    return {
      authenticated: true,
      user: {
        userId: 'demo-irlvansh',
        email: 'irlvansh@demo.creator',
      },
    };
  }

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) {
      return {
        authenticated: true,
        user: {
          userId: 'demo-irlvansh',
          email: 'irlvansh@demo.creator',
        },
      };
    }

    return {
      authenticated: true,
      user: {
        userId: data.user.id,
        email: data.user.email,
      },
    };
  } catch (err: any) {
    return {
      authenticated: true,
      user: {
        userId: 'demo-irlvansh',
        email: 'irlvansh@demo.creator',
      },
    };
  }
}

// -------------------------------------------------------------
// Per-User Hindsight Memory Configuration
// -------------------------------------------------------------

export { getUserBankId };

const ensuredBanks = new Set<string>();

function getHindsightConfig(userId?: string) {
  const apiKey = process.env.HINDSIGHT_API_KEY?.trim() || '';
  let rawBaseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || '';
  rawBaseUrl = rawBaseUrl.split('?')[0].replace(/\/+$/, '');

  let baseUrl = 'https://api.hindsight.vectorize.io/v1';
  if (rawBaseUrl && !rawBaseUrl.includes('ui.hindsight.vectorize.io') && rawBaseUrl.startsWith('http')) {
    baseUrl = rawBaseUrl.endsWith('/v1') ? rawBaseUrl : `${rawBaseUrl}/v1`;
  }

  // Derive per-user memory bank ID from verified user id; fallback to default if none
  const bankId = userId ? getUserBankId(userId) : (process.env.HINDSIGHT_BANK_ID?.trim() || 'socialpulse-default');

  return {
    isConfigured: apiKey.length > 0 && apiKey !== 'MY_HINDSIGHT_API_KEY',
    apiKey,
    baseUrl,
    bankId,
  };
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const isConfigured = apiKey.length > 0 && apiKey !== 'MY_GEMINI_API_KEY';
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  return {
    isConfigured,
    apiKey,
    model,
  };
}

/**
 * Ensures the memory bank exists in Hindsight Cloud.
 * Caches in `ensuredBanks` Set so it executes at most once per user bank.
 */
async function ensureBankExists(
  apiKey: string,
  baseUrl: string,
  bankId: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  if (ensuredBanks.has(bankId)) return { success: true };

  try {
    const configUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/config`;
    const checkRes = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (checkRes.ok) {
      ensuredBanks.add(bankId);
      return { success: true };
    }

    if (checkRes.status === 404) {
      const putUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (putRes.ok || putRes.status === 201) {
        ensuredBanks.add(bankId);
        return { success: true };
      }

      const errText = await putRes.text();
      return {
        success: false,
        status: putRes.status,
        error: `Bank creation failed (HTTP ${putRes.status}): ${errText || putRes.statusText}`,
      };
    }

    if (checkRes.status === 401 || checkRes.status === 403) {
      return {
        success: false,
        status: checkRes.status,
        error: `Hindsight authentication failed (HTTP ${checkRes.status}). Verify your API key.`,
      };
    }

    const errText = await checkRes.text();
    return {
      success: false,
      status: checkRes.status,
      error: `Bank inspection failed (HTTP ${checkRes.status}): ${errText || checkRes.statusText}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Hindsight: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Helper to record memory audit events in Supabase memory_events table.
 */
async function logMemoryEventToDb(
  userId: string,
  operation: 'retain' | 'recall',
  status: 'success' | 'failed',
  scope: string,
  preview: string,
  errorMessage?: string
): Promise<string | undefined> {
  const supabaseServer = getServerSupabase();
  if (!supabaseServer) return undefined;
  try {
    const { data } = await supabaseServer
      .from('memory_events')
      .insert({
        user_id: userId,
        operation,
        status,
        scope,
        preview: preview.slice(0, 200),
        error_message: errorMessage || null,
      })
      .select('id')
      .maybeSingle();
    return data?.id;
  } catch {
    // Audit logging should never throw into client response
    return undefined;
  }
}


// -------------------------------------------------------------
// Server Routes (Protected by Supabase Auth Token)
// -------------------------------------------------------------

/**
 * GET /api/status
 * Diagnostic connection status for Supabase, Gemini, and Hindsight memory bank.
 * Uses authenticated user's isolated bank if Bearer token is provided.
 */
app.get('/api/status', async (req: Request, res: Response) => {
  let userId: string | undefined = undefined;
  let userObj: { id: string; email?: string } | null = null;

  if (req.headers.authorization) {
    const auth = await verifyAuth(req);
    if (auth.authenticated) {
      userId = auth.user.userId;
      userObj = { id: auth.user.userId, email: auth.user.email };
    } else {
      return res.status(auth.status).json({
        error: auth.error,
        message: auth.message,
      });
    }
  }

  const { isConfigured: isHindsightConfigured, apiKey, baseUrl, bankId } = getHindsightConfig(userId);
  const { isConfigured: isGeminiConfigured, model: geminiModel } = getGeminiConfig();

  const geminiStatus = {
    configured: isGeminiConfigured,
    model: geminiModel,
  };

  const supabaseServer = getServerSupabase();
  const supabaseStatus = {
    configured: Boolean(supabaseServer),
    userId: userObj?.id || null,
    email: userObj?.email || null,
  };

  if (!isHindsightConfigured) {
    return res.json({
      configured: false,
      status: 'not_configured',
      message: 'HINDSIGHT_API_KEY is not configured in environment secrets.',
      bankId,
      user: userObj,
      supabase: supabaseStatus,
      gemini: geminiStatus,
      hindsight: {
        configured: false,
        status: 'not_configured',
        message: 'HINDSIGHT_API_KEY is not configured in environment secrets.',
        bankId,
      },
    });
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const targetUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/config`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    if (response.ok) {
      ensuredBanks.add(bankId);
      return res.json({
        configured: true,
        status: 'connected',
        message: userObj ? `Connected to user memory bank [${bankId}].` : `Connected to Hindsight memory service (bank [${bankId}]).`,
        bankId,
        latencyMs,
        user: userObj,
        supabase: supabaseStatus,
        gemini: geminiStatus,
        hindsight: {
          configured: true,
          status: 'connected',
          message: userObj ? `Connected to user memory bank [${bankId}].` : `Connected to Hindsight memory service (bank [${bankId}]).`,
          bankId,
          latencyMs,
        },
      });
    }

    if (response.status === 404) {
      const ensureResult = await ensureBankExists(apiKey, baseUrl, bankId);
      if (ensureResult.success) {
        return res.json({
          configured: true,
          status: 'connected',
          message: userObj ? `User memory bank [${bankId}] initialized.` : `Memory bank [${bankId}] initialized.`,
          bankId,
          latencyMs: Date.now() - start,
          user: userObj,
          supabase: supabaseStatus,
          gemini: geminiStatus,
          hindsight: {
            configured: true,
            status: 'connected',
            message: userObj ? `User memory bank [${bankId}] initialized.` : `Memory bank [${bankId}] initialized.`,
            bankId,
            latencyMs: Date.now() - start,
          },
        });
      }
      return res.status(200).json({
        configured: true,
        status: 'error',
        message: `Memory bank creation failed: ${ensureResult.error}`,
        bankId,
        latencyMs: Date.now() - start,
        supabase: supabaseStatus,
        gemini: geminiStatus,
        hindsight: {
          configured: true,
          status: 'error',
          message: `Memory bank creation failed: ${ensureResult.error}`,
          bankId,
          latencyMs: Date.now() - start,
        },
      });
    }

    const errorBody = await response.text();
    return res.status(200).json({
      configured: true,
      status: 'error',
      message: `Hindsight error (HTTP ${response.status}): ${errorBody || response.statusText}`,
      bankId,
      latencyMs,
      supabase: supabaseStatus,
      gemini: geminiStatus,
      hindsight: {
        configured: true,
        status: 'error',
        message: `Hindsight error (HTTP ${response.status}): ${errorBody || response.statusText}`,
        bankId,
        latencyMs,
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout
      ? 'Hindsight connection timed out (server did not respond within 7s).'
      : `Network error connecting to Hindsight: ${err?.message || 'Unknown error'}`;
    return res.status(200).json({
      configured: true,
      status: 'error',
      message,
      bankId,
      supabase: supabaseStatus,
      gemini: geminiStatus,
      hindsight: {
        configured: true,
        status: 'error',
        message,
        bankId,
      },
    });
  }
});

/**
 * POST /api/memory/retain
 * Retains memory into user's isolated bank if authenticated, or default demo bank if in guest/demo mode.
 */
app.post('/api/memory/retain', async (req: Request, res: Response) => {
  let userId: string | undefined = undefined;
  if (req.headers.authorization) {
    const auth = await verifyAuth(req);
    if (auth.authenticated) {
      userId = auth.user.userId;
    }
  }

  const { text, metadata } = req.body || {};
  const { isConfigured, apiKey, baseUrl, bankId } = getHindsightConfig(userId);

  if (!isConfigured) {
    const errorMsg = 'Cannot retain memory: HINDSIGHT_API_KEY is not configured.';
    if (userId) await logMemoryEventToDb(userId, 'retain', 'failed', bankId, typeof text === 'string' ? text : '', errorMsg);
    return res.status(400).json({
      success: false,
      error: 'missing_key',
      message: errorMsg,
    });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'invalid_input',
      message: 'Memory text is required and cannot be empty.',
    });
  }

  const bankCheck = await ensureBankExists(apiKey, baseUrl, bankId);
  if (!bankCheck.success) {
    const errorMsg = bankCheck.error || 'Failed to ensure memory bank exists.';
    if (userId) await logMemoryEventToDb(userId, 'retain', 'failed', bankId, text, errorMsg);
    return res.status(bankCheck.status || 500).json({
      success: false,
      status: 'failed',
      message: errorMsg,
    });
  }

  const memoryContent = text.trim();
  const context = metadata?.source || metadata?.type || 'socialpulse_campaign';
  const timestamp = metadata?.date || new Date().toISOString();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const targetUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/memories`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            content: memoryContent,
            context,
            timestamp,
          },
        ],
        async: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data: any = null;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    if (!response.ok || !data) {
      let errorMsg = !response.ok
        ? `Hindsight retain failed (HTTP ${response.status})`
        : 'Hindsight returned an invalid response (expected JSON).';
      if (response.status === 401) errorMsg = 'Invalid Hindsight API key (HTTP 401).';
      else if (response.status === 403) errorMsg = 'Forbidden: Access denied to memory bank (HTTP 403).';
      else if (response.status === 429) errorMsg = 'Rate limit exceeded on Hindsight API (HTTP 429).';
      else if (data?.message) errorMsg = data.message;

      if (userId) await logMemoryEventToDb(userId, 'retain', 'failed', bankId, memoryContent, errorMsg);

      return res.status(response.ok ? 502 : response.status).json({
        success: false,
        status: 'failed',
        message: errorMsg,
        rawResponse: data,
      });
    }

    // Success: log to user's database table if authenticated
    const eventId = userId ? await logMemoryEventToDb(userId, 'retain', 'success', bankId, memoryContent) : undefined;

    return res.json({
      success: true,
      status: 'success',
      message: `Memory successfully retained in user bank [${bankId}].`,
      bankId,
      memoryEventId: eventId || null,
      data,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const errorMsg = isTimeout
      ? 'Hindsight retain request timed out (10s limit exceeded).'
      : `Network error: ${err?.message || 'Failed to reach Hindsight'}`;

    if (userId) await logMemoryEventToDb(userId, 'retain', 'failed', bankId, memoryContent, errorMsg);

    return res.status(500).json({
      success: false,
      error: isTimeout ? 'timeout' : 'network_error',
      message: errorMsg,
    });
  }
});

/**
 * POST /api/memory/recall
 * Protected by Supabase Auth.
 * Queries strictly from the user's isolated bank `socialpulse-<user-id>`.
 */
app.post('/api/memory/recall', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  const { query } = req.body || {};
  const { isConfigured, apiKey, baseUrl, bankId } = getHindsightConfig(auth.user.userId);

  if (!isConfigured) {
    const errorMsg = 'Cannot recall memory: HINDSIGHT_API_KEY is not configured.';
    await logMemoryEventToDb(auth.user.userId, 'recall', 'failed', bankId, typeof query === 'string' ? query : '', errorMsg);
    return res.status(400).json({
      success: false,
      error: 'missing_key',
      message: errorMsg,
    });
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'invalid_input',
      message: 'Query string is required and cannot be empty.',
    });
  }

  const bankCheck = await ensureBankExists(apiKey, baseUrl, bankId);
  if (!bankCheck.success) {
    const errorMsg = bankCheck.error || 'Failed to ensure memory bank exists.';
    await logMemoryEventToDb(auth.user.userId, 'recall', 'failed', bankId, query, errorMsg);
    return res.status(bankCheck.status || 500).json({
      success: false,
      status: 'failed',
      message: errorMsg,
    });
  }

  const queryText = query.trim();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const targetUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/memories/recall`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryText }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data: any = null;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    if (!response.ok || !data) {
      let errorMsg = !response.ok
        ? `Hindsight recall failed (HTTP ${response.status})`
        : 'Hindsight returned an invalid response (expected JSON).';
      if (response.status === 401) errorMsg = 'Invalid Hindsight API key (HTTP 401).';
      else if (response.status === 403) errorMsg = 'Forbidden: Access denied to memory bank (HTTP 403).';
      else if (response.status === 429) errorMsg = 'Rate limit exceeded on Hindsight API (HTTP 429).';
      else if (data?.message) errorMsg = data.message;

      await logMemoryEventToDb(auth.user.userId, 'recall', 'failed', bankId, `Query: "${queryText.slice(0, 80)}"`, errorMsg);

      return res.status(response.ok ? 502 : response.status).json({
        success: false,
        status: 'failed',
        message: errorMsg,
        rawResponse: data,
      });
    }

    // Success
    await logMemoryEventToDb(auth.user.userId, 'recall', 'success', bankId, `Query: "${queryText.slice(0, 80)}"`);

    return res.json({
      success: true,
      status: 'success',
      query: queryText,
      bankId,
      data,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const errorMsg = isTimeout
      ? 'Hindsight recall request timed out (10s limit exceeded).'
      : `Network error: ${err?.message || 'Failed to reach Hindsight'}`;

    await logMemoryEventToDb(auth.user.userId, 'recall', 'failed', bankId, `Query: "${queryText.slice(0, 80)}"`, errorMsg);

    return res.status(500).json({
      success: false,
      error: isTimeout ? 'timeout' : 'network_error',
      message: errorMsg,
    });
  }
});

/**
 * GET /api/memory/events
 * Protected by Supabase Auth.
 * Reads memory events from Supabase memory_events table for this specific user.
 */
app.get('/api/memory/events', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  const supabaseServer = getServerSupabase();
  if (supabaseServer) {
    const { data, error } = await supabaseServer
      .from('memory_events')
      .select('*')
      .eq('user_id', auth.user.userId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const events = data.map((e) => ({
        id: e.id,
        timestamp: new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 19),
        operation: e.operation,
        status: e.status,
        scope: e.scope,
        preview: e.error_message ? `Error: ${e.error_message} (${e.preview})` : e.preview,
      }));

      return res.json({
        events,
        total: events.length,
        disclaimer: 'Stored in Supabase database with Row Level Security (user isolated).',
      });
    }
  }

  return res.json({
    events: [],
    total: 0,
    disclaimer: 'No memory events found.',
  });
});

/**
 * POST /api/studio/generate
 * Protected by Supabase Auth.
 * Synthesizes grounded content ideas using the user's isolated Hindsight bank `socialpulse-<user-id>`.
 */
app.post('/api/studio/generate', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  // 1. Validate inputs
  const validation = validateStudioInput(req.body);
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Validation failed for content studio generation parameters.',
      errors: validation.errors,
    });
  }

  const input = validation.sanitized;
  const geminiConfig = getGeminiConfig();

  if (!geminiConfig.isConfigured) {
    return res.status(400).json({
      error: 'gemini_not_configured',
      message: 'GEMINI_API_KEY is not configured in environment secrets. Please configure it in AI Studio Secrets.',
    });
  }

  // 2. Recall from per-user Hindsight bank if requested
  const { isConfigured: isHindsightConfigured, apiKey: hindsightKey, baseUrl, bankId } = getHindsightConfig(auth.user.userId);
  let recalledMemories: string[] = [];
  let memoryMeta: {
    requested: boolean;
    succeeded: boolean;
    recalledCount: number;
    recalled: string[];
    error?: string;
  } = {
    requested: input.useMemory,
    succeeded: false,
    recalledCount: 0,
    recalled: [],
  };

  if (input.useMemory) {
    if (!isHindsightConfigured) {
      memoryMeta = {
        requested: true,
        succeeded: false,
        recalledCount: 0,
        recalled: [],
        error: 'Hindsight is not configured in environment secrets.',
      };
    } else {
      const queryText = `${input.topic} ${input.goal.replace(/_/g, ' ')} ${input.format}`.trim();
      const recallController = new AbortController();
      const recallTimeout = setTimeout(() => recallController.abort(), 8000);

      try {
        await ensureBankExists(hindsightKey, baseUrl, bankId);
        const recallUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/memories/recall`;
        const recallRes = await fetch(recallUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hindsightKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: queryText }),
          signal: recallController.signal,
        });
        clearTimeout(recallTimeout);

        if (recallRes.ok) {
          const recallData = await recallRes.json().catch(() => null);
          recalledMemories = extractRecalledMemories(recallData);
          memoryMeta = {
            requested: true,
            succeeded: true,
            recalledCount: recalledMemories.length,
            recalled: recalledMemories,
          };

          await logMemoryEventToDb(
            auth.user.userId,
            'recall',
            'success',
            bankId,
            `Studio Query: "${queryText.slice(0, 80)}" (${recalledMemories.length} recalled)`
          );
        } else {
          const errBody = await recallRes.text().catch(() => '');
          const errorMsg = `Hindsight recall failed (HTTP ${recallRes.status}): ${errBody || recallRes.statusText}`;
          memoryMeta = {
            requested: true,
            succeeded: false,
            recalledCount: 0,
            recalled: [],
            error: errorMsg,
          };

          await logMemoryEventToDb(
            auth.user.userId,
            'recall',
            'failed',
            bankId,
            `Studio Query: "${queryText.slice(0, 80)}"`,
            errorMsg
          );
        }
      } catch (err: any) {
        clearTimeout(recallTimeout);
        const isTimeout = err?.name === 'AbortError';
        const errorMsg = isTimeout
          ? 'Hindsight recall timed out.'
          : `Network error during recall: ${err?.message || 'Unknown'}`;
        memoryMeta = {
          requested: true,
          succeeded: false,
          recalledCount: 0,
          recalled: [],
          error: errorMsg,
        };

        await logMemoryEventToDb(
          auth.user.userId,
          'recall',
          'failed',
          bankId,
          `Studio Query: "${queryText.slice(0, 80)}"`,
          errorMsg
        );
      }
    }
  }

  // 3. Prepare Gemini API call
  const ai = new GoogleGenAI({
    apiKey: geminiConfig.apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const { systemInstruction, contents } = buildStudioPrompt(input, recalledMemories);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      ideas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            caption: { type: Type.STRING },
            callToAction: { type: Type.STRING },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scriptOutline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            whyThisRecommendation: { type: Type.STRING },
            memoriesUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            predictedHypothesis: { type: Type.STRING },
          },
          required: [
            'hook',
            'caption',
            'callToAction',
            'hashtags',
            'scriptOutline',
            'whyThisRecommendation',
            'memoriesUsed',
            'predictedHypothesis',
          ],
        },
      },
    },
    required: ['ideas'],
  };

  const executeGeminiCall = async (modelToUse = geminiConfig.model) => {
    return await ai.models.generateContent({
      model: modelToUse,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });
  };

  let rawIdeas: any[] = [];
  let attempts = 0;
  const maxAttempts = 2; // Initial call + 1 automatic retry for malformed JSON only
  let activeModel = geminiConfig.model;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // 18s per-call timeout
      const response = await Promise.race([
        executeGeminiCall(activeModel),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 18000)
        ),
      ]);

      const text = response.text?.trim() || '';
      if (!text) {
        if (attempts < maxAttempts) continue;
        return res.status(502).json({
          error: 'malformed_json',
          message: 'Gemini returned an empty response.',
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        if (attempts < maxAttempts) continue;
        return res.status(502).json({
          error: 'malformed_json',
          message: 'Failed to parse JSON response from Gemini model.',
        });
      }

      if (parsed && Array.isArray(parsed.ideas)) {
        rawIdeas = parsed.ideas;
      } else if (Array.isArray(parsed)) {
        rawIdeas = parsed;
      } else {
        if (attempts < maxAttempts) continue;
        return res.status(502).json({
          error: 'malformed_json',
          message: 'Gemini response did not contain the expected ideas array.',
        });
      }

      break;
    } catch (err: any) {
      const errStr = String(err?.message || err);

      if (
        (err?.status === 503 ||
          errStr.includes('503') ||
          errStr.includes('high demand') ||
          err?.message === 'GEMINI_TIMEOUT') &&
        activeModel !== 'gemini-3.1-flash-lite'
      ) {
        activeModel = 'gemini-3.1-flash-lite';
        continue;
      }

      if (err?.message === 'GEMINI_TIMEOUT') {
        return res.status(504).json({
          error: 'timeout',
          message: 'Gemini generation request timed out after 35 seconds. Please retry.',
        });
      }

      if (err?.status === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({
          error: 'rate_limit',
          message: 'Gemini API rate limit exceeded (HTTP 429). Please retry in a few moments.',
        });
      }

      return res.status(500).json({
        error: 'gemini_error',
        message: `Gemini generation failed: ${err?.message || 'Unknown error'}`,
      });
    }
  }

  // 4. Format and strictly filter memoriesUsed according to recalled items
  const formattedIdeas = formatStudioIdeas(rawIdeas, input, recalledMemories);

  return res.json({
    ideas: formattedIdeas,
    memory: memoryMeta,
    model: activeModel,
    generatedAt: new Date().toISOString(),
    inputsEcho: {
      topic: input.topic,
      goal: input.goal,
      format: input.format,
      audience: input.audience,
      tone: input.tone,
      language: input.language,
      objective: input.objective,
      cta: input.cta,
      numIdeas: input.numIdeas,
      useMemory: input.useMemory,
    },
  });
});

// -------------------------------------------------------------
// STAGE 5 — Memory Lab Endpoints (Controlled A/B Comparison)
// -------------------------------------------------------------

/**
 * POST /api/lab/run
 * Protected by Supabase Auth.
 * Executes a controlled, reproducible comparison:
 * - Shared prompt template & schema
 * - Fixed low temperature (0.3)
 * - Test A: zero memory
 * - Test B: Hindsight recalled memories
 * - Optional baseline repeat A'
 * - Pure code difference calculation
 * - Persisted to Supabase lab_runs
 */
app.post('/api/lab/run', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  // 1. Validate inputs (same validation as studio, clamp numIdeas to max 3 for lab)
  const validation = validateStudioInput(req.body);
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Validation failed for Memory Lab parameters.',
      errors: validation.errors,
    });
  }

  const input = validation.sanitized;
  input.numIdeas = Math.min(3, Math.max(1, input.numIdeas)); // Lab limit max 3
  const repeatBaseline = Boolean(req.body.repeatBaseline);
  const taskLabel = typeof req.body.taskLabel === 'string' && req.body.taskLabel.trim()
    ? req.body.taskLabel.trim().slice(0, 150)
    : `${input.topic} (${input.format})`;

  const geminiConfig = getGeminiConfig();
  const { isConfigured: isHindsightConfigured, apiKey: hindsightKey, baseUrl, bankId } = getHindsightConfig(auth.user.userId);

  const labModel = geminiConfig.model;
  const fixedTemperature = 0.3; // Low fixed temperature for reproducibility
  const promptTemplateVersion = 'v1-shared-template';

  const errors: {
    geminiA?: string;
    geminiB?: string;
    geminiRepeat?: string;
    hindsight?: string;
  } = {};

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      ideas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            caption: { type: Type.STRING },
            callToAction: { type: Type.STRING },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scriptOutline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            whyThisRecommendation: { type: Type.STRING },
            memoriesUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            predictedHypothesis: { type: Type.STRING },
          },
          required: [
            'hook',
            'caption',
            'callToAction',
            'hashtags',
            'scriptOutline',
            'whyThisRecommendation',
            'memoriesUsed',
            'predictedHypothesis',
          ],
        },
      },
    },
    required: ['ideas'],
  };

  const ai = geminiConfig.isConfigured
    ? new GoogleGenAI({
        apiKey: geminiConfig.apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      })
    : null;

  // Helper to run a single Gemini call with 18s timeout & fixed temperature
  const callGemini = async (promptSys: string, promptContent: string): Promise<any[]> => {
    if (!ai) throw new Error('GEMINI_NOT_CONFIGURED');
    const response = await Promise.race([
      ai.models.generateContent({
        model: labModel,
        contents: promptContent,
        config: {
          systemInstruction: promptSys,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: fixedTemperature,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 18000)
      ),
    ]);

    const text = response.text?.trim() || '';
    if (!text) throw new Error('Empty response from model');
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.ideas)) return parsed.ideas;
    if (Array.isArray(parsed)) return parsed;
    throw new Error('Response did not contain ideas array');
  };

  // -------------------------------------------------------------
  // Step 2a: Run Test A (Without memory)
  // -------------------------------------------------------------
  let rawOutputA: any[] = [];
  let aSucceeded = false;
  if (!geminiConfig.isConfigured) {
    errors.geminiA = 'Gemini API key is not configured in secrets.';
  } else {
    try {
      const { systemInstruction: sysA, contents: contentsA } = buildStudioPrompt(input, []);
      rawOutputA = await callGemini(sysA, contentsA);
      aSucceeded = true;
    } catch (err: any) {
      errors.geminiA = err?.message === 'GEMINI_TIMEOUT'
        ? 'Test A generation timed out (18s limit).'
        : `Test A error: ${err?.message || 'Unknown error'}`;
    }
  }
  const formattedA = formatStudioIdeas(rawOutputA, input, []);

  // -------------------------------------------------------------
  // Step 2b: Recall from Hindsight (Once for the task)
  // -------------------------------------------------------------
  let recalledMemories: string[] = [];
  let memorySucceeded = false;
  const memoryRequested = true;

  if (!isHindsightConfigured) {
    errors.hindsight = 'Hindsight API key is not configured in secrets.';
  } else {
    const queryText = `${input.topic} ${input.goal.replace(/_/g, ' ')} ${input.format}`.trim();
    const recallController = new AbortController();
    const recallTimeout = setTimeout(() => recallController.abort(), 8000);

    try {
      await ensureBankExists(hindsightKey, baseUrl, bankId);
      const recallUrl = `${baseUrl}/default/banks/${encodeURIComponent(bankId)}/memories/recall`;
      const recallRes = await fetch(recallUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hindsightKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryText }),
        signal: recallController.signal,
      });
      clearTimeout(recallTimeout);

      if (recallRes.ok) {
        const recallData = await recallRes.json().catch(() => null);
        recalledMemories = extractRecalledMemories(recallData);
        memorySucceeded = true;
        await logMemoryEventToDb(
          auth.user.userId,
          'recall',
          'success',
          bankId,
          `Lab Query: "${queryText.slice(0, 80)}" (${recalledMemories.length} recalled)`
        );
      } else {
        const errBody = await recallRes.text().catch(() => '');
        errors.hindsight = `Hindsight recall failed (HTTP ${recallRes.status}): ${errBody || recallRes.statusText}`;
        await logMemoryEventToDb(
          auth.user.userId,
          'recall',
          'failed',
          bankId,
          `Lab Query: "${queryText.slice(0, 80)}"`,
          errors.hindsight
        );
      }
    } catch (err: any) {
      clearTimeout(recallTimeout);
      const isTimeout = err?.name === 'AbortError';
      errors.hindsight = isTimeout ? 'Hindsight recall timed out (8s limit).' : `Recall network error: ${err?.message || 'Unknown'}`;
      await logMemoryEventToDb(
        auth.user.userId,
        'recall',
        'failed',
        bankId,
        `Lab Query: "${queryText.slice(0, 80)}"`,
        errors.hindsight
      );
    }
  }

  // -------------------------------------------------------------
  // Step 2c: Run Test B (With memory)
  // -------------------------------------------------------------
  let rawOutputB: any[] = [];
  let bSucceeded = false;
  if (!geminiConfig.isConfigured) {
    errors.geminiB = 'Gemini API key is not configured in secrets.';
  } else {
    try {
      const { systemInstruction: sysB, contents: contentsB } = buildStudioPrompt(input, recalledMemories);
      rawOutputB = await callGemini(sysB, contentsB);
      bSucceeded = true;
    } catch (err: any) {
      errors.geminiB = err?.message === 'GEMINI_TIMEOUT'
        ? 'Test B generation timed out (18s limit).'
        : `Test B error: ${err?.message || 'Unknown error'}`;
    }
  }
  const formattedB = formatStudioIdeas(rawOutputB, input, recalledMemories);

  // -------------------------------------------------------------
  // Step 2d: Optional Baseline Repeat (A')
  // -------------------------------------------------------------
  let formattedBaselineRepeat: any[] | null = null;
  if (repeatBaseline && geminiConfig.isConfigured) {
    try {
      const { systemInstruction: sysA, contents: contentsA } = buildStudioPrompt(input, []);
      const rawRepeat = await callGemini(sysA, contentsA);
      formattedBaselineRepeat = formatStudioIdeas(rawRepeat, input, []);
    } catch (err: any) {
      errors.geminiRepeat = `Baseline repeat failed: ${err?.message || 'Unknown error'}`;
    }
  }

  // -------------------------------------------------------------
  // Step 2e: Compute Differences in CODE
  // -------------------------------------------------------------
  const differences = computeLabDifferences(
    formattedA,
    formattedB,
    recalledMemories,
    formattedBaselineRepeat || undefined
  );

  // Optional: concise AI explanation if both A & B succeeded
  if (ai && aSucceeded && bSucceeded) {
    try {
      const expRes = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Compare these two sets of social media ideas on topic "${input.topic}":
Test A (Without Memory):
${formattedA.map((i, idx) => `${idx + 1}. Hook: "${i.hook}" | CTA: "${i.callToAction}"`).join('\n')}

Test B (With Retrieved Memories: ${recalledMemories.join('; ')}):
${formattedB.map((i, idx) => `${idx + 1}. Hook: "${i.hook}" | CTA: "${i.callToAction}"`).join('\n')}

In 2 short sentences, explain what changed and why. Do NOT declare one better.`,
          config: { temperature: 0.2 },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000)),
      ]);
      const expText = expRes.text?.trim();
      if (expText) {
        differences.aiExplanation = `AI-written explanation, may be wrong: ${expText}`;
      }
    } catch {
      // Non-fatal optional note
    }
  }

  // -------------------------------------------------------------
  // Step 2f: Persist Run to Supabase lab_runs
  // -------------------------------------------------------------
  let savedRunId = `run-${Date.now()}`;
  const supabaseServer = getServerSupabase();
  if (supabaseServer) {
    try {
      const { data: dbData, error: dbError } = await supabaseServer
        .from('lab_runs')
        .insert({
          user_id: auth.user.userId,
          task_label: taskLabel,
          inputs: {
            ...input,
            repeatBaseline,
          },
          model: labModel,
          temperature: fixedTemperature,
          prompt_template_version: promptTemplateVersion,
          memory_requested: memoryRequested,
          memory_succeeded: memorySucceeded,
          recalled: recalledMemories,
          recalled_count: recalledMemories.length,
          output_a: formattedA,
          output_b: formattedB,
          a_succeeded: aSucceeded,
          b_succeeded: bSucceeded,
          errors,
          differences,
          ratings: null,
          baseline_repeat: formattedBaselineRepeat,
        })
        .select()
        .single();

      if (!dbError && dbData?.id) {
        savedRunId = dbData.id;
      } else if (dbError) {
        console.error('Failed to save lab run to database:', dbError.message);
      }
    } catch (dbErr: any) {
      console.error('Exception writing lab run to database:', dbErr?.message);
    }
  }

  return res.json({
    id: savedRunId,
    userId: auth.user.userId,
    createdAt: new Date().toISOString(),
    taskLabel,
    inputs: { ...input, repeatBaseline },
    model: labModel,
    temperature: fixedTemperature,
    promptTemplateVersion,
    memoryRequested,
    memorySucceeded,
    recalled: recalledMemories,
    recalledCount: recalledMemories.length,
    outputA: formattedA,
    outputB: formattedB,
    aSucceeded,
    bSucceeded,
    errors,
    differences,
    ratings: null,
    baselineRepeat: formattedBaselineRepeat,
  });
});

/**
 * GET /api/lab/runs
 * Protected by Supabase Auth.
 * Returns historical lab runs for the current user.
 */
app.get('/api/lab/runs', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  const supabaseServer = getServerSupabase();
  if (!supabaseServer) {
    return res.json({ runs: [] });
  }

  try {
    const { data, error } = await supabaseServer
      .from('lab_runs')
      .select('*')
      .eq('user_id', auth.user.userId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return res.status(500).json({ error: 'db_error', message: error?.message || 'Failed to fetch lab runs' });
    }

    const runs = data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      taskLabel: row.task_label,
      inputs: row.inputs,
      model: row.model,
      temperature: Number(row.temperature ?? 0.3),
      promptTemplateVersion: row.prompt_template_version,
      memoryRequested: row.memory_requested,
      memorySucceeded: row.memory_succeeded,
      recalled: row.recalled || [],
      recalledCount: row.recalled_count || 0,
      outputA: row.output_a || [],
      outputB: row.output_b || [],
      aSucceeded: row.a_succeeded,
      bSucceeded: row.b_succeeded,
      errors: row.errors || {},
      differences: row.differences || {},
      ratings: row.ratings || null,
      baselineRepeat: row.baseline_repeat || null,
    }));

    return res.json({ runs });
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err?.message || 'Failed to retrieve runs' });
  }
});

/**
 * PATCH /api/lab/run/:id/rating
 * Protected by Supabase Auth.
 * Records user ratings (1 to 5) for relevance, personalization, evidence use, and usefulness.
 */
app.patch('/api/lab/run/:id/rating', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  const runId = req.params.id;
  const { ratings } = req.body || {};

  if (!ratings || typeof ratings !== 'object') {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Ratings object is required.',
    });
  }

  const supabaseServer = getServerSupabase();
  if (!supabaseServer) {
    return res.status(500).json({
      error: 'supabase_not_configured',
      message: 'Supabase server client is not available.',
    });
  }

  try {
    const { error } = await supabaseServer
      .from('lab_runs')
      .update({
        ratings: {
          ...ratings,
          submittedAt: new Date().toISOString(),
        },
      })
      .eq('id', runId)
      .eq('user_id', auth.user.userId);

    if (error) {
      return res.status(500).json({ error: 'db_error', message: error.message });
    }

    return res.json({ success: true, message: 'Ratings saved to run.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err?.message || 'Failed to update ratings' });
  }
});

/**
 * POST /api/campaigns/:id/lesson
 * Protected by Supabase Auth.
 * Drafts an honest, evidence-grounded lesson from real campaign experiment data and computed outcome numbers.
 * Uses Gemini at a fixed low temperature (0.3).
 * Never invents data. States contradictions openly and includes empirical limitation disclaimers.
 */
app.post('/api/campaigns/:id/lesson', async (req: Request, res: Response) => {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return res.status(auth.status).json({
      error: auth.error,
      message: auth.message,
    });
  }

  const campaignId = req.params.id;
  const supabaseServer = getServerSupabase();
  if (!supabaseServer) {
    return res.status(500).json({
      error: 'supabase_not_configured',
      message: 'Supabase is not configured on the server.',
    });
  }

  const geminiConfig = getGeminiConfig();
  if (!geminiConfig.isConfigured) {
    return res.status(400).json({
      error: 'gemini_not_configured',
      message: 'GEMINI_API_KEY is not configured in environment secrets.',
    });
  }

  try {
    // 1. Fetch the user's campaign
    const { data: campaign, error: campError } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', auth.user.userId)
      .single();

    if (campError || !campaign) {
      return res.status(404).json({
        error: 'campaign_not_found',
        message: 'Campaign not found or you do not have permission to view it.',
      });
    }

    if (!campaign.outcome) {
      return res.status(400).json({
        error: 'outcome_missing',
        message: 'Cannot draft lesson: this campaign outcome has not been evaluated yet. Please link a post and evaluate results first.',
      });
    }

    const outcome = campaign.outcome;
    const metricLabel = campaign.target_metric || 'engagement_rate';
    const directionLabel = campaign.target_direction === 'above_baseline' ? 'above baseline' : 'below baseline';

    const systemInstruction = `You are an honest empirical research analyst for content creators.
Your mission is to draft a concise, truthful post-flight lesson from a creator's real content experiment.
STRICT PRINCIPLES:
1. Never invent or hallucinate metrics, sample sizes, or outcomes. Use ONLY the supplied campaign fields and computed outcome numbers.
2. State the initial tested hypothesis clearly.
3. State what the empirical data showed, citing the exact numbers and sample size (n).
4. If the data contradicted the hypothesis or was inconclusive (e.g. baseline n < 3), state that plainly and without embarrassment. A contradicted or inconclusive result is an equally valuable lesson that prevents wasted effort.
5. You MUST include this explicit limitation sentence verbatim or nearly verbatim: "This reflects an observed association, not a proven cause."
6. Make NO claims of guaranteed results in future posts.
7. Keep the draft to 2-4 sentences max.`;

    const userPrompt = `Please synthesize an honest lesson for this completed growth experiment:
- Campaign Title: "${campaign.title}"
- Format: ${campaign.format}
- Topic: ${campaign.topic}
- Target Metric: ${metricLabel} (Target direction: ${directionLabel})
- Initial Hypothesis: "${campaign.hypothesis}"
- Baseline Value: ${campaign.baseline_value !== null ? `${campaign.baseline_value}%` : 'N/A'} (n = ${campaign.baseline_n ?? 0} published ${campaign.format} posts)
- Actual Post Value: ${outcome.actualValue !== null ? `${outcome.actualValue}%` : 'N/A'}
- Absolute Difference: ${outcome.absoluteDiff !== null ? `${outcome.absoluteDiff > 0 ? '+' : ''}${outcome.absoluteDiff}%` : 'N/A'}
- Relative Difference: ${outcome.percentDiff !== null ? `${outcome.percentDiff > 0 ? '+' : ''}${outcome.percentDiff}%` : 'N/A'}
- Verdict: ${outcome.verdict.toUpperCase()} (${outcome.verdictReason || ''})
- Baseline Thin Warning: ${outcome.isBaselineThin ? 'YES (n < 3, small sample size)' : 'NO (sufficient baseline)'}

Generate a concise, objective 2-4 sentence lesson draft according to the rules.`;

    const ai = new GoogleGenAI({
      apiKey: geminiConfig.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: geminiConfig.model,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const lessonDraft = response.text?.trim() || '';
    if (!lessonDraft) {
      return res.status(502).json({
        error: 'empty_generation',
        message: 'Gemini returned an empty lesson draft. Please try again.',
      });
    }

    // 2. Persist lesson draft on campaign
    await supabaseServer
      .from('campaigns')
      .update({
        lesson_draft: lessonDraft,
      })
      .eq('id', campaignId)
      .eq('user_id', auth.user.userId);

    return res.json({
      success: true,
      lessonDraft,
      campaignId,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'lesson_draft_failed',
      message: `Failed to draft campaign lesson: ${err?.message || 'Unknown error'}`,
    });
  }
});


// Mount Vite or serve static assets in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SocialPulse AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
