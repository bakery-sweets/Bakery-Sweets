# Kịch bản kiểm thử toàn hệ thống — The Sweets

Tài liệu dành cho người/agent chạy kiểm thử end-to-end: Web khách hàng → Web quản trị → API Mobile → Realtime.
Mỗi kịch bản có mã (VD `GST-03`), mức ưu tiên **[P1]** (chức năng cốt lõi, phải chạy) / **[P2]** (biên, lỗi nhập liệu) và **kết quả mong đợi**.

> ⚠️ **ĐÃ BIẾT LỆCH**: kịch bản ghi lại một chỗ code hiện tại chưa chặn / chưa làm đúng nghiệp vụ.
> Chạy để xác nhận hành vi hiện tại, ghi vào báo cáo mục "Lỗi / thiếu sót", **không tự sửa** khi chưa được yêu cầu.

---

## 0. Chuẩn bị

### 0.1 Môi trường
| Thành phần | Địa chỉ |
|---|---|
| Web khách hàng & quản trị (React) | http://localhost:3000 — quản trị: `/admin` |
| Web API | http://localhost:5000/api (`/api/client/*`, `/api/admin/*`), tài liệu `/docs` |
| Mobile API | http://localhost:8000/api/v1 — qua gateway: http://localhost:8080/api/v1 |
| Realtime WebSocket | ws://localhost:8001/ws?token=… (qua gateway: ws://localhost:8080/ws) |
| MariaDB | localhost:3308 (container `thesweets_db`) |

1. `docker compose up -d --build`, chờ các container chạy ổn, xem log `web_backend`, `mobile_backend`, `realtime`, `web_frontend` không có lỗi khởi động.
2. DB đã có dữ liệu cũ (volume Docker không chạy lại script khởi tạo) → chạy lần lượt các migration chưa áp dụng:
   ```
   docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/004_product_promotions_single_use_vouchers.sql
   docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/005_drop_product_promo_type.sql
   docker exec -i thesweets_db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db' < database/migrations/006_customer_saved_vouchers.sql
   ```
   Lỗi "đã tồn tại / không có cột" ở migration đã chạy trước đó thì bỏ qua.
   **Không** chạy `docker compose down -v` (xóa sạch dữ liệu) khi chưa hỏi chủ dự án.
3. Công cụ: Playwright (cài vào thư mục tạm, không cài vào project) cho giao diện; `curl`/Python `requests` cho API; `websocat` hoặc script Python `websockets` cho realtime.
   Mỗi bước giao diện: chụp screenshot, ghi lỗi console và request API lỗi (4xx/5xx ngoài dự kiến).

### 0.2 Tài khoản
| Vai trò | Đăng nhập | Mật khẩu |
|---|---|---|
| Admin (toàn quyền) | `0900000000` hoặc `admin@thesweets.com` (trang `/admin/login`) | `123` |
| Khách 1 | `0912345678` (trang `/login`) | `123` |
| Khách 2 | `0987654321` | `123` |
| Nhân viên (staff) | chưa có — tạo ở `USR-01` | tự đặt |
| SĐT mới cho khách vãng lai | dùng số không có thật, VD `0911000111`, `0911000222`… (mỗi lần chạy tăng dần) | — |

### 0.3 Dữ liệu mẫu hữu ích (chỉ có khi DB khởi tạo từ `data.sql` bản mới)
- Mã dùng 1 lần: `SWT7K2QA`, `SWT9M4XB` (giảm 10% tối đa 50.000đ, đơn từ 100.000đ), `GIFT5HNC` (giảm 30.000đ, đơn từ 150.000đ).
- Khuyến mãi sản phẩm: bánh #1 size S -15%, bánh #3 mọi size -10%, bánh #5 size M -10%.
- Không có thì tự tạo bằng trang quản trị (xem `SUV-01`, `PPR-01`).

### 0.4 Quy tắc chung cần nhớ
- Giờ mở cửa / lấy bánh: **07:30 – 21:30**, đặt trước tối đa **30 ngày**, không được ở quá khứ (cho lệch 5 phút).
- Ghi chú đơn: ≤ 200 ký tự, ≤ 50 chữ, không có chữ dài > 25 ký tự, không ký tự lặp ≥ 5 lần liên tiếp.
- SĐT hợp lệ: `^0\d{9}$`. SĐT `0000000000` là hồ sơ "Khách vãng lai" dùng chung tại quầy.
- Giá hiển thị cho khách = giá đã trừ khuyến mãi sản phẩm; voucher trừ tiếp trên tổng đó.

---

## 1. Tài khoản khách hàng (Web)

