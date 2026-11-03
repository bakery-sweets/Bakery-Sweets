import { useRef, useState } from "react";
import popup from "../../utils/popup";
import { saveBlob, downloadErrorMessage } from "../../utils/download";
import "./ExcelImport.css";

// Backend chỉ trả tối đa chừng này lỗi (app/services/excel_import.py: MAX_ERRORS)
const MAX_ERRORS = 200;

/**
 * Cặp nút "Tải file mẫu" + "Nhập từ Excel" dùng chung cho các chức năng nhập liệu hàng loạt.
 * downloadTemplate: () => Promise<Blob>; onFile: (file) => void được gọi khi người dùng chọn file .xlsx
 */
export function ExcelImportButtons({
  downloadTemplate,
  templateFilename,
  onFile,
  importLabel = "Nhập Từ Excel",
  busy = false,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      saveBlob(await downloadTemplate(), templateFilename);
    } catch (err) {
      popup.error(await downloadErrorMessage(err, "Không tải được file mẫu"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <button
        className="btn-pill-outline"
        type="button"
        onClick={handleDownload}
        disabled={disabled || downloading}
        title="Tải file Excel mẫu, đã điền sẵn danh sách bánh hiện có"
      >
        <ion-icon name={downloading ? "hourglass-outline" : "download-outline"}></ion-icon>
        <span>{downloading ? "Đang tải..." : "Tải File Mẫu"}</span>
      </button>
      <button
        className="btn-pill-outline"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        title="Chọn file Excel (.xlsx) đã điền theo mẫu"
      >
        <ion-icon name={busy ? "hourglass-outline" : "cloud-upload-outline"}></ion-icon>
        <span>{busy ? "Đang đọc file..." : importLabel}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Xóa giá trị để chọn lại cùng một file (sau khi sửa) vẫn kích hoạt onChange
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

// Bảng lỗi theo dòng / cột của file Excel
export function ExcelErrorTable({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="excel-errors">
      <div className="excel-errors-title">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <span>
          {errors.length >= MAX_ERRORS ? `Hơn ${MAX_ERRORS}` : errors.length} lỗi cần sửa trong file
        </span>
      </div>
      <div className="excel-table-scroll">
        <table className="excel-table">
          <thead>
            <tr>
              <th style={{ width: "64px" }}>Dòng</th>
              <th style={{ width: "150px" }}>Cột</th>
              <th>Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((e, i) => (
              <tr key={`${e.row}-${e.column}-${i}`}>
                <td className="excel-row-no">{e.row}</td>
                <td>{e.column || "—"}</td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
