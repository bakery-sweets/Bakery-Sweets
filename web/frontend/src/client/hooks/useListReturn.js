import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// "Quay lại danh sách": khi khách mở chi tiết bánh từ một trang có danh sách bánh (trang chủ, /products),
// lưu lại thẻ bánh vừa bấm + URL trang đó. Nút "Tiếp tục mua hàng" / Back sẽ đưa khách về đúng thẻ ấy.
const KEY = 'list_return_context';
const HIGHLIGHT_MS = 1500;

export function readListReturn() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveListReturn(context) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(context));
  } catch {
    // sessionStorage bị chặn (chế độ riêng tư...): chỉ mất tính năng cuộn lại
  }
}

function clearListReturn() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}

/**
 * Dùng ở trang danh sách.
 * - restoreCtx: ngữ cảnh cần khôi phục — chỉ có khi khách vừa quay lại đúng URL này bằng Back
 *   hoặc nút "Tiếp tục mua hàng"; vào bằng menu / F5 thì là null và trang mở như mới.
 * - saveReturn(anchorId, extra): gọi khi khách bấm mở chi tiết; extra là dữ liệu riêng của trang (bộ lọc, trang...).
 */
export function useListReturn() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentPath = location.pathname + location.search;

  const [restoreCtx] = useState(() => {
    const ctx = readListReturn();
    if (!ctx) return null;
    const isReturn = navigationType === 'POP' || location.state?.restoreScroll;
    return isReturn && ctx.path === currentPath ? ctx : null;
  });

  // Ngữ cảnh chỉ dùng một lần: xóa ngay để F5 hay lần vào sau không bị cuộn bất ngờ
  useEffect(() => {
    clearListReturn();
  }, []);

  const saveReturn = useCallback(
    (anchorId, extra) =>
      saveListReturn({ ...extra, anchorId, path: currentPath, scrollY: window.scrollY }),
    [currentPath]
  );

  return { restoreCtx, saveReturn };
}

/**
 * Khi ready = true (danh sách đã hiện trên DOM), cuộn mượt một lần tới giữa thẻ bánh trong restoreCtx
 * rồi nháy viền để khách nhận ra ngay. Trả về true khi vẫn đang chờ khôi phục.
 */
export function useScrollToReturnAnchor(restoreCtx, ready) {
  const [pending, setPending] = useState(Boolean(restoreCtx));

  useEffect(() => {
    if (!pending || !ready) return;
    // Đợi lưới bánh vẽ xong mới cuộn
    const timer = setTimeout(() => {
      setPending(false);
      const card = document.getElementById(restoreCtx.anchorId);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Nháy viền sau một nhịp để thẻ đã vào tầm mắt khi hiệu ứng chạy
        setTimeout(() => {
          card.classList.add('product-card-highlight');
          setTimeout(() => card.classList.remove('product-card-highlight'), HIGHLIGHT_MS);
        }, 300);
      } else if (restoreCtx.scrollY > 0) {
        // Bánh không còn trong danh sách (đã bị ẩn/xóa): về lại vị trí cuộn cũ
        window.scrollTo({ top: restoreCtx.scrollY, behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pending, ready, restoreCtx]);

  return pending;
}
