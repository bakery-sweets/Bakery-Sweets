import { useEffect } from "react";
import usePopupStore from "../../store/popupStore";
import popup from "../../utils/popup";
import "./GlobalPopup.css";

// Crisp SVG Icons matching Haute Patisserie luxury theme
function IconRender({ type, customIcon }) {
  if (customIcon === "pause" || customIcon === "pause-circle") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="10" y1="15" x2="10" y2="9" />
        <line x1="14" y1="15" x2="14" y2="9" />
      </svg>
    );
  }

  if (customIcon === "play" || customIcon === "play-circle") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
      </svg>
    );
  }

  if (customIcon === "lock") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  if (customIcon === "unlock") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    );
  }

  if (type === "danger") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
      </svg>
    );
  }

  if (type === "success") {
    return (
      <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  // Default / info / primary
  return (
    <svg className="sweets-popup-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" />
    </svg>
  );
}

export default function GlobalPopup() {
  const { dialog, closeDialog, toasts, removeToast } = usePopupStore();

  // Safely hook window.alert to popup.alert to intercept any native alerts
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (msg) => {
      popup.alert(String(msg));
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  // Handle keyboard events (ESC to close, ENTER to confirm)
  useEffect(() => {
    if (!dialog.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        closeDialog(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog.isOpen, closeDialog]);

  return (
    <>
      {/* DIALOG POPUP MODAL */}
      {dialog.isOpen && (
        <div
          className="sweets-popup-overlay"
          onClick={() => closeDialog(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sweets-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="sweets-popup-close-btn"
              onClick={() => closeDialog(false)}
              aria-label="Đóng"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Icon Bubble */}
            <div className={`sweets-popup-icon-wrapper ${dialog.type}`}>
              <IconRender type={dialog.type} customIcon={dialog.icon} />
            </div>

            {/* Title */}
            {dialog.title && (
              <h3 className="sweets-popup-title">{dialog.title}</h3>
            )}

            {/* Message Body */}
            {dialog.message && (
              <p className="sweets-popup-message">{dialog.message}</p>
            )}

            {/* Subtitle / Note Callout */}
            {dialog.subtitle && (
              <div className="sweets-popup-subtitle-box">
                <svg className="sweets-popup-subtitle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" />
                </svg>
                <p className="sweets-popup-subtitle-text">{dialog.subtitle}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="sweets-popup-actions">
              {dialog.mode === "confirm" && (
                <button
                  type="button"
                  className="sweets-popup-btn sweets-popup-btn-cancel"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelText || "Hủy bỏ"}
                </button>
              )}

              <button
                type="button"
                className={`sweets-popup-btn sweets-popup-btn-confirm ${dialog.type}`}
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {dialog.confirmText || (dialog.mode === "confirm" ? "Đồng ý" : "Đã hiểu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div className="sweets-toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="sweets-toast-item">
              <div className={`sweets-toast-icon-wrap ${t.type}`}>
                {t.type === "success" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {t.type === "error" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                {t.type === "warning" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" />
                  </svg>
                )}
                {t.type === "info" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" />
                  </svg>
                )}
              </div>

              <div className="sweets-toast-content">
                {t.title && <div className="sweets-toast-title">{t.title}</div>}
                <div className="sweets-toast-msg">{t.message}</div>
              </div>

              <button
                type="button"
                className="sweets-toast-close"
                onClick={() => removeToast(t.id)}
                aria-label="Đóng thông báo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {t.duration > 0 && (
                <div
                  className="sweets-toast-progress"
                  style={{ animationDuration: `${t.duration}ms` }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
