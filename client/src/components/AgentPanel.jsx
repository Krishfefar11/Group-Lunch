/**
 * AgentPanel.jsx — A3: Streaming agent reasoning UI
 *
 * Shows the agent's thought process live:
 *   🧠 Thinking text
 *   🔧 Tool calls (with icon per tool)
 *   📊 Tool results (collapsed by default)
 *   ✅ Final answer (highlighted)
 *
 * Props:
 *   sessionId  (string)
 *   onDone     (fn) called with final text when agent finishes
 *   autoRun    (bool) start immediately on mount
 *   task       (string) optional task override
 */

import { useEffect, useRef } from 'react';
import useAgentStream from '../hooks/useAgentStream';
import { colors, font, radius, shadow, transition } from '../design-system/tokens';

const TOOL_META = {
  get_session_status:           { icon: '📋', label: 'Session status' },
  get_member_preferences:       { icon: '👥', label: 'Member preferences' },
  analyze_conflict:             { icon: '⚠️', label: 'Conflict analysis' },
  search_restaurants:           { icon: '🔍', label: 'Searching restaurants' },
  rank_restaurants:             { icon: '📊', label: 'Ranking with TOPSIS' },
  generate_conflict_resolution: { icon: '🤝', label: 'Generating compromise' },
};

const AGENT_META = {
  orchestrator: { icon: '🎯', color: colors.gold.bright },
  preference:   { icon: '📝', color: colors.blue.text },
  conflict:     { icon: '⚠️', color: '#f59e0b' },
  search:       { icon: '🔍', color: colors.text.secondary },
  ranking:      { icon: '📊', color: colors.green.text },
};

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4, height: 4, borderRadius: '50%',
            background: colors.text.muted,
            animation: `agentDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

function StepRow({ step }) {
  switch (step.type) {
    case 'agent': {
      const meta = AGENT_META[step.agent] || { icon: '🤖', color: colors.text.secondary };
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
          <span style={{ fontSize: 14 }}>{meta.icon}</span>
          <span style={{ fontSize: font.size.xs, color: meta.color, fontWeight: font.weight.medium }}>
            {step.status}
          </span>
        </div>
      );
    }
    case 'thinking': {
      if (!step.text?.trim()) return null;
      return (
        <div style={{ padding: '5px 0 5px 22px', borderLeft: `2px solid ${colors.border.subtle}`, marginLeft: 6 }}>
          <p style={{ fontSize: font.size.xs, color: colors.text.muted, margin: 0, lineHeight: 1.55 }}>
            {step.text}
          </p>
        </div>
      );
    }
    case 'tool_call': {
      const meta = TOOL_META[step.tool] || { icon: '🔧', label: step.tool };
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', background: colors.bg.raised,
          borderRadius: radius.md, border: `1px solid ${colors.border.subtle}`,
        }}>
          <span style={{ fontSize: 14 }}>{meta.icon}</span>
          <span style={{ fontSize: font.size.xs, color: colors.text.secondary, fontWeight: font.weight.medium }}>
            {meta.label}
          </span>
          <ThinkingDots />
        </div>
      );
    }
    case 'tool_result': {
      const meta = TOOL_META[step.tool] || { icon: '✓', label: step.tool };
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 10px',
        }}>
          <span style={{ fontSize: 11, color: colors.green.text }}>✓</span>
          <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>
            {meta.label} done
          </span>
        </div>
      );
    }
    case 'tool_error': {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <span style={{ fontSize: 11 }}>⚠️</span>
          <span style={{ fontSize: font.size.xs, color: colors.red?.text || '#ef4444' }}>
            {step.tool}: {step.error}
          </span>
        </div>
      );
    }
    case 'done': {
      return (
        <div style={{
          marginTop: 12,
          padding: '14px 16px',
          background: `linear-gradient(135deg, rgba(240,165,0,0.08), rgba(240,165,0,0.03))`,
          border: `1px solid rgba(240,165,0,0.2)`,
          borderRadius: radius.lg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: font.size.xs, color: colors.gold.bright, fontWeight: font.weight.bold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Agent Recommendation
            </span>
          </div>
          <p style={{ fontSize: font.size.sm, color: colors.text.primary, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {step.text}
          </p>
        </div>
      );
    }
    case 'error': {
      return (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: radius.md, border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: font.size.xs, color: '#ef4444', margin: 0 }}>❌ {step.text}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export default function AgentPanel({ sessionId, onDone, autoRun = false, task }) {
  const { steps, status, run, reset } = useAgentStream(sessionId);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom as steps arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [steps.length]);

  // Call onDone when agent finishes
  useEffect(() => {
    if (status === 'done' && onDone) {
      const doneStep = steps.findLast?.((s) => s.type === 'done') || steps.filter((s) => s.type === 'done').pop();
      if (doneStep) onDone(doneStep.text);
    }
  }, [status, steps, onDone]);

  useEffect(() => {
    if (autoRun) run(task);
  }, []);

  const isRunning = status === 'running';
  const isDone    = status === 'done';
  const isError   = status === 'error';

  return (
    <div style={s.panel}>
      <style>{INJECTED_CSS}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={s.title}>AI Agent</span>
          {isRunning && (
            <span style={s.livePill}>
              <span style={s.liveDot} />
              Live
            </span>
          )}
          {isDone && <span style={s.donePill}>Done</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isRunning && (
            <button
              style={s.runBtn}
              onClick={() => run(task)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              {isDone || isError ? '↺ Re-run' : '▶ Run Agent'}
            </button>
          )}
          {isRunning && (
            <button style={s.stopBtn} onClick={reset}>■ Stop</button>
          )}
        </div>
      </div>

      {/* ── Steps feed ──────────────────────────────────────────────────── */}
      <div style={s.feed}>
        {steps.length === 0 && status === 'idle' && (
          <div style={s.emptyState}>
            <p style={{ margin: 0, fontSize: font.size.sm, color: colors.text.muted }}>
              The agent will reason step-by-step:<br />
              check preferences → detect conflicts → search restaurants → rank and pick.
            </p>
          </div>
        )}

        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}

        {isRunning && steps.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <span style={{ fontSize: 13 }}>🎯</span>
            <span style={{ fontSize: font.size.xs, color: colors.text.muted }}>
              Starting agent<ThinkingDots />
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const INJECTED_CSS = `
  @keyframes agentDot {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

const s = {
  panel: {
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius['2xl'],
    overflow:     'hidden',
    display:      'flex',
    flexDirection: 'column',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 18px',
    borderBottom:   `1px solid ${colors.border.subtle}`,
    background:     colors.bg.raised,
  },
  title: {
    fontSize:   font.size.sm,
    fontWeight: font.weight.bold,
    color:      colors.text.primary,
    letterSpacing: '-0.01em',
  },
  livePill: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          5,
    padding:      '2px 8px',
    borderRadius: radius.full,
    background:   'rgba(239,68,68,0.12)',
    border:       '1px solid rgba(239,68,68,0.2)',
    fontSize:     font.size.xs,
    color:        '#ef4444',
    fontWeight:   font.weight.semibold,
  },
  liveDot: {
    width:      5,
    height:     5,
    borderRadius: '50%',
    background: '#ef4444',
    animation:  'livePulse 1.2s ease-in-out infinite',
  },
  donePill: {
    padding:      '2px 8px',
    borderRadius: radius.full,
    background:   colors.green.dim,
    border:       `1px solid rgba(16,185,129,0.2)`,
    fontSize:     font.size.xs,
    color:        colors.green.text,
    fontWeight:   font.weight.semibold,
  },
  runBtn: {
    background:   colors.gold.base,
    color:        colors.text.inverse,
    border:       'none',
    borderRadius: radius.md,
    fontFamily:   font.family,
    fontSize:     font.size.xs,
    fontWeight:   font.weight.bold,
    cursor:       'pointer',
    padding:      '6px 14px',
    transition:   transition.fast,
    letterSpacing: '0.02em',
  },
  stopBtn: {
    background:   'transparent',
    color:        '#ef4444',
    border:       '1px solid rgba(239,68,68,0.3)',
    borderRadius: radius.md,
    fontFamily:   font.family,
    fontSize:     font.size.xs,
    fontWeight:   font.weight.semibold,
    cursor:       'pointer',
    padding:      '6px 14px',
    transition:   transition.fast,
  },
  feed: {
    padding:   '14px 18px',
    display:   'flex',
    flexDirection: 'column',
    gap:       2,
    maxHeight: 420,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  emptyState: {
    padding:      '20px',
    textAlign:    'center',
    background:   colors.bg.raised,
    borderRadius: radius.lg,
    border:       `1px dashed ${colors.border.default}`,
  },
};
