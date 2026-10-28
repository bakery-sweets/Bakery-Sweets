const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Realtime Server (WebSocket) chạy riêng, dùng chung cho Web và App
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws';

export default BASE_URL;