- **AUTH-01 [P1]** Đăng ký với SĐT mới, email mới, mật khẩu khớp, tick điều khoản → "Đăng ký tài khoản thành công. Vui lòng đăng nhập.", chuyển `/login`.
- **AUTH-02 [P2]** Đăng ký: mật khẩu xác nhận không khớp → "Mật khẩu xác nhận không khớp!"; không tick điều khoản → "Vui lòng đồng ý với các điều khoản và điều kiện.".
- **AUTH-03 [P2]** Đăng ký SĐT đã có tài khoản → "Số điện thoại đã được đăng ký"; email đã dùng → "Email này đã được sử dụng"; email đuôi `@guest.thesweets` → "Email không hợp lệ"; SĐT `0000000000` → "Số điện thoại không hợp lệ".
- **AUTH-04 [P1]** Nhận lại tài khoản ẩn: đặt hàng không đăng nhập bằng SĐT X (`GST-01`) → đăng ký bằng SĐT X → thông báo kèm "… N đơn hàng bạn đã đặt … đã có trong tài khoản", đăng nhập → trang Hóa đơn thấy các đơn đã đặt.
- **AUTH-05 [P2]** Đăng nhập bằng SĐT của tài khoản ẩn (chưa đăng ký) → gợi ý "Số điện thoại này đã có đơn đặt tại cửa hàng nhưng chưa có tài khoản. Vui lòng đăng ký…".
- **AUTH-06 [P1]** Đăng nhập đúng → về trang chủ (hoặc trang `from` nếu được chuyển từ trang thanh toán), giỏ tạm được đẩy lên tài khoản; sai mật khẩu → "Số điện thoại hoặc mật khẩu không chính xác".
- **AUTH-07 [P1]** Tài khoản bị khóa đăng nhập → "Tài khoản của bạn đã bị khóa. Lý do: …" (kèm lý do admin ghi, web & app). Đang đăng nhập mà admin khóa (`USR-05`) → web tự đăng xuất, về `/login`, hiện "Tài khoản đã bị khóa" kèm lý do.
- **AUTH-08 [P2]** Đăng xuất → xóa phiên & giỏ tạm trên máy (giỏ trên server vẫn còn khi đăng nhập lại).
- **AUTH-09 [P1]** Đăng ký (web & app) với SĐT sai định dạng (`abc`, `123`) → "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0"; mật khẩu < 6 ký tự → "Mật khẩu phải có ít nhất 6 ký tự"; họ hoặc tên trống → "Vui lòng nhập đầy đủ họ và tên". Form web báo ngay trước khi gửi.
- **AUTH-10 [P2] ⚠️** Checkbox "Ghi nhớ đăng nhập" không có tác dụng; link "Quên mật khẩu?" trỏ tới `#`.
- **AUTH-11 [P2] ⚠️** Đăng xuất không vô hiệu token: dùng lại token cũ gọi `GET /api/client/auth/me` vẫn thành công tới khi hết hạn (24h).
- **PROF-01 [P2]** `PUT /api/client/profile` đổi tên → web cập nhật ngay (sự kiện `profile_updated`); đổi email trùng người khác → "Email này đã được sử dụng bởi tài khoản khác".
- **PROF-02 [P2]** `POST /api/client/profile/change-password`: mật khẩu cũ sai → "Mật khẩu cũ không chính xác"; mới = cũ → "Mật khẩu mới phải khác mật khẩu cũ"; mới < 6 ký tự → 422. Đổi xong đăng nhập bằng mật khẩu mới được.

## 2. Sản phẩm & trang khách

- **PRD-01 [P1]** Trang chủ: banner tự chuyển; mục "Khuyến mãi hôm nay / Bánh ngon giá tốt" (bánh đang giảm), "Bánh được yêu thích nhất", "Món mới".
- **PRD-02 [P1]** Thực đơn `/products`: lọc danh mục (URL `?category=`), tìm kiếm khi Enter (URL `?search=`, không phân biệt hoa thường), khoảng giá (chọn lại preset để bỏ), sắp xếp giá/tên, 8 bánh/trang, "Đặt lại" xóa bộ lọc & URL. Không có kết quả → "Không tìm thấy món bánh nào!".
- **PRD-03 [P2]** Mở chi tiết từ thẻ ở trang 2 → bấm "Tiếp tục mua hàng"/Back → quay về đúng trang, cuộn tới thẻ & nháy sáng. Ctrl+click mở tab mới không ảnh hưởng.
- **PRD-04 [P1]** Chi tiết bánh: size đầu tiên còn hàng được chọn sẵn, size hết hàng bị khóa ("Hết hàng"), đổi size thì số lượng về 1, cảnh báo "Sắp hết hàng, chỉ còn N bánh" khi tồn < 10, không cho thêm vượt (tồn kho − số đã trong giỏ).
- **PRD-05 [P2]** Bánh Hidden / Discontinued không xuất hiện ở danh sách; mở `/product/{id}` → báo không tìm thấy.
- **PRD-06 [P2]** "Bánh liên quan" ưu tiên cùng danh mục, giá gần; nút thêm nhanh thêm size rẻ nhất còn hàng.
- **PRD-07 [P2] ⚠️** Bán chạy (`/best-sellers`) tính cả đơn đã hủy.
- **PRD-08 [P1]** Chưa đăng nhập bấm **"Mua ngay"** ở trang chi tiết → thêm vào giỏ và vào thẳng `/pay` (giống nút "Thanh toán" ở giỏ).
- **PRD-09 [P1]** Sắp xếp "Giá thấp → cao / cao → thấp" và lọc khoảng giá dùng **đúng giá đang hiện trên thẻ** (bánh chỉ giảm size M thì thẻ & sắp xếp cùng dùng giá size M sau giảm).
- **PRD-10 [P2]** Thẻ "Bánh liên quan" ở trang chi tiết hiện giá sau khuyến mãi, giá gốc gạch ngang và dòng "Khuyến mãi -X% size …"; nút thêm nhanh thêm đúng size đang hiện giá.

## 3. Giỏ hàng

- **CART-01 [P1]** Khách vãng lai thêm bánh → lưu trên trình duyệt; tải lại trang vẫn còn; thêm vượt tồn → "Số lượng bạn chọn đã vượt quá số bánh còn lại trong tiệm.".
- **CART-02 [P1]** Đăng nhập khi giỏ tạm có món → món được đẩy lên giỏ tài khoản (món đã ngừng bán / hết hàng bị bỏ qua, không làm hỏng đăng nhập).
- **CART-03 [P1]** Giỏ đã đăng nhập: tăng/giảm, xóa, "−" khóa ở 1, "+" khóa khi đạt tồn ("Đã đạt số bánh còn lại"); mở 2 tab → thao tác tab A, tab B tự cập nhật (`cart_updated`).
- **CART-04 [P2]** API `PUT /api/client/cart/items/{id}` với `quantity: 0` → xóa dòng; sửa dòng giỏ của khách khác → 404 "Món hàng không tồn tại trong giỏ".
- **CART-05 [P2]** Admin ngừng kinh doanh bánh đang nằm trong giỏ (`APRD-04`) → bánh biến mất khỏi giỏ mọi khách; khách vãng lai tải lại trang → bánh bị bỏ khỏi giỏ tạm.
- **CART-06 [P2]** Bánh đang khuyến mãi trong giỏ: hiện nhãn "Khuyến mãi -X%" và giá gốc gạch ngang.

