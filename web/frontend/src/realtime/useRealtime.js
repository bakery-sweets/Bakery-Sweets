import { useEffect, useRef, useState } from "react";
import realtime from "./realtimeClient";

// Mở (hoặc chuyển) kết nối realtime theo phiên đăng nhập hiện tại; token rỗng = khách vãng lai
export function useRealtimeConnection(token) {
  useEffect(() => {
    realtime.connect(token);
  }, [token]);
}

// Gọi handler mỗi khi nhận một trong các sự kiện; luôn dùng handler mới nhất nên không cần useCallback
export function useRealtimeEvent(events, handler) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  const key = [].concat(events).join(",");
  useEffect(() => {
    const offs = key.split(",").map((event) => realtime.on(event, (data) => handlerRef.current(data)));
    return () => offs.forEach((off) => off());
  }, [key]);
}

// Bộ đếm tăng sau mỗi sự kiện: đưa vào dependency của useEffect tải dữ liệu để trang tự làm mới
export function useRealtimeVersion(events) {
  const [version, setVersion] = useState(0);
  useRealtimeEvent(events, () => setVersion((v) => v + 1));
  return version;
}
