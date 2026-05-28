import { io } from 'socket.io-client';

// Single shared socket instance for the whole app
const socket = io('http://localhost:8000', {
  autoConnect: false, // connect manually when needed
});

export default socket;
