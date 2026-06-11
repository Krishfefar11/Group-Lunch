/**
 * agent.js — A2/A3: Server-Sent Events streaming endpoint for the ReAct agent
 *
 * POST /api/sessions/:sessionId/agent
 * Body: { task?: string }   (optional — orchestrator auto-determines if omitted)
 *
 * Response: text/event-stream
 * Each event: data: { type, ...payload }\n\n
 *
 * Event types (matches AgentStepSchema):
 *   thinking    → { text }       — agent is reasoning (stream token by token in future)
 *   tool_call   → { tool, args } — agent called a tool
 *   tool_result → { tool, result }
 *   tool_error  → { tool, error }
 *   agent       → { agent, status } — which sub-agent is active
 *   done        → { text }       — final answer
 *   error       → { text }       — something went wrong
 *
 * POST /api/sessions/:sessionId/extract-preferences
 * Body: { text: string }
 * Returns: { success, data: { cuisine, diet, budget, confidence } }
 */

const express  = require('express');
const router   = express.Router();
const { runReActLoop }    = require('../ai/reactLoop');
const { orchestrate }     = require('../ai/agents/orchestrator');
const { extractPreferences } = require('../ai/agents/preferenceAgent');
const { resolveConflict } = require('../ai/agents/conflictAgent');
const { Preference, Session } = require('../models/index');
const log = require('../utils/logger');

// ── POST /api/sessions/:sessionId/agent — streaming ReAct agent ────────────────
router.post('/:sessionId/agent', async (req, res) => {
  const { sessionId } = req.params;
  const { task }      = req.body;

  // ── Setup SSE ──────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');   // disable nginx response buffering
  res.flushHeaders();

  // Helper: write one SSE event
  const send = (type, payload = {}) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
      if (res.flush) res.flush();
    } catch { /* client disconnected */ }
  };

  // Keepalive ping every 15 s (prevent proxy/load balancer timeout)
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
  }, 15_000);

  try {
    // ── Orchestrator builds context + task ──────────────────────────────────
    send('agent', { agent: 'orchestrator', status: 'Building session context…' });
    const { systemPrompt, task: resolvedTask } = await orchestrate(sessionId, task);

    send('agent', { agent: 'orchestrator', status: `Task: ${resolvedTask}` });

    // ── ReAct loop ──────────────────────────────────────────────────────────
    const { iterations } = await runReActLoop({
      sessionId,
      systemPrompt,
      task: resolvedTask,
      onStep: send,
    });

    log.info({ sessionId, iterations }, 'Agent loop completed');
  } catch (err) {
    log.error({ err, sessionId }, 'Agent route error');
    send('error', { text: err.message || 'Agent failed unexpectedly.' });
  } finally {
    clearInterval(ping);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── POST /api/sessions/:sessionId/extract-preferences ─────────────────────────
// A4: Convert free-form text into a validated preference object
router.post('/:sessionId/extract-preferences', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const extracted = await extractPreferences(text.trim());

    res.json({
      success: true,
      data:    extracted,
    });
  } catch (err) {
    log.error({ err }, 'extract-preferences error');
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/sessions/:sessionId/resolve-conflict ────────────────────────────
// A7: LLM-powered conflict mediation for the organiser
router.post('/:sessionId/resolve-conflict', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const preferences = await Preference.findAll({ where: { sessionUuid: sessionId } });
    if (!preferences.length) {
      return res.status(400).json({ success: false, message: 'No preferences submitted yet.' });
    }

    const plain = preferences.map((p) => ({
      memberName: p.memberName,
      cuisine:    p.cuisine   || [],
      diet:       p.diet      || [],
      budget:     p.budget    || 'any',
    }));

    const resolution = await resolveConflict(plain);

    res.json({ success: true, data: resolution });
  } catch (err) {
    log.error({ err }, 'resolve-conflict error');
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
