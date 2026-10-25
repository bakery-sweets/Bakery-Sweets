import { WS_URL } from "../api/config";

const RECONNECT_MS = 5000;
const PING_MS = 25000;

// Một kết nối WebSocket dùng chung tới trung tâm realtime (đặt ở Mobile Backend).
// Có token => nhận thêm sự kiện riêng của tài khoản (và của nhân viên nếu là admin/staff);
// không có token => chỉ nhận sự kiện công khai như tồn kho, sản phẩm thay đổi.
class RealtimeClient {
  socket = null;
  token = undefined;
  listeners = new Map();
  retryTimer = null;
  pingTimer = null;

  connect(token) {
    const next = token || null;
    if (this.socket && this.token === next) return;
    this.token = next;
    this.open();
  }

  open() {
    this.cleanup();
    const url = this.token ? `${WS_URL}?token=${encodeURIComponent(this.token)}` : WS_URL;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.pingTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
      }, PING_MS);
    };
    socket.onmessage = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.event) this.emit(data.event, data);
    };
    // Rớt mạng / server khởi động lại / bị đóng do khóa tài khoản: thử kết nối lại sau ít giây
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.cleanup();
      this.retryTimer = setTimeout(() => this.open(), RECONNECT_MS);
    };
  }

  cleanup() {
    clearInterval(this.pingTimer);
    clearTimeout(this.retryTimer);
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[Realtime] Lỗi xử lý sự kiện ${event}`, err);
      }
    });
  }
}

export const realtime = new RealtimeClient();
export default realtime;