## 4. Khuyến mãi sản phẩm (hiển thị cho khách)

- **PPR-01 [P1]** Admin tạo khuyến mãi -15% chỉ cho **size M** của 1 bánh có S/M/L → thẻ bánh hiện nhãn "**Khuyến mãi -15% size M**" ở góc dưới trái ảnh; giá trên thẻ là giá size M sau giảm, gạch giá gốc, ghi tên size; nút thêm nhanh thêm đúng size M.
- **PPR-02 [P1]** Khuyến mãi -10% **mọi size** → nhãn "Khuyến mãi -10% mọi size"; hai size khác mức (S -15%, M -10%) → "Khuyến mãi S -15% · M -10%"; bánh chỉ có 1 size → "Khuyến mãi -10%".
- **PPR-03 [P1]** Hai khuyến mãi chồng nhau cho cùng size (15% size S và 10% mọi size) → size S áp **15%** (lấy mức cao nhất), size khác 10%.
- **PPR-04 [P1]** Khách **không bao giờ** thấy lý do khuyến mãi: không có chữ "sắp hết hạn", "hạn dùng", icon đồng hồ cát ở thẻ, chi tiết, giỏ, thanh toán, hóa đơn PDF; JSON `/api/client/products`, `/api/client/cart`, `/api/v1/products` không có field `promo_type`.
- **PPR-05 [P1]** Chi tiết bánh: chọn size được giảm → giá giảm, giá gốc gạch, "Khuyến mãi -15%", "Khuyến mãi đến HH:mm dd/MM" (dấu "/", VD 23:59 27/11); chọn size không giảm → vẫn thấy dòng "Khuyến mãi -15%: Size M"; nút size hiện "-15%".
- **PPR-06 [P2]** Size được giảm hết hàng → nhãn khuyến mãi trên thẻ biến mất.
- **PPR-07 [P1]** Tạm dừng / xóa khuyến mãi, hoặc tới thời điểm kết thúc → giá về bình thường ở web, giỏ, POS, app; khuyến mãi có ngày bắt đầu ở tương lai → chưa áp dụng ("Sắp diễn ra").
- **PPR-08 [P1]** Đặt đơn có bánh đang giảm → `order_detail.price` = giá sau giảm, `original_price` = giá niêm yết; hóa đơn PDF ghi "Khuyến mãi · giá gốc …". Sau đó tắt khuyến mãi → đơn cũ giữ nguyên giá đã bán.

## 5. Thanh toán — khách đã đăng nhập

- **CHK-01 [P1]** Đặt đơn COD với giờ lấy hợp lệ → modal thành công (mã đơn, người nhận, giờ lấy, tổng tiền), giỏ trống, tồn kho giảm, admin nhận chuông + toast "Có đơn hàng mới".
- **CHK-02 [P1]** Chọn "Chuyển khoản" → đơn tạo với trạng thái thanh toán "Đã thanh toán" (mô phỏng).
- **CHK-03 [P1]** Giờ lấy: quá khứ, ngoài 07:30–21:30, quá 30 ngày → bị chặn với thông báo tương ứng; nút "+30 phút/+1 giờ/+2 giờ" rơi ngoài giờ mở cửa → cảnh báo tiệm đã đóng cửa.
- **CHK-04 [P2]** Ghi chú vi phạm (201 ký tự, 51 chữ, chữ 26 ký tự, "aaaaa") → bị chặn ở web và API.
- **CHK-05 [P1]** "Người khác nhận dùm": bắt buộc họ tên + SĐT người nhận; đơn lưu đúng người nhận.
- **CHK-06 [P1]** Tồn kho bị khách khác mua mất trong lúc đang thanh toán → báo "Sản phẩm đã hết" (không phải lỗi hệ thống), giỏ tải lại tồn mới.
- **CHK-07 [P2]** Nút "Tải hóa đơn (PDF)" trong modal thành công → tải `hoa-don-<mã>.pdf`, mở được.
- **CHK-08 [P2]** Dòng "Đã giảm nhờ khuyến mãi" ở bảng tính tiền bằng tổng (giá gốc − giá giảm) × số lượng.

## 6. Thanh toán — khách KHÔNG đăng nhập

- **GST-01 [P1]** Chưa đăng nhập, thêm bánh, bấm "Thanh toán" ở giỏ → vào thẳng `/pay` (không bị chuyển sang đăng nhập); có ô "Họ tên của bạn" và "Số điện thoại của bạn".
- **GST-02 [P1]** Đặt thành công bằng SĐT mới → modal có ghi chú lưu mã đơn, nút "Tải hóa đơn (PDF)" và "Đăng ký để theo dõi đơn"; giỏ tạm bị xóa; DB tạo user email `<SĐT>@guest.thesweets` + hồ sơ khách.
- **GST-03 [P1]** Bỏ trống họ tên / SĐT sai định dạng (người đặt hoặc người nhận dùm) → bị chặn; API trả 422 "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0".
- **GST-04 [P1]** Dùng SĐT của tài khoản thật (`0912345678`) → hộp "Số điện thoại đã có tài khoản" → bấm "Đăng nhập" → đăng nhập xong quay lại `/pay`, giỏ còn nguyên.
- **GST-05 [P1]** Đặt 3 đơn chờ xác nhận bằng cùng SĐT → đơn thứ 4 bị chặn "Số điện thoại này đang có 3 đơn chờ xác nhận…".
- **GST-06 [P2]** API `POST /api/client/orders/guest` khi đang gửi kèm token đăng nhập → 400 "Bạn đã đăng nhập…"; `items` rỗng → 422; SĐT `0000000000` → 400.
- **GST-07 [P1]** Tải hóa đơn khách vãng lai: `GET /api/client/orders/guest/{order_id}/invoice?token=<invoice_token>` → PDF; đổi `order_id` khác hoặc sửa token → 404 "Liên kết tải hóa đơn không hợp lệ hoặc đã hết hạn"; dùng `invoice_token` làm Bearer token gọi API khác → 401.
- **GST-08 [P2]** Khách vãng lai dùng mã dùng 1 lần / voucher chương trình được; giới hạn lượt/khách tính theo SĐT người đặt.

