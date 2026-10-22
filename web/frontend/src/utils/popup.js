import usePopupStore from "../store/popupStore";

export const popup = {
  /**
   * Hiển thị popup modal xác nhận (Confirm)
   * Trả về Promise<boolean> (true nếu người dùng ấn Đồng ý, false nếu Hủy)
   */
  confirm: (options) => {
    if (typeof options === "string") {
      return usePopupStore.getState().openConfirm({ message: options });
    }
    return usePopupStore.getState().openConfirm(options);
  },

  /**
   * Hiển thị popup modal thông báo (Alert)
   * Trả về Promise<void>
   */
  alert: (options) => {
    if (typeof options === "string") {
      return usePopupStore.getState().openAlert({ message: options });
    }
    return usePopupStore.getState().openAlert(options);
  },

  /**
   * Toast thông báo thành công (góc màn hình)
   */
  success: (message, options = {}) => {
    return usePopupStore.getState().addToast({
      type: "success",
      title: options.title || "Thành công",
      message: typeof message === "string" ? message : (message?.message || ""),
      duration: options.duration || 3200,
    });
  },

  /**
   * Toast thông báo lỗi
   */
  error: (message, options = {}) => {
    return usePopupStore.getState().addToast({
      type: "error",
      title: options.title || "Đã xảy ra lỗi",
      message: typeof message === "string" ? message : (message?.message || ""),
      duration: options.duration || 4500,
    });
  },

  /**
   * Toast thông báo cảnh báo
   */
  warning: (message, options = {}) => {
    return usePopupStore.getState().addToast({
      type: "warning",
      title: options.title || "Lưu ý",
      message: typeof message === "string" ? message : (message?.message || ""),
      duration: options.duration || 3800,
    });
  },

  /**
   * Toast thông báo thông tin
   */
  info: (message, options = {}) => {
    return usePopupStore.getState().addToast({
      type: "info",
      title: options.title || "Thông tin",
      message: typeof message === "string" ? message : (message?.message || ""),
      duration: options.duration || 3500,
    });
  },
};

export default popup;
