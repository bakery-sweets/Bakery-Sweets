import { create } from "zustand";

/**
 * Parses message strings if they contain newlines or parenthetical hints,
 * such as: 'Ngừng bán món bánh "X"?\n(Món sẽ chuyển sang trạng thái...)'
 */
function parseMessageContent(rawMessage, explicitSubtitle) {
  if (explicitSubtitle !== undefined) {
    return { message: rawMessage, subtitle: explicitSubtitle };
  }
  if (typeof rawMessage === "string" && rawMessage.includes("\n")) {
    const lines = rawMessage.split("\n").map((l) => l.trim()).filter(Boolean);
    const mainMsg = lines[0] || "";
    const remaining = lines.slice(1).join("\n");
    return {
      message: mainMsg,
      subtitle: remaining.replace(/^\(|\)$/g, "").trim(),
    };
  }
  return { message: rawMessage, subtitle: "" };
}

const usePopupStore = create((set, get) => ({
  // Dialog State (Alert & Confirm)
  dialog: {
    isOpen: false,
    mode: "confirm", // 'confirm' | 'alert'
    type: "danger",  // 'danger' | 'warning' | 'success' | 'info' | 'primary'
    title: "",
    message: "",
    subtitle: "",
    confirmText: "Xác nhận",
    cancelText: "Hủy bỏ",
    icon: null,
    resolve: null,
  },

  // Toasts (Non-blocking notification bubbles)
  toasts: [],

  // Open Confirm Dialog (Returns Promise<boolean>)
  openConfirm: (options = {}) => {
    const rawMsg = typeof options === "string" ? options : (options.message || options.text || "");
    const { message, subtitle } = parseMessageContent(rawMsg, options.subtitle);

    return new Promise((resolve) => {
      set({
        dialog: {
          isOpen: true,
          mode: "confirm",
          type: options.type || "danger",
          title: options.title || "Xác nhận hành động",
          message,
          subtitle,
          confirmText: options.confirmText || "Đồng ý",
          cancelText: options.cancelText || "Hủy bỏ",
          icon: options.icon || null,
          resolve,
        },
      });
    });
  },

  // Open Alert Dialog (Returns Promise<void>)
  openAlert: (options = {}) => {
    const rawMsg = typeof options === "string" ? options : (options.message || options.text || "");
    const { message, subtitle } = parseMessageContent(rawMsg, options.subtitle);

    return new Promise((resolve) => {
      set({
        dialog: {
          isOpen: true,
          mode: "alert",
          type: options.type || "info",
          title: options.title || "Thông báo",
          message,
          subtitle,
          confirmText: options.buttonText || options.confirmText || "Đã hiểu",
          cancelText: "",
          icon: options.icon || null,
          resolve,
        },
      });
    });
  },

  // Close Dialog and resolve promise
  closeDialog: (confirmed = false) => {
    const { dialog } = get();
    if (dialog.resolve) {
      dialog.resolve(dialog.mode === "confirm" ? confirmed : true);
    }
    set((state) => ({
      dialog: {
        ...state.dialog,
        isOpen: false,
        resolve: null,
      },
    }));
  },

  // Toast Management
  addToast: ({ type = "info", title = "", message = "", duration = 3500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, title, message, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export default usePopupStore;