## 7. Voucher chương trình (bảng `promotions`)

- **VCH-01 [P1]** Admin tạo voucher có 2 mức (đơn từ 100k giảm 10% tối đa 20k; đơn từ 300k giảm 15%) → khách thấy trong danh sách "Chọn Voucher"; đơn 150k giảm 10% (≤20k); đơn 350k áp mức 15%.
- **VCH-02 [P1]** Đơn chưa đạt mức tối thiểu → voucher hiện "Cần mua thêm X₫"; chọn → cảnh báo "Chưa đủ điều kiện Voucher".
- **VCH-03 [P1]** Giới hạn mỗi khách = 1: dùng xong → mã biến mất khỏi danh sách của khách đó; đơn bị hủy → mã hiện lại. Tổng lượt dùng đạt giới hạn → biến mất với mọi khách.
- **VCH-04 [P2]** Voucher Bản nháp / Tạm dừng / chưa tới ngày / quá ngày → không hiện; nhập tay → báo đúng lý do.
- **VCH-05 [P2]** Tạo voucher trùng mã → "Mã voucher 'X' đã tồn tại"; trùng mã dùng 1 lần → "Mã 'X' đang là mã dùng 1 lần…"; ngày kết thúc ≤ bắt đầu → chặn; 2 mức trùng đơn tối thiểu → chặn.
- **VCH-06 [P1]** Thay đổi tổng tiền giỏ sau khi chọn voucher → số tiền giảm tự tính lại; xuống dưới mức tối thiểu → banner vàng "Mã X chưa áp dụng được: cần mua thêm Y₫", thẻ voucher không còn "✓ Đang dùng", bấm đặt hàng → bị chặn, yêu cầu mua thêm hoặc "Bỏ chọn" mã.

## 8. Mã dùng 1 lần (bảng `single_use_vouchers`)

- **SUV-01 [P1]** Admin → "Voucher & Khuyến Mãi" → tab "Mã Dùng 1 Lần" → "Sinh Mã Mới": 5 mã giảm 10% tối đa 30k, đơn từ 100k, hạn 30 ngày → hiện 5 mã **đúng 8 ký tự**, chữ in hoa + số, không chứa 0 O 1 I L, không trùng; "Sao Chép Tất Cả" và "Tải CSV" hoạt động; DB có 5 dòng `Unused`.
- **SUV-02 [P2]** Sinh mã: số lượng 0 hoặc 501, giảm 120%, hạn ở quá khứ → bị chặn; kiểu "giảm số tiền cố định" → không lưu "giảm tối đa".
- **SUV-03 [P1]** Khách nhập mã (chữ thường cũng được) ở "Hoặc nhập mã riêng" → áp dụng, hiện đúng số tiền giảm; đơn dưới mức tối thiểu → "Đơn hàng chưa đạt mức tối thiểu 100.000đ…".
- **SUV-04 [P1]** Đặt đơn bằng mã → DB: `status=Used`, `used_order_id`, `used_by_customer_id`, `used_at`; admin thấy "Đã dùng" kèm mã đơn, tên khách, thời gian. Khách vãng lai dùng lại SĐT cũ với tên mới → cột "Sử dụng" hiện tên mới nhập (hồ sơ ẩn được cập nhật tên).
- **SUV-05 [P1]** Dùng lại mã đã dùng (cùng khách hoặc khách khác) → "Mã 'X' đã được sử dụng".
- **SUV-06 [P1]** Hủy đơn đã dùng mã (khách tự hủy khi đang chờ / admin hủy) → mã về `Unused`, lịch sử đơn ghi "Hoàn lại mã giảm giá X", dùng lại được.
- **SUV-07 [P1]** Admin vô hiệu hóa mã → khách áp → "Mã 'X' đã bị vô hiệu hóa"; kích hoạt lại → dùng được; mã đã dùng không có nút đổi trạng thái (API → 400).
- **SUV-08 [P2]** Mã quá hạn → "Mã 'X' đã hết hạn"; tab lọc "Hết hạn" ở admin.
- **SUV-09 [P1] Đồng thời**: 2 phiên đặt đơn **cùng lúc** với cùng 1 mã → chỉ 1 đơn thành công, đơn còn lại "đã được sử dụng".
- **SUV-10 [P1]** POS dùng mã dùng 1 lần (`POS-05`) → mã chuyển `Used`.

## 9. Nhớ mã & ví voucher

