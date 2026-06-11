/**
 * reactLoop.js — ReAct (Reason + Act) agent loop
 *
 * Pattern:  Think → Tool call → Observe result → Think → ... → Final answer
 *
 * The loop runs up to MAX_ITERATIONS turns.  Each turn either:
 *   (a) calls one or more tools  → results appended to context, loop continues
 *   (b) produces a final answer  → loop ends, result returned
 *
 * Streaming: every thinking token and every tool event is emitted via onStep()
 * so the frontend can render a live "agent thinking" UI panel.
 *
 * A6 note: this is the orchestrator's execution engine.  The orchestrator
 * (orchestrator.js) composes the system prompt that directs the agent to
 * invoke the right specialised sub-agents in order.
 */

const Groq = require('groq-sdk');
const { TOOLS } = require('./tools/definitions');
const { executeTool } = require('./tools/executor');
const log = require('../utils/logger');

const MAX_ITERATIONS = 10;

/**
 * @param {object}   opts
 * @param {string}   opts.sessionId   — session to work on
 * @param {string}   opts.systemPrompt — orchestrator-built system prompt
 * @param {string}   opts.task        — human-readable task description
 * @param {Function} opts.onStep      — callback(type, payload) for SSE streaming
 * @returns {Promise<{result: string, iterations: number}>}
 */
async function runReActLoop({ sessionId, systemPrompt, task, onStep }) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: `Session ID: ${sessionId}\nTask: ${task}` },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    log.debug({ sessionId, iteration: iterations }, 'Agent loop iteration');

    // ── LLM call (non-streaming for tool-call rounds, streaming for final) ──
    // We stream only the FINAL answer turn (when finish_reason === 'stop').
    // Tool-call turns are collected synchronously so arguments arrive complete.
    let completion;
    try {
      completion = await client.chat.completions.create({
        model:        'llama-3.3-70b-versatile',
        messages,
        tools:        TOOLS,
        tool_choice:  'auto',
        temperature:  0.25,
        max_tokens:   1200,
      });
    } catch (err) {
      onStep('error', { text: `LLM call failed: ${err.message}` });
      throw err;
    }

    const choice      = completion.choices[0];
    const message     = choice.message;
    const finishReason = choice.finish_reason;

    // Add assistant turn to history
    messages.push(message);

    // ── Case A: assistant wants to call tools ─────────────────────────────
    if (finishReason === 'tool_calls' && message.tool_calls?.length) {
      // Emit any thinking text that came with this turn
      if (message.content?.trim()) {
        onStep('thinking', { text: message.content.trim() });
      }

      for (const tc of message.tool_calls) {
        const toolName = tc.function.name;
        let toolArgs   = {};
        try {
          toolArgs = JSON.parse(tc.function.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        // Inject sessionId so every executor function gets it automatically
        const fullArgs = { sessionId, ...toolArgs };

        onStep('tool_call', { tool: toolName, args: toolArgs });

        let toolResult;
        try {
          toolResult = await executeTool(toolName, fullArgs);
          onStep('tool_result', { tool: toolName, result: toolResult });
        } catch (err) {
          toolResult = { error: err.message };
          onStep('tool_error', { tool: toolName, error: err.message });
        }

        messages.push({
          role:         'tool',
          tool_call_id: tc.id,
          content:      JSON.stringify(toolResult),
        });
      }

      continue; // Next iteration — let the LLM reason about the tool results
    }

    // ── Case B: final answer (no more tool calls) ─────────────────────────
    const finalText = message.content?.trim() || '';
    // Stream final answer token-by-token for the "thinking" animation
    // (We've already received the full text non-streaming; emit it in one shot)
    onStep('done', { text: finalText });
    return { result: finalText, iterations };
  }

  // Max iterations reached — emit whatever we have
  const lastContent = messages.filter((m) => m.role === 'assistant').pop()?.content || '';
  onStep('done', { text: lastContent || 'Reached maximum reasoning steps.' });
  return { result: lastContent, iterations };
}

module.exports = { runReActLoop };
