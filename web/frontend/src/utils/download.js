import { apiErrorMessage } from "./format";

// Lưu Blob (Excel / PDF do backend sinh ra) thành file tải về trên trình duyệt
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Request tải file dùng responseType "blob" nên lỗi JSON {"detail": ...} cũng về dạng Blob, phải đọc lại
export const downloadErrorMessage = async (err, fallback = "Không tải được file, vui lòng thử lại.") => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const detail = JSON.parse(await data.text())?.detail;
      if (typeof detail === "string") return detail;
    } catch {
      // Không phải JSON: dùng thông báo mặc định
    }
    return fallback;
  }
  return apiErrorMessage(err, fallback);
};
