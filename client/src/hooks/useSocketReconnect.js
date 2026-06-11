import { useEffect, useRef, useState } from 'react';
import socket from '../socket/socket';

/**
 * Monitors the shared socket connection state and automatically re-joins the
 * session room whenever the socket reconnects (e.g. after a mobile network
 * switch or a brief internet drop).
 *
 * @param {string}   sessionId   – The session room to rejoin on reconnect.
 * @param {function} onReconnect – Called right after rejoining; use to re-fetch
 *                                  any stale data. Captured via ref so a new
 *                                  function reference each render won't cause
 *                                  the effect to re-run.
 *
 * @returns {{ online: boolean }} – `false` while disconnected (use to show
 *                                   an offline banner to the user).
 */
export default function useSocketReconnect(sessionId, onReconnect) {
  const [online, setOnline] = useState(socket.connected);

  // Keep a stable ref to the latest callback so we never need it as a dep.
  const cbRef = useRef(onReconnect);
  useEffect(() => { cbRef.current = onReconnect; });

  useEffect(() => {
    const handleConnect = () => setOnline(true);

    const handleDisconnect = (reason) => {
      // "io client disconnect" means we called socket.disconnect() intentionally.
      // Don't show the offline banner in that case.
      if (reason !== 'io client disconnect') setOnline(false);
    };

    const handleReconnect = () => {
      setOnline(true);
      // Re-join the session room — the server forgets room membership on disconnect.
      socket.emit('join_session', sessionId);
      // Re-fetch whatever data this page cares about.
      cbRef.current?.();
    };

    socket.on('connect',    handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect',  handleReconnect);

    return () => {
      socket.off('connect',    handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect',  handleReconnect);
    };
  }, [sessionId]); // re-register only if sessionId changes

  return { online };
}
