import { io } from 'socket.io-client';

/**
 * Single shared socket instance for the whole app.
 *
 * Reconnection strategy (exponential backoff):
 *   1 s → 2 s → 4 s → 8 s (cap) → keeps retrying at 8 s
 *
 * Pages connect/disconnect manually so we only hold the socket open while the
 * user is on a live-data screen. The shared instance means all pages see the
 * same connection state and we never open duplicate sockets.
 */
const socket = io(process.env.REACT_APP_SERVER_URL || 'https://group-lunch.onrender.com', {
  autoConnect:           false, // pages call socket.connect() themselves
  reconnection:          true,
  reconnectionDelay:     1000,      // first retry after 1 s
  reconnectionDelayMax:  8000,      // backoff cap: 8 s
  reconnectionAttempts:  Infinity,  // never give up
  timeout:               20000,     // connection timeout: 20 s
  transports:            ['websocket', 'polling'], // websocket first; polling fallback
});

export default socket;
