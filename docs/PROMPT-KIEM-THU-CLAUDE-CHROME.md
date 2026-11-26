# Prompt kiểm thử bằng Claude in Chrome

Dùng cho extension **Claude in Chrome**: agent chỉ thao tác được trong trình duyệt (không chạy lệnh, không đọc file, không xem DB).
Bản đầy đủ mọi kịch bản (gồm cả phần cần lệnh / DB): `docs/KICH-BAN-KIEM-THU.md`.

## Trước khi giao việc (người chạy tự làm)
1. Bật Docker Desktop, trong thư mục dự án chạy:
   ```
   docker compose up -d --build
   docker compose restart web_backend mobile_backend realtime
   ```
   DB cũ thì chạy thêm migration 004 → 006 trong `database/migrations/` (lệnh ở đầu mỗi file).
2. Mở Chrome, kiểm tra http://localhost:3000 vào được.
3. Dán **toàn bộ khối prompt bên dưới** vào Claude in Chrome.

---

```
Bạn là tester. Hãy kiểm thử end-to-end hệ thống tiệm bánh "The Sweets" đang chạy ở máy local, CHỈ thao tác trong trình duyệt Chrome. Làm lần lượt từ Phần 0 đến Phần 8, không bỏ phần nào.

THÔNG TIN
- Web khách hàng: http://localhost:3000
- Web quản trị: http://localhost:3000/admin/login — admin: admin@thesweets.com / 123 (hoặc SĐT 0900000000)
- Swagger API Mobile: http://localhost:8000/docs
- Khách có sẵn (có thể chưa tồn tại): 0912345678 / 123 và 0987654321 / 123. Nếu đăng nhập báo sai / chưa có, TỰ ĐĂNG KÝ tài khoản mới ở http://localhost:3000/register (SĐT 10 số bắt đầu 09xxx chưa dùng, email bất kỳ chưa dùng, mật khẩu 123456) và dùng tài khoản đó thay thế. Gọi là KHACH_1 và KHACH_2.
- Giờ lấy bánh hợp lệ: 07:30–21:30, không ở quá khứ, tối đa 30 ngày tới.
- Khách vãng lai: dùng SĐT chưa có tài khoản, bắt đầu từ 0911000111; nếu hệ thống báo SĐT đã có tài khoản thì tăng số (0911000112, …).

QUY TẮC
- Tự ghi lại trong "SỔ DỮ LIỆU" mọi thứ bạn tạo ra để dùng ở các bước sau: các mã giảm giá, mã đơn, tên bánh, tài khoản, SĐT.
- Mỗi bước: so với "Mong đợi". Khác → chụp màn hình, ghi LỖI kèm mô tả, rồi đi tiếp bước sau (không dừng cả bài).
- Bước ghi "(chỉ ghi nhận)" là lỗi đã biết: ghi lại kết quả thực tế, không tính là bài test hỏng.
- Không xóa / sửa dữ liệu có sẵn của tiệm; chỉ thao tác trên dữ liệu bạn tự tạo. Không đổi mật khẩu tài khoản admin.
- Khi cần 2 phiên đăng nhập khác nhau cùng lúc (admin + khách) dùng 2 tab; khi cần 2 khách khác nhau dùng thêm cửa sổ ẩn danh.

════ PHẦN 0 — Chuẩn bị tài khoản
0.1 Đăng nhập admin ở tab A. Kiểm tra KHACH_1, KHACH_2 đăng nhập được ở http://localhost:3000/login (tab B), không được thì tự đăng ký như hướng dẫn. Ghi vào sổ.
0.2 Đăng ký: mật khẩu xác nhận không khớp → "Mật khẩu xác nhận không khớp!"; không tick điều khoản → bị chặn; SĐT "abc" → "Số điện thoại phải gồm đúng 10 chữ số…"; mật khẩu "1" → "Mật khẩu phải có ít nhất 6 ký tự".

════ PHẦN 1 — Admin: trang "Voucher & Khuyến Mãi" (tab A)
1.1 Menu trái có ĐÚNG 1 mục "Voucher & Khuyến Mãi"; KHÔNG còn mục riêng "Mã Dùng 1 Lần" hay "Khuyến Mãi Sản Phẩm / Ưu Đãi Sản Phẩm".
1.2 Trang có 3 tab: "Voucher Chương Trình", "Mã Dùng 1 Lần", "Khuyến Mãi Sản Phẩm". Bấm tab → URL đổi (?tab=single-use, ?tab=products); F5 vẫn đúng tab. Gõ URL /admin/single-use-vouchers và /admin/product-promotions → tự chuyển đúng tab.
1.3 Tab "Voucher Chương Trình" → "Tạo Voucher": mã TESTVC01 (nếu đã tồn tại dùng TESTVC02…), tên "Test voucher", bắt đầu hôm nay 00:00, kết thúc +30 ngày, 1 lần/khách, tổng lượt trống, 2 mức giảm: đơn từ 100000 giảm 10% tối đa 20000; đơn từ 300000 giảm 15% → tạo thành công, "Đang chạy". Tạo lại cùng mã → báo trùng. Ngày kết thúc trước bắt đầu → bị chặn. 2 mức trùng "đơn tối thiểu" → bị chặn. Ghi mã vào sổ (VC).
1.4 Tab "Mã Dùng 1 Lần" → "Sinh Mã Mới": 6 mã, giảm %, 10%, giảm tối đa 30000, đơn tối thiểu 100000, hạn mặc định, tên đợt "Test đợt 1" → hiện 6 mã, mỗi mã ĐÚNG 8 ký tự, chỉ chữ in hoa + số, KHÔNG chứa 0, O, 1, I, L, không trùng. "Sao Chép Tất Cả", "Tải CSV" hoạt động. Ghi vào sổ MA1..MA6.
1.5 Sinh 2 mã "Giảm số tiền cố định" 30000, đơn tối thiểu 150000, tên đợt "Test đợt 2" → ô "Giảm tối đa" không còn. Ghi MB1, MB2.
1.6 Sinh mã với số lượng 0, 501, giảm 120%, hạn ở quá khứ → đều bị chặn.
1.7 Bảng mã: 8 mã mới "Chưa dùng"; tìm "Test đợt 1" ra đúng 6 mã; các tab lọc có đếm số.
1.8 Tab "Khuyến Mãi Sản Phẩm" → "Thêm Khuyến Mãi": chọn 1 bánh có ≥ 2 size (BANH_A), chọn 1 size KHÔNG phải size rẻ nhất (SIZE_A), giảm 15%, kết thúc "Ngày mai", ghi chú "Mẻ bánh sắp hết hạn". Mong đợi: form KHÔNG có lựa chọn loại "Sắp hết hạn / Ưu đãi thường"; ô ghi chú có chữ "(khách không thấy)"; "Giá khách sẽ thấy" hiện giá gốc gạch + giá giảm 15%. Lưu.
1.9 Thêm khuyến mãi: bánh khác (BANH_B), "Mọi size", 10%, kết thúc "2 ngày". Lưu.
1.10 Bảng khuyến mãi: 2 dòng "Đang áp dụng", cột mức giảm -15% / -10%, giá gốc → giá giảm từng size, có "còn N giờ". Thử giảm 95% → bị chặn. Ghi BANH_A, SIZE_A, BANH_B vào sổ.
1.11 "Tài Khoản & Quyền" → tạo nhân viên: "Nhân Viên Test", SĐT 0933000111 (trùng thì đổi), email nvtest<số>@thesweets.com, mật khẩu 123456, vai trò nhân viên → thành công. Ghi NHAN_VIEN. Thử đổi vai trò / khóa chính tài khoản admin đang đăng nhập → bị chặn.

════ PHẦN 2 — Khách: hiển thị khuyến mãi (tab B, ĐÃ ĐĂNG XUẤT)
2.1 Trang chủ có mục "Khuyến mãi hôm nay / Bánh ngon giá tốt" chứa BANH_A, BANH_B.
2.2 Thẻ BANH_A: nhãn ở góc DƯỚI TRÁI ảnh ghi "Khuyến mãi -15% size <tên size rút gọn, VD M>"; giá trên thẻ là giá SIZE_A sau giảm, có giá gốc gạch ngang và tên size. Thẻ BANH_B: "Khuyến mãi -10% mọi size".
2.3 Ở MỌI nơi khách thấy (thẻ, chi tiết, giỏ, thanh toán, hóa đơn) KHÔNG có chữ "sắp hết hạn", "hạn dùng", "Dùng tốt nhất trước", icon đồng hồ cát, và không thấy ghi chú nội bộ của admin. Thấy → LỖI.
2.4 Chi tiết BANH_A: chọn SIZE_A → giá giảm, giá gốc gạch, "Khuyến mãi -15%", "Khuyến mãi đến HH:mm dd/MM" (dấu "/", không phải "-"); chọn size khác → giá thường nhưng có dòng "Khuyến mãi -15%: Size …"; nút SIZE_A có "-15%".
2.5 Thực đơn /products: lọc danh mục, tìm kiếm (Enter), phân trang hoạt động; tìm chuỗi vô nghĩa → "Không tìm thấy món bánh nào!". Sắp xếp "Giá thấp → cao" trong danh mục có BANH_A: thứ tự tăng dần ĐÚNG theo giá đang hiện trên thẻ.
2.6 Cuối trang chi tiết bánh cùng danh mục với BANH_A (khối bánh liên quan / gợi ý): thẻ BANH_A (nếu có) hiện giá giảm + giá gốc gạch + dòng "Khuyến mãi -15% size …".

════ PHẦN 3 — Khách vãng lai: giỏ, thanh toán, nhớ mã, hóa đơn (tab B, chưa đăng nhập)
3.1 Thêm BANH_A (SIZE_A) x1 và BANH_B x1 (tổng ≥ 150.000đ, thiếu thì tăng số lượng). Giỏ: món khuyến mãi có "Khuyến mãi -X%" + giá gốc gạch. F5 → giỏ còn.
3.2 Bấm "Thanh toán" trong giỏ → vào thẳng /pay (KHÔNG sang trang đăng nhập); có "Họ tên của bạn", "Số điện thoại của bạn", dòng "Bạn đang đặt bánh không cần tài khoản".
3.3 Ở trang chi tiết bánh bấm "Mua ngay" khi chưa đăng nhập → món được thêm vào giỏ và vào thẳng /pay (KHÔNG sang /login).
3.4 /pay: bỏ trống họ tên → bị chặn; SĐT "12345" → "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0"; giờ lấy 23:00 → báo ngoài giờ mở cửa; ghi chú "aaaaaa" → bị chặn.
3.5 Nhập SĐT của KHACH_1 + họ tên, giờ hợp lệ, đặt → hộp "Số điện thoại đã có tài khoản" có nút "Đăng nhập". Bấm "Để sau".
3.6 "Chọn Voucher" → "Hoặc nhập mã riêng" nhập MA1 viết thường → áp dụng, giảm đúng 10% tối đa 30.000đ. F5 → mã vẫn được áp. Sang Thực đơn rồi quay lại /pay → vẫn còn.
3.7 Đóng tab, mở tab mới vào http://localhost:3000/pay → mã KHÔNG còn (nhớ tạm chỉ trong tab). Áp lại MA1.
3.8 SĐT khách vãng lai mới, họ tên "Khách Test", giờ hợp lệ, COD → "Xác nhận đặt bánh" → cửa sổ thành công có mã đơn, "Hãy lưu lại mã đơn…", nút "Tải hóa đơn (PDF)" và "Đăng ký để theo dõi đơn"; giỏ trống. Ghi DON_1 và SĐT_VL.
3.9 Bấm "Tải hóa đơn (PDF)" → file hoa-don-<mã>.pdf tải về (xem chrome://downloads), mở được, có dòng "Khuyến mãi · giá gốc …" cho món khuyến mãi và dòng giảm giá voucher có MA1.
3.10 Thêm bánh, đặt đơn mới dùng lại MA1 → "Mã 'MA1' đã được sử dụng".
3.11 Đặt thêm 2 đơn (không mã) cùng SĐT_VL → đơn thứ 4 bị chặn "…đang có 3 đơn chờ xác nhận…". Ghi DON_2, DON_3.
3.12 "Người khác nhận dùm": bỏ trống tên / SĐT người nhận → bị chặn.

════ PHẦN 4 — Khách đã đăng nhập & ví mã (tab B)
4.1 Đăng nhập KHACH_1. Thêm bánh (tổng ≥ 150.000đ) → /pay: thông tin "Tài khoản hiện tại" hiện sẵn.
4.2 Nhập MA2 → thông báo có "Mã đã được lưu vào tài khoản". Mở lại "Chọn Voucher" → mục "Mã đã lưu của bạn" có MA2. Nhập thêm MA3 → ví có 2 mã. Bấm "Xóa" ở MA3 → mất khỏi ví.
4.3 F5 /pay → MA2 tự được áp. Đặt đơn (chọn "Chuyển khoản") bằng MA2 → thành công; "Tải hóa đơn (PDF)" trong cửa sổ thành công tải được. Ghi DON_4. Mở lại "Chọn Voucher" (thêm bánh mới) → MA2 KHÔNG còn trong ví.
4.4 Nhập MA4 (để vào ví) nhưng KHÔNG đặt. Đặt 1 đơn COD bằng MA5 → ghi DON_5.
4.5 Trang "Hóa đơn" (/receipt): thấy DON_4, DON_5; chi tiết có giá gốc gạch ngang cho món khuyến mãi và "Giảm giá voucher (mã)"; tải PDF được. Đơn "Chờ xác nhận" có nút "Hủy đơn"; đơn đã chuyển sang bước sau không có nút này.
4.5b Đặt thêm 1 đơn nhỏ (không mã) → ở /receipt bấm "Hủy đơn" → hỏi lại → "Không hủy" thì không đổi; "Hủy đơn" → trạng thái thành "Đã hủy" ngay. Ghi DON_7.
4.6 Voucher chương trình VC: giỏ ~150.000đ → chọn VC trong danh sách → giảm 10% (≤ 20.000đ). Sau đó xóa bớt món cho giỏ < 100.000đ → ở /pay banner chuyển màu vàng "Mã VC chưa áp dụng được: cần mua thêm …₫", trong "Chọn Voucher" VC KHÔNG còn "✓ Đang dùng" mà hiện "Chưa đủ ĐK"; bấm "Xác nhận đặt bánh" → bị chặn với thông báo mua thêm hoặc bỏ chọn mã.
4.7 Đăng xuất → giỏ trên máy trống; đăng nhập lại → giỏ tài khoản còn.
4.8 Ở cửa sổ ẩn danh đăng nhập KHACH_2 → "Chọn Voucher" không có MA4 trong "Mã đã lưu" (ví riêng từng khách).

════ PHẦN 5 — Admin: đơn hàng, tại quầy, kho (tab A)
5.1 "Voucher & Khuyến Mãi" → "Mã Dùng 1 Lần": MA1, MA2, MA5 "Đã dùng" kèm mã đơn, tên khách, thời gian; MA3, MA4, MA6 "Chưa dùng". Cột "Sử dụng" của MA1 phải là tên "Khách Test" đã nhập ở 3.8.
5.2 "Quản Lý Đơn Hàng": tìm DON_1 (thử có "#", thử tên không dấu) → chi tiết có giá gốc gạch cho món khuyến mãi và mã voucher.
5.3 DON_1: bấm nhãn trạng thái trong bảng → menu "Chuyển trạng thái" hiện ĐẦY ĐỦ (không bị khung bảng cắt; thử thu hẹp cửa sổ ~1100px), chỉ có bước kế tiếp hợp lệ. Chuyển "Đang chuẩn bị" → "Sẵn sàng". Mở khung chi tiết DON_1, bấm nút "Thu Tiền & Hoàn Tất" → PHẢI hiện hộp "Hoàn tất & Xác nhận thu tiền?"; bấm "Quay lại" → đơn vẫn "Sẵn sàng"; bấm lại và xác nhận → "Hoàn tất", "Đã thanh toán"; đơn Hoàn tất không đổi được nữa.
5.4 Hủy DON_5: nút xác nhận hủy bị khóa khi chưa nhập lý do; nhập lý do → hủy xong, lịch sử có "Hoàn lại mã giảm giá MA5". Tab "Mã Dùng 1 Lần": MA5 về "Chưa dùng". Ở tab B (KHACH_1, đã nhập MA5 lúc đăng nhập nên mã nằm trong ví) thêm bánh → "Chọn Voucher" → MA5 HIỆN LẠI trong "Mã đã lưu của bạn" và áp dụng lại được.
5.5 Tab "Mã Dùng 1 Lần": vô hiệu hóa MA6 → tab B nhập MA6 → "Mã 'MA6' đã bị vô hiệu hóa". Kích hoạt lại MA6.
5.6 "Xuất Hóa Đơn PDF" và nút in phiếu của 1 đơn hoạt động.
5.7 Tạo đơn tại quầy (nút tạo đơn ở Quản Lý Đơn Hàng): danh mục bánh hiện BANH_A/BANH_B giá giảm kèm giá gốc "-X%". "Bán tại quầy" → nhận ngay → "Khách vãng lai", thêm món (tổng ≥ 150.000đ), mã MB1 → giảm 30.000đ; nhập tiền khách đưa → hiện tiền thối; tạo đơn → "Hoàn tất", "Đã thanh toán"; MB1 thành "Đã dùng".
5.8 "Bán Online" (khách gọi điện): nút "Khách vãng lai" bị chặn; nhập SĐT của KHACH_1 → hiện "Đã có hồ sơ khách"; bắt buộc giờ hẹn; có bước đọc lại xác nhận → đơn vào "Đang chuẩn bị". Giỏ trống / SĐT 9 số / giờ hẹn 23:00 → không tạo được.
5.9 "Danh Mục Bánh": sửa tồn kho 1 bánh không khuyến mãi → trang khách (tab B) cập nhật.
5.10 "Phiếu Nhập Hàng": tạo phiếu "Lưu tạm" 1 bánh x5 → tồn chưa đổi; "Xác nhận nhập kho" → tồn +5; phiếu đã nhập không hủy được. 2 dòng trùng bánh+size → bị chặn.
5.11 Tab "Khuyến Mãi Sản Phẩm": "Tạm dừng" khuyến mãi BANH_B → trang khách: BANH_B về giá thường, mất nhãn. "Tiếp tục" → nhãn quay lại.

════ PHẦN 6 — Khách vãng lai đăng ký nhận lại tài khoản (tab B)
6.1 Đăng xuất. Đăng ký bằng đúng SĐT_VL, email mới, mật khẩu 123456 → thành công, thông báo nhắc số đơn đã đặt được chuyển vào tài khoản. Đăng nhập → "Hóa đơn" thấy DON_1, DON_2, DON_3 (DON_1 ở trạng thái Hoàn tất).

════ PHẦN 7 — Phân quyền, khóa tài khoản, realtime, báo cáo
7.1 Realtime: tab A ở "Quản Lý Đơn Hàng", tab B (KHACH_1) đặt 1 đơn → tab A hiện toast "Có đơn hàng mới" + đơn mới xuất hiện KHÔNG cần tải lại. Tab A chuyển đơn đó "Đang chuẩn bị" → tab B hiện thông báo; trang "Hóa đơn" tab B tự cập nhật. Ghi DON_6.
7.2 Khóa tài khoản: tab A "Tài Khoản & Quyền" khóa KHACH_2 lý do "Test khóa" → cửa sổ ẩn danh (KHACH_2 đang đăng nhập) tự đăng xuất, hiện "Tài khoản đã bị khóa" + lý do; đăng nhập lại → "Tài khoản của bạn đã bị khóa. Lý do: Test khóa". Mở khóa → đăng nhập được.
7.3 Nhân viên: đăng xuất admin, đăng nhập NHAN_VIEN ở /admin/login → menu chỉ có "Quản Lý Đơn Hàng"; gõ /admin, /admin/products, /admin/vouchers, /admin/users → bị đưa về /admin/orders; vẫn đổi trạng thái đơn và tạo đơn tại quầy được. Đăng xuất, đăng nhập lại admin.
7.4 "Tổng Quan": số liệu hiện, có đơn mới nhất. "Báo Cáo Doanh Thu": "Hôm nay" → gồm đơn Hoàn tất hôm nay (DON_1, đơn tại quầy 5.7), không gồm đơn hủy; Từ ngày > Đến ngày → báo lỗi; "Xuất Excel" tải được file.

════ PHẦN 8 — API Mobile qua Swagger (http://localhost:8000/docs)
8.1 POST /api/v1/auth/login body {"user_name":"<SĐT KHACH_1>","password":"<mật khẩu>"} → lấy access_token; bấm "Authorize", dán token. Sai mật khẩu → 401.
8.2 GET /api/v1/products → chỉ bánh đang bán; bánh khuyến mãi có original_price, discount_percentage, promo_end_date; JSON KHÔNG có "promo_type". Thử status=All → vẫn chỉ bánh đang bán.
8.3 POST /api/v1/cart {"product_id":..,"size_id":..,"quantity":1} (bánh còn hàng) → GET /api/v1/cart thấy món; web (tab B, KHACH_1) giỏ cũng có món đó.
8.4 POST /api/v1/orders: items quantity 0, rồi -5 → 400 "Số lượng mỗi món phải từ 1 trở lên"; recipient_phone "12345" → 400; payment_method "Bitcoin" → 400; notes 201 ký tự → 400.
8.5 POST /api/v1/orders hợp lệ {"recipient_name":"Nguyễn Văn An","recipient_phone":"<SĐT KHACH_1>","payment_method":"COD","items":[{"product_id":..,"size_id":..,"quantity":1}]} → 200, order_code cùng dạng đơn web: "DH" + 6 ký tự chữ/số in hoa (VD DH3EA86D); tab A hiện "Có đơn hàng mới · đặt từ App". Ghi order_id và tồn kho bánh đó (GET /api/v1/products/{id}).
8.6 PUT /api/v1/orders/{order_id}/status bằng token khách → 403. Login admin {"user_name":"0900000000","password":"123"}, Authorize lại:
     new_status=Completed khi đơn đang Pending → 400 "Không thể chuyển đơn hàng từ 'Pending' sang 'Completed'";
     new_status=Cancelled không note → 400 "Vui lòng nhập lý do hủy đơn hàng";
     Cancelled + note "Test" → 200 và tồn kho bánh tăng lại đúng 1;
     new_status=Pending trên đơn đã hủy → 400.
8.7 Token admin: GET /api/v1/products?status=All → có cả bánh ẩn / ngừng bán (nếu có).

════ BÁO CÁO CUỐI
1. Bảng: mã bước | Đạt / Lỗi / Chỉ ghi nhận | mô tả (kèm screenshot hoặc mã HTTP + nội dung phản hồi khi lỗi).
2. Danh sách LỖI sắp theo mức độ nghiêm trọng (chặn chức năng > sai dữ liệu / tiền > giao diện).
3. Mọi chỗ còn lộ lý do khuyến mãi cho khách.
4. SỔ DỮ LIỆU: tài khoản đã tạo, mã giảm giá, mã đơn, phiếu nhập, khuyến mãi — để chủ dự án quyết định giữ hay xóa.
```
