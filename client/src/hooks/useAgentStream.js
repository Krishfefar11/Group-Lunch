/**
 * useAgentStream.js — A3: React hook for consuming the agent SSE stream
 *
 * Usage:
 *   const { steps, status, run, reset } = useAgentStream(sessionId);
 *   run();   // kicks off the agent
 *
 * Steps array shape:
 *   { type: 'thinking' | 'tool_call' | 'tool_result' | 'agent' | 'done' | 'error', ...payload, id }
 */

import { useState, useRef, useCallback } from 'react';

export default function useAgentStream(sessionId) {
  const [steps,  setSteps]  = useState([]);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const abortRef = useRef(null);
  let stepId = useRef(0);

  const addStep = useCallback((step) => {
    setSteps((prev) => [...prev, { ...step, id: stepId.current++ }]);
  }, []);

  const run = useCallback(async (task) => {
    // Cancel any running stream
    if (abortRef.current) abortRef.current.abort();

    setSteps([]);
    setStatus('running');
    stepId.current = 0;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/agent`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ task }),
        signal:  controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (raw === '[DONE]') { setStatus('done'); return; }
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);
            if (event.type === 'done')  setStatus('done');
            if (event.type === 'error') setStatus('error');
            // Don't add keepalive pings (no data field)
            addStep(event);
          } catch { /* malformed event — skip */ }
        }
      }

      setStatus('done');
    } catch (err) {
      if (err.name !== 'AbortError') {
        addStep({ type: 'error', text: err.message });
        setStatus('error');
      }
    }
  }, [sessionId, addStep]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setSteps([]);
    setStatus('idle');
  }, []);

  return { steps, status, run, reset };
}