- **WAL-01 [P1]** Khách **chưa đăng nhập** áp mã → tải lại trang `/pay` → mã vẫn được áp; sang `/products` rồi quay lại `/pay` → vẫn còn.
- **WAL-02 [P1]** Khách chưa đăng nhập: đóng tab, mở tab mới vào `/pay` → mã **không còn**; bấm "Bỏ chọn" → tải lại không còn; đặt hàng xong → không còn.
- **WAL-03 [P2]** Khách chưa đăng nhập nhớ mã, trong lúc đó mã bị người khác dùng → tải lại `/pay` → mã không được áp (tự quên).
- **WAL-04 [P1]** Khách **đã đăng nhập** nhập mã dùng 1 lần → toast "… Mã đã được lưu vào tài khoản."; mở cửa sổ voucher → mục "Mã đã lưu của bạn" có mã đó; đăng nhập ở trình duyệt khác → vẫn thấy.
- **WAL-05 [P1]** Mở lại `/pay` (đã đăng nhập) → tự áp mã mới lưu gần nhất mà đơn đủ điều kiện.
- **WAL-06 [P1]** Dùng mã trong ví để đặt đơn → mã biến mất khỏi ví; hủy đơn → mã hiện lại; admin vô hiệu hóa / mã hết hạn → biến mất.
- **WAL-07 [P2]** Nút "Xóa" trong ví → mã biến mất (API `DELETE /api/client/promotions/saved/{id}`), xóa lần 2 → 404.
- **WAL-08 [P2]** Khách 1 lưu mã → khách 2 không thấy trong ví của mình.
- **WAL-09 [P2]** Khách vãng lai áp mã → bị hỏi đăng nhập (SĐT đã có tài khoản, `GST-04`) → đăng nhập xong mã được chuyển vào ví tài khoản.
- **WAL-10 [P2]** API: `GET /api/client/promotions/saved` không token → 401; `POST …/saved` với mã không phải mã dùng 1 lần → "Chỉ lưu được mã giảm giá dùng 1 lần (8 ký tự)"; mã đã dùng → "Mã 'X' đã được sử dụng".

## 10. Đơn hàng phía khách (trang Hóa đơn)

- **ORDC-01 [P1]** `/receipt` chưa đăng nhập → yêu cầu đăng nhập; đã đăng nhập → danh sách đơn mới nhất trước, chọn đơn xem chi tiết (giá gốc gạch ngang nếu có khuyến mãi, "Giảm giá voucher (MÃ)"), thanh tiến trình trạng thái.
- **ORDC-02 [P1]** Admin đổi trạng thái đơn → trang Hóa đơn của khách tự cập nhật + toast thông báo.
- **ORDC-03 [P1]** "Tải hóa đơn PDF" tải đúng file; API tải hóa đơn / xem đơn của khách khác → 404.
- **ORDC-04 [P1]** Trang Hóa đơn: đơn "Chờ xác nhận" có nút **"Hủy đơn"** → hỏi lại → hủy thành công, trạng thái cập nhật, tồn kho và mã dùng 1 lần được hoàn; đơn đã thanh toán có nhắc liên hệ tiệm để hoàn tiền. Đơn từ "Đang chuẩn bị" trở đi không còn nút hủy (API → "Không thể hủy đơn hàng ở trạng thái 'Processing'…").
- **ORDC-05 [P2] ⚠️** Khách hủy đơn chuyển khoản đã "Đã thanh toán" → trạng thái thanh toán vẫn Paid (không chuyển Refunded); khách tự hủy không tạo thông báo.

## 11. Quản trị — phân quyền & đăng nhập

- **PERM-01 [P1]** `/admin/login` bằng SĐT hoặc email admin → vào Tổng quan; sai → "Tài khoản hoặc mật khẩu quản trị không chính xác"; tài khoản khách → "Tài khoản không có quyền truy cập hệ thống Quản trị".
- **PERM-02 [P1]** Đăng nhập staff (`USR-01`) → menu chỉ có "Quản Lý Đơn Hàng"; gõ URL `/admin/products`, `/admin/vouchers`, `/admin/users`… → bị đưa về `/admin/orders`; API admin-only (VD `GET /api/admin/products`) bằng token staff → 403.
- **PERM-03 [P1]** Staff vẫn tạo đơn tại quầy, tra cứu khách, kiểm tra voucher, đổi trạng thái, xác nhận thanh toán, in/xuất hóa đơn được.
- **PERM-04 [P2]** Đăng nhập khách và admin cùng lúc trên một trình duyệt → hai phiên độc lập.
- **PERM-05 [P2]** Menu admin chỉ còn **một** mục "Voucher & Khuyến Mãi" (không còn "Mã Dùng 1 Lần", "Khuyến Mãi Sản Phẩm" riêng); trang có 3 tab; tab nằm trên URL (`?tab=single-use`, `?tab=products`), tải lại giữ tab; link cũ `/admin/single-use-vouchers`, `/admin/product-promotions` chuyển đúng tab.

## 12. Quản trị — đơn hàng

