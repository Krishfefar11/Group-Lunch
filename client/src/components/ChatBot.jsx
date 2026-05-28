import { useState, useRef, useEffect } from 'react';
import { colors, font, radius, shadow, transition, zIndex } from '../design-system/tokens';
import { sendChatMessage } from '../api/api';

const QUICK_PREF = [
  { label: 'Veg only 🥦',   text: "I'm vegetarian, no meat" },
  { label: 'Under ₹200 💸', text: 'My budget is under ₹200' },
  { label: 'Jain food 🌿',  text: 'I need Jain-friendly food' },
  { label: 'No spicy 🙅',   text: "I can't eat spicy food" },
];

const QUICK_GENERAL = [
  { label: 'Best rated ⭐',   text: 'Which restaurant has the best rating?' },
  { label: 'Fastest ⚡',      text: 'Which restaurant delivers the fastest?' },
  { label: 'Cheapest 💸',     text: 'What are the most budget-friendly options?' },
  { label: 'Veg options 🥗',  text: 'Which restaurants have good vegetarian options?' },
];

export default function ChatBot() {
  const getSessionId = () =>
    window.location.pathname.match(/\/session\/([^/]+)/)?.[1] ?? null;

  const [sessionId, setSessionId] = useState(getSessionId);
  const [open,      setOpen]      = useState(false);
  const [hasNew,    setHasNew]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [input,     setInput]     = useState('');
  const [messages,  setMessages]  = useState([
    { role: 'assistant', content: "Hi! Ask me anything — restaurant picks, veg options, budget tips, or just say your food preferences and I'll fill the form for you." },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Re-check sessionId on each route change
  useEffect(() => {
    const check = () => setSessionId(getSessionId());
    window.addEventListener('popstate', check);
    return () => window.removeEventListener('popstate', check);
  }, []);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 80);
      setHasNew(false);
    }
  }, [open, messages.length]);

  // Don't show outside a session
  if (!sessionId) return null;

  const isOnPrefPage = window.location.pathname.includes('/preferences');
  const quickReplies = isOnPrefPage ? QUICK_PREF : QUICK_GENERAL;

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setInput('');
    const next = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setLoading(true);

    try {
      const response = await sendChatMessage(sessionId, {
        message: trimmed,
        history: next.slice(1, -1).slice(-8), // last 8 turns, skip initial greeting
      });

      const { reply, action } = response.data;

      setMessages([...next, { role: 'assistant', content: reply }]);

      if (action?.type === 'FILL_PREFERENCES') {
        window.dispatchEvent(
          new CustomEvent('chatbot-fill-preferences', { detail: action })
        );
      }

      if (!open) setHasNew(true);
    } catch {
      setMessages([...next, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showQuickReplies = messages.length <= 2;

  return (
    <>
      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div style={s.panel} className="animate-scale-up">

          {/* Header */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.avatar}>✨</div>
              <div>
                <p style={s.headerName}>AI Assistant</p>
                <p style={s.headerSub}>Powered by LLaMA 3</p>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke={colors.text.secondary} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display:        'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation:      'fadeUp 0.28s ease forwards',
                }}
              >
                <div style={msg.role === 'user' ? s.userBubble : s.botBubble}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ ...s.botBubble, gap: 5, padding: '10px 14px' }}>
                  {[0, 0.18, 0.36].map((delay, i) => (
                    <span key={i} style={{ ...s.dot, animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply chips */}
          {showQuickReplies && (
            <div style={s.quickRow}>
              {quickReplies.map((q) => (
                <button
                  key={q.label}
                  style={s.quickChip}
                  onClick={() => send(q.text)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.gold.muted; e.currentTarget.style.color = colors.text.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.color = colors.text.muted; }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={s.inputRow}>
            <input
              ref={inputRef}
              style={s.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything or describe your diet…"
              disabled={loading}
              onFocus={(e) => { e.target.style.borderColor = colors.border.focus; }}
              onBlur={(e)  => { e.target.style.borderColor = colors.border.default; }}
            />
            <button
              style={{ ...s.sendBtn, opacity: !input.trim() || loading ? 0.38 : 1 }}
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M13.5 7.5L1.5 1.5l2.25 6-2.25 6 12-6z" fill={colors.text.inverse}/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ───────────────────────────────────────────────────────────────── */}
      <button
        style={s.fab}
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke={colors.text.inverse} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <span style={{ fontSize: 22, lineHeight: 1 }}>✨</span>
        )}
        {hasNew && !open && <span style={s.badge} />}
      </button>
    </>
  );
}

const s = {
  panel: {
    position:      'fixed',
    bottom:        88,
    right:         22,
    width:         340,
    maxHeight:     500,
    display:       'flex',
    flexDirection: 'column',
    background:    colors.bg.raised,
    border:        `1px solid ${colors.border.default}`,
    borderRadius:  radius['2xl'],
    boxShadow:     `${shadow.xl}, 0 0 0 1px rgba(240,165,0,0.06)`,
    zIndex:        zIndex.modal,
    overflow:      'hidden',
  },
  header: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '13px 14px',
    borderBottom:    `1px solid ${colors.border.subtle}`,
    background:      colors.bg.overlay,
    flexShrink:      0,
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  },
  avatar: {
    width:           34,
    height:          34,
    borderRadius:    radius.md,
    background:      colors.gold.dim,
    border:          `1px solid rgba(240,165,0,0.2)`,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontSize:        17,
    flexShrink:      0,
  },
  headerName: {
    fontSize:   font.size.sm,
    fontWeight: font.weight.semibold,
    color:      colors.text.primary,
    margin:     0,
    lineHeight: 1.3,
  },
  headerSub: {
    fontSize: font.size['2xs'],
    color:    colors.text.muted,
    margin:   0,
  },
  closeBtn: {
    width:          26,
    height:         26,
    borderRadius:   radius.sm,
    background:     colors.bg.surface,
    border:         `1px solid ${colors.border.subtle}`,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     transition.fast,
  },
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '12px 12px 6px',
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
    minHeight:     0,
  },
  userBubble: {
    maxWidth:     '80%',
    padding:      '8px 13px',
    borderRadius: `${radius.lg} ${radius.lg} ${radius.xs} ${radius.lg}`,
    background:   colors.gold.base,
    color:        colors.text.inverse,
    fontSize:     font.size.sm,
    fontWeight:   font.weight.medium,
    lineHeight:   1.5,
    wordBreak:    'break-word',
  },
  botBubble: {
    maxWidth:     '88%',
    padding:      '8px 13px',
    borderRadius: `${radius.lg} ${radius.lg} ${radius.lg} ${radius.xs}`,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.subtle}`,
    color:        colors.text.primary,
    fontSize:     font.size.sm,
    lineHeight:   1.55,
    wordBreak:    'break-word',
    display:      'flex',
    gap:          3,
    alignItems:   'center',
    flexWrap:     'wrap',
  },
  dot: {
    display:         'inline-block',
    width:           6,
    height:          6,
    borderRadius:    '50%',
    background:      colors.text.muted,
    animation:       'dotBounce 1.2s ease infinite',
    flexShrink:      0,
  },
  quickRow: {
    display:    'flex',
    flexWrap:   'wrap',
    gap:        5,
    padding:    '0 12px 10px',
    flexShrink: 0,
  },
  quickChip: {
    padding:      '4px 10px',
    borderRadius: radius.full,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    color:        colors.text.muted,
    fontSize:     font.size.xs,
    fontWeight:   font.weight.medium,
    cursor:       'pointer',
    fontFamily:   font.family,
    transition:   transition.fast,
    whiteSpace:   'nowrap',
  },
  inputRow: {
    display:    'flex',
    gap:        8,
    padding:    '10px 12px',
    borderTop:  `1px solid ${colors.border.subtle}`,
    background: colors.bg.overlay,
    flexShrink: 0,
    alignItems: 'center',
  },
  input: {
    flex:         1,
    background:   colors.bg.surface,
    border:       `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color:        colors.text.primary,
    fontFamily:   font.family,
    fontSize:     font.size.sm,
    padding:      '9px 12px',
    outline:      'none',
    transition:   transition.base,
    minWidth:     0,
  },
  sendBtn: {
    width:          34,
    height:         34,
    borderRadius:   radius.md,
    background:     colors.gold.base,
    border:         'none',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     transition.fast,
  },
  fab: {
    position:        'fixed',
    bottom:          22,
    right:           22,
    width:           52,
    height:          52,
    borderRadius:    radius.full,
    background:      `linear-gradient(135deg, ${colors.gold.base} 0%, ${colors.gold.bright} 100%)`,
    border:          'none',
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    boxShadow:       `0 4px 24px rgba(240,165,0,0.5), ${shadow.lg}`,
    zIndex:          zIndex.modal,
    transition:      transition.base,
  },
  badge: {
    position:     'absolute',
    top:          9,
    right:        9,
    width:        9,
    height:       9,
    borderRadius: '50%',
    background:   colors.red.base,
    border:       `2px solid ${colors.bg.base}`,
  },
};