- **AORD-01 [P1]** Luồng: Chờ tiếp nhận → Đang chuẩn bị → Sẵn sàng → Hoàn tất; dropdown chỉ hiện bước hợp lệ (`next_statuses`); API chuyển sai bước → "Không thể chuyển đơn hàng từ 'X' sang 'Y'".
- **AORD-02 [P1]** Hủy đơn: bắt buộc lý do (nút khóa khi trống; API → "Vui lòng nhập lý do hủy đơn hàng"); hủy xong tồn kho được cộng lại, mã dùng 1 lần được hoàn; Hoàn tất / Đã hủy là trạng thái cuối.
- **AORD-03 [P1]** Hoàn tất đơn COD chưa thu tiền — cả từ menu trạng thái trong bảng lẫn nút "Thu Tiền & Hoàn Tất" ở khung chi tiết — đều hỏi "Hoàn tất & Xác nhận thu tiền?" (bấm "Quay lại" thì không đổi gì) → thanh toán thành Paid; đơn chuyển khoản chưa thanh toán → bị chặn "…chưa được xác nhận thanh toán…".
- **AORD-04 [P1]** "Xác nhận đã thu tiền" chỉ có khi Unpaid & chưa hủy; đã Paid → API "Đơn hàng đang ở trạng thái thanh toán 'Paid'"; đơn hủy → "Không thể xác nhận thanh toán cho đơn hàng đã hủy".
- **AORD-09 [P2]** Menu "Chuyển trạng thái" (bấm nhãn trạng thái trong bảng) hiện đầy đủ, không bị khung bảng cắt, kể cả khi cửa sổ hẹp (~1100px) hoặc ở dòng cuối bảng; cuộn trang thì menu tự đóng.
- **AORD-05 [P2]** Tìm kiếm không dấu theo mã/tên/SĐT (bỏ "#"), tab trạng thái có đếm, chọn số dòng/trang, phím ↑/↓ chuyển đơn, Esc đóng; tự làm mới 30 giây.
- **AORD-06 [P1]** Chi tiết đơn có món khuyến mãi → giá gốc gạch ngang; đơn dùng mã → hiện mã; đơn khách vãng lai hiển thị bình thường.
- **AORD-07 [P2]** "Xuất Hóa Đơn PDF" và nút in phiếu hoạt động với mọi trạng thái.
- **AORD-08 [P1]** Mỗi lần đổi trạng thái: khách có tài khoản nhận thông báo (realtime + lưu trong thông báo), lịch sử trạng thái ghi người thao tác.

## 13. Quản trị — tạo đơn tại quầy (POS)

- **POS-01 [P1]** Kênh "Bán Online" (khách gọi điện): SĐT thật bắt buộc (nút "Khách vãng lai" bị chặn), có bước đọc lại xác nhận → đơn vào thẳng "Đang chuẩn bị"; khách có tài khoản nhận thông báo xác nhận.
- **POS-02 [P1]** "Bán tại quầy – nhận ngay": đơn Hoàn tất + Đã thanh toán ngay; hộp tiền khách đưa/tiền thối; in hóa đơn nhiệt 80mm ("HÓA ĐƠN BÁN HÀNG").
- **POS-03 [P1]** "Bán tại quầy – đặt trước": bắt buộc giờ hẹn hợp lệ; in "PHIẾU ĐẶT BÁNH" kèm "Hẹn lấy".
- **POS-04 [P1]** Tra cứu SĐT: khách cũ → gợi ý tên; tài khoản bị khóa → cảnh báo đỏ kèm lý do; khách có đơn dở → cảnh báo; khách mới → tạo hồ sơ ẩn.
- **POS-05 [P1]** Bánh đang khuyến mãi hiện giá giảm + giá gốc gạch ("-15%"); áp voucher chương trình và mã dùng 1 lần; đổi tổng tiền/SĐT → voucher được kiểm tra lại.
- **POS-06 [P1]** Admin đổi giá / bật-tắt khuyến mãi trong lúc POS đang mở giá cũ → tạo đơn bị chặn "Giá 'X' (size) vừa thay đổi thành …, vui lòng kiểm tra lại đơn".
- **POS-07 [P2]** Các chặn trước khi tạo: giỏ trống, vượt tồn, SĐT sai, thiếu tên, giờ hẹn sai, ghi chú > 200, đang kiểm tra voucher, tiền khách đưa thiếu. ⚠️ Client không chặn giờ hẹn quá 30 ngày (chỉ server chặn).
- **POS-08 [P2]** Đóng modal khi đang có món → hỏi "Hủy đơn đang tạo?"; nhân viên tạo đơn qua điện thoại → máy nhân viên khác kêu chuông, máy người tạo không kêu.

## 14. Quản trị — sản phẩm

- **APRD-01 [P1]** Thêm bánh mới (ảnh ≤10MB, ít nhất 1 size, giá, tồn) → xuất hiện ở trang khách ngay (`products_changed`).
- **APRD-02 [P1]** Sửa bánh: đổi giá/tồn/size → trang khách & giỏ cập nhật; trạng thái Hidden → khách không thấy.
- **APRD-03 [P2]** Upload ảnh sai định dạng (.pdf) / > 10MB → báo lỗi.
- **APRD-04 [P1]** "Ngừng kinh doanh" → bánh biến mất khỏi trang khách và khỏi mọi giỏ; đơn cũ có bánh đó vẫn xem được; "Mở bán lại" hoạt động.
- **APRD-05 [P1]** Cập nhật giá hàng loạt qua Excel: tải mẫu → sửa giá → xem trước (đổi giá ×2 hoặc ½ được tô cảnh báo; lỗi từng dòng: thiếu mã, không tìm thấy, ngừng bán, trùng, giá 0) → áp dụng. File không phải .xlsx, > 2MB, sai mẫu, sai tên sheet → báo lỗi rõ ràng.
- **APRD-06 [P2]** Hai admin cùng áp dụng file giá: người sau → "Giá của … vừa được thay đổi bởi người khác…" (không ghi đè).
- **APRD-07 [P2] ⚠️ ĐÃ BIẾT LỆCH** API tạo/sửa bánh với giá âm, tồn âm, trùng size, status không hợp lệ → hiện tại không chặn ở schema (status sai có thể 500); form web cho giá 0.

## 15. Quản trị — Voucher & Khuyến Mãi (trang gộp)

- **AVCH-01 [P1]** Tab "Voucher Chương Trình": form main-sub (thông tin chương trình + danh sách mức giảm thêm/xóa dòng) tạo, sửa, tạm dừng/kích hoạt; tab lọc trạng thái; lượt dùng hiển thị `đã dùng / tổng`.
- **AVCH-02 [P1]** Tab "Mã Dùng 1 Lần": xem `SUV-*`; tìm theo mã / đợt / mã đơn; tải CSV mã chưa dùng.
- **AVCH-03 [P1]** Tab "Khuyến Mãi Sản Phẩm": tạo khuyến mãi (bánh, size hoặc "Mọi size", %, bắt đầu, kết thúc, nút nhanh "Hết hôm nay/Ngày mai/2 ngày", ghi chú nội bộ) → xem trước "Giá khách sẽ thấy"; **không có** chọn loại "Sắp hết hạn/Ưu đãi thường"; sửa, tạm dừng, xóa; cột trạng thái Đang áp dụng / Sắp diễn ra / Tạm dừng / Đã kết thúc, "còn N giờ".
- **AVCH-04 [P2]** Khuyến mãi: % ngoài 1–90, kết thúc ≤ bắt đầu, size không thuộc bánh → bị chặn.

## 16. Quản trị — phiếu nhập kho

- **IMP-01 [P1]** Tạo phiếu "Lưu tạm" (Pending) → tồn kho chưa đổi; "Xác nhận nhập kho" → tồn kho cộng thêm, trang khách cập nhật realtime; phiếu đã nhập không hủy được.
- **IMP-02 [P1]** Tạo phiếu và nhập kho ngay (Completed) → tồn cộng ngay; "Hủy phiếu" Pending → tồn không đổi.
- **IMP-03 [P2]** Chặn: chưa chọn nhà cung cấp, không có dòng, thiếu bánh/size, số lượng ≤ 0, giá nhập không hợp lệ, trùng bánh+size; nhà cung cấp ngừng hợp tác → "Nhà cung cấp đang ngừng hợp tác".
- **IMP-04 [P2]** Nhập phiếu từ Excel (mẫu, xem trước lỗi từng dòng: thiếu số lượng, số lượng ≤ 0, thiếu giá…) → điền vào form; xuất PDF phiếu; mã phiếu tăng dần `PN###`.
- **IMP-05 [P2] ⚠️ ĐÃ BIẾT LỆCH** API tạo phiếu cho bánh đã ngừng kinh doanh → hiện tại được chấp nhận (chỉ Excel chặn).

## 17. Quản trị — tài khoản

- **USR-01 [P1]** Tạo nhân viên: họ tên, SĐT `^0\d{9}$`, email `@thesweets.com`, mật khẩu ≥ 6, vai trò staff → đăng nhập `/admin/login` được (dùng cho `PERM-02`).
- **USR-02 [P2]** Trùng SĐT (kể cả tài khoản ẩn của khách vãng lai) / trùng email → báo lỗi.
- **USR-03 [P1]** Sửa tài khoản: không tự hạ quyền admin của chính mình, không tự khóa mình.
- **USR-04 [P2]** Tìm theo SĐT/email/tên, tab vai trò; danh sách gồm cả tài khoản ẩn của khách vãng lai.
- **USR-05 [P1]** Khóa tài khoản khách (chọn lý do có sẵn hoặc "Khác" + nhập) → khách đang online bị đăng xuất ngay kèm lý do (`account_locked`); đăng nhập lại bị chặn; mở khóa → đăng nhập lại được. Khóa staff đang dùng trang admin → bị đẩy về `/admin/login`.
- **USR-06 [P2] ⚠️ ĐÃ BIẾT LỆCH** Admin hạ quyền / khóa admin khác kể cả admin cuối cùng; khóa được hồ sơ "Khách vãng lai" `0000000000` (làm hỏng bán tại quầy?) → hiện không chặn.

## 18. Quản trị — báo cáo & tổng quan

- **RPT-01 [P1]** Tổng quan: doanh thu (chỉ đơn Hoàn tất), số đơn, đơn sắp tới hạn lấy, đơn mới nhất, bánh sắp hết, biểu đồ giờ cao điểm; "Tạo Đơn Nhanh" mở POS; tự cập nhật khi có đơn mới.
- **RPT-02 [P1]** Báo cáo doanh thu: preset Hôm nay / 7 ngày / Tháng này / Năm nay; nhóm theo ngày/tháng/quý/năm; doanh thu = tổng `final_cost` đơn Hoàn tất; chi = phiếu nhập đã nhập kho; lợi nhuận = thu − chi. Đối chiếu số liệu với DB cho 1 khoảng ngày cụ thể.
- **RPT-03 [P2]** Từ ngày > Đến ngày → "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày."; xem chi tiết theo ngày > 92 ngày → bị chặn; thiếu ngày → "Vui lòng chọn đủ Từ ngày và Đến ngày.".
- **RPT-04 [P2]** Xuất Excel đúng tên file `bao-cao-doanh-thu-YYYYMMDD-YYYYMMDD.xlsx`, số liệu khớp màn hình.
- **RPT-05 [P2] ⚠️** Doanh thu tính theo ngày đặt (`order_date`), không theo ngày hoàn tất: đơn đặt hôm qua, hoàn tất hôm nay → tính vào hôm qua.

## 19. Realtime

- **RT-01 [P1]** Hai trình duyệt: khách A đặt bánh cuối cùng của 1 size → trang chi tiết/giỏ của khách B cập nhật tồn kho ngay (`stock_updated`).
- **RT-02 [P1]** Admin sửa/ngừng bán bánh → trang chủ, thực đơn, chi tiết của khách tự tải lại (`products_changed`).
- **RT-03 [P1]** Đơn mới từ web khách / app / điện thoại → trang admin kêu "ting ting" + toast có nguồn ("· đặt từ App", "· qua điện thoại").
- **RT-04 [P2]** WebSocket: kết nối không token → `{"event":"connected","authenticated":false}`; token khách → `authenticated:true,is_staff:false`; token admin → `is_staff:true`; gửi `{"type":"ping"}` → `{"type":"pong"}`.
- **RT-05 [P2]** `POST http://localhost:8001/internal/events` không có / sai header `X-Internal-Key` → 403 "Sai khóa nội bộ".
- **RT-06 [P2]** Tắt container `realtime` → đặt hàng, đổi trạng thái vẫn thành công (chỉ mất cập nhật tức thời); bật lại → web tự kết nối lại sau ~5 giây.

## 20. API Mobile (app Flutter)

Gọi qua gateway `http://localhost:8080/api/v1` với header `Authorization: Bearer <token>`.

- **MOB-01 [P1]** `POST /auth/login` bằng SĐT hoặc email; sai → 401; bị khóa → 403; tài khoản ẩn → gợi ý đăng ký. `POST /auth/register` trả token ngay; nhận lại tài khoản ẩn giữ đơn cũ.
- **MOB-02 [P1]** `GET /products` chỉ bánh Available, giá đã trừ khuyến mãi kèm `original_price`, `discount_percentage`, `promo_end_date` (không có `promo_type`); `GET /products/{id}`.
- **MOB-03 [P1]** Giỏ: thêm (kiểm tra tồn cộng dồn với món thêm từ web), sửa (0 → xóa), xóa, xóa hết; giỏ dùng chung với web (thêm ở app, web thấy và ngược lại).
- **MOB-04 [P1]** `POST /orders` với `promotion_id` → giảm đúng mức; giá theo khuyến mãi sản phẩm; tồn giảm; admin web kêu chuông "· đặt từ App"; khách nhận thông báo "Đặt hàng thành công".
- **MOB-05 [P1]** `GET /orders`: khách chỉ thấy đơn của mình, staff/admin thấy tất cả; xem đơn người khác → 403.
- **MOB-06 [P2]** `GET /promotions`, `GET /notifications`, `PUT /notifications/{id}/read` (của người khác → 404), `PUT /notifications/read-all`.
- **MOB-07 [P2]** `POST /upload` (staff): đuôi sai → lỗi; > 10MB → lỗi (qua gateway có thể 413).
- **MOB-08 [P1]** `POST /orders` kiểm tra dữ liệu như web, lỗi trả **400 dạng chuỗi** (App hiện được):
  `quantity` 0 / âm → "Số lượng mỗi món phải từ 1 trở lên" và **tồn kho không đổi**; `items` rỗng → "Đơn hàng phải có ít nhất 1 sản phẩm bánh";
  SĐT người nhận sai → "Số điện thoại người nhận phải gồm đúng 10 chữ số và bắt đầu bằng 0" (khoảng trắng trong SĐT được bỏ);
  tên < 2 ký tự → "Vui lòng nhập họ tên người nhận…"; `payment_method` ngoài COD/Banking/Momo/Credit Card/VNPay → "Hình thức thanh toán không hợp lệ…";
  ghi chú đơn / ghi chú món vi phạm quy tắc ghi chú (mục 0.4) → bị chặn.
- **MOB-09 [P1]** `PUT /orders/{id}/status` (staff) theo đúng luật web admin: chỉ chuyển bước hợp lệ (Pending→Processing→Ready→Completed, hủy từ 3 trạng thái đầu) — sai bước → "Không thể chuyển đơn hàng từ 'X' sang 'Y'";
  hủy bắt buộc lý do ("Vui lòng nhập lý do hủy đơn hàng"), **hoàn tồn kho** và hoàn mã dùng 1 lần; Hoàn tất đơn COD chưa thu → tự chuyển Paid ("Đã thu tiền mặt khi giao bánh"), đơn chuyển khoản chưa thanh toán → "Đơn hàng chưa được xác nhận thanh toán, không thể hoàn tất"; khách gọi API này → 403.
- **MOB-10 [P2]** Khách / chưa đăng nhập gọi `GET /products?status=All` (hoặc Hidden) → chỉ nhận bánh đang bán; `GET /products/{id}` bánh ẩn → 404; tài khoản admin/staff vẫn xem được tất cả.
  Mã đơn mọi kênh (web, tại quầy, app) cùng dạng `DH` + 6 ký tự hex in hoa (VD `DH3EA86D`), có kiểm tra trùng.
- **MOB-11 [P2] ⚠️** App mobile chưa hỗ trợ nhập mã dùng 1 lần (chỉ chọn voucher chương trình theo `promotion_id`).

## 21. Đồng thời & bảo mật

- **SEC-01 [P1]** 2 khách đặt cùng lúc bánh cuối cùng (web + web, web + app) → chỉ 1 đơn thành công, tồn kho không âm.
- **SEC-02 [P1]** Khách gọi API admin bằng token khách → 401/403; khách xem/hủy/tải hóa đơn đơn của người khác → 404.
- **SEC-03 [P2]** Token hết hạn / sửa chữ ký → 401 "Token không hợp lệ hoặc đã hết hạn".
- **SEC-04 [P2]** Gửi giá thấp hơn trong request đặt hàng web (`items` không có trường giá) → server luôn tính theo giá DB.
- **SEC-05 [P2]** Nhập chuỗi chứa HTML/script vào ghi chú đơn, tên khách → hiển thị dạng chữ ở web, admin, hóa đơn in nhiệt (không chạy script).

---

## 22. Báo cáo kết quả

1. Bảng: **Mã kịch bản | Kết quả (Đạt / Lỗi / Bỏ qua) | Mô tả lỗi | Screenshot / request-response**.
2. Mục **"Lỗi / thiếu sót"**: gom các kịch bản ⚠️ đã xác nhận + lỗi mới phát hiện, sắp theo mức độ nghiêm trọng.
3. Liệt kê lỗi console và API 5xx gặp trong quá trình chạy.
4. Không commit, không sửa code khi chưa được yêu cầu. Cuối cùng liệt kê dữ liệu test đã tạo (tài khoản, mã, khuyến mãi, đơn) để chủ dự án quyết định giữ hay xóa.
