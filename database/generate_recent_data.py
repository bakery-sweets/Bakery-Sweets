"""
Sinh dữ liệu mẫu cho 3 tháng gần nhất -> database/data_recent.sql

Mô phỏng đúng luồng nghiệp vụ của app:
  - Khách đặt online (Web/App): Pending -> Processing -> Ready -> Completed (log "Hệ thống" rồi nhân viên)
  - Khách mua tại quầy: tạo thẳng Completed (log SĐT nhân viên)
  - Nhân viên nhận đơn qua điện thoại: tạo thẳng Processing
  - Hủy đơn ở các bước, hoàn tiền nếu đã thanh toán; voucher theo bậc hóa đơn, mỗi khách dùng 1 lần
  - Phiếu nhập theo lịch từng nhà cung cấp, số lượng bám theo lượng bán
Đơn có mốc thời gian sau "bây giờ" được cắt bớt, nên các đơn gần nhất đang ở Pending / Processing / Ready.

File SQL sinh ra chạy SAU data.sql (dùng tiếp ID của dữ liệu mẫu), gói trong 1 transaction.

Chạy:  python database/generate_recent_data.py [--end "2026-11-18 14:00"] [--months 3] [--seed 2026]
"""
import argparse
import math
import random
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
SEED_SQL = HERE / "data.sql"
OUT_SQL = HERE / "data_recent.sql"

# ---------------------------------------------------------------------------
# Khớp với data.sql
# ---------------------------------------------------------------------------
NEXT_CUSTOMER_ID = 3
NEXT_ORDER_ID = 4
NEXT_IMPORT_ID = 3
NEXT_IMPORT_NO = 3  # PN003
NEW_SUPPLIER_ID = 3
ADMIN_PHONE = "0900000000"
EXISTING_CUSTOMERS = [  # (customer_id, phone, first_name, last_name)
    (1, "0912345678", "Nguyễn", "Văn An"),
    (2, "0987654321", "Trần", "Thị Bích"),
]
USED_PROMOS = {(1, 1)}  # (customer_id, promotion_id) đã dùng trong data.sql (đơn DH2026100101)
SEED_ACCOUNTS_CREATED = datetime(2026, 1, 1, 8, 0)

PASSWORD_123 = "$2y$10$0QZVDBb/jOeoCdhAdB4JB.Sbjc.DSuksus.QtCPiXh0oEnOFOQCc2"  # mật khẩu "123" như data.sql
# Băm của chuỗi ngẫu nhiên đã bỏ đi: tài khoản ẩn (khách vãng lai / khách gọi điện) không đăng nhập được
NO_LOGIN_PASSWORD = "$2b$12$orq/XjL0WIt.vE2HVYKzSOYYpT2bE5roMxJDc4SYqRcXxLQoKUxMu"
WALK_IN_PHONE = "0000000000"  # app/core/guest_account.py
GUEST_EMAIL_DOMAIN = "guest.thesweets"

OPEN, CLOSE = time(7, 30), time(21, 30)
MOUSSE, CROISSANT, DRINK = 1, 2, 3

STATUS_LABELS = {  # app/services/admin/order_service.py
    "Pending": "Chờ xác nhận",
    "Processing": "Đang chuẩn bị bánh",
    "Ready": "Bánh đã sẵn sàng, mời bạn tới quầy nhận",
    "Completed": "Đã hoàn tất",
    "Cancelled": "Đã bị hủy",
}

STAFF = [  # (phone, email, first_name, last_name)
    ("0938112233", "nam.le@thesweets.com", "Lê", "Hoàng Nam"),
    ("0976554433", "trang.pham@thesweets.com", "Phạm", "Thu Trang"),
    ("0903998877", "khoa.vo@thesweets.com", "Võ", "Minh Khoa"),
]
STAFF_CREATED = datetime(2026, 6, 1, 8, 0)

# Độ phổ biến từng sản phẩm (mặc định 1.0)
POPULARITY = {
    1: 3.0, 2: 2.6, 3: 1.4, 4: 1.6, 5: 1.8, 6: 0.9, 7: 1.2, 8: 1.0, 9: 0.8,
    10: 3.2, 11: 1.8, 12: 2.2, 13: 1.5, 14: 2.0, 15: 1.9, 16: 1.7, 17: 1.6, 18: 1.0,
    19: 2.8, 20: 2.2, 21: 1.8, 22: 2.6, 23: 1.3, 24: 1.5, 25: 1.4, 26: 1.7, 27: 1.6,
}
CATEGORY_BY_CHANNEL = {
    "walkin": {MOUSSE: 0.45, CROISSANT: 1.3, DRINK: 1.4},
    "online": {MOUSSE: 1.5, CROISSANT: 0.9, DRINK: 0.7},
    "phone": {MOUSSE: 2.2, CROISSANT: 0.6, DRINK: 0.3},
}
MOUSSE_SIZE = {"walkin": (0.7, 0.25, 0.05), "online": (0.5, 0.38, 0.12), "phone": (0.35, 0.45, 0.2)}
IMPORT_RATIO = {MOUSSE: 0.5, CROISSANT: 0.44, DRINK: 0.34}  # giá nhập / giá bán
SUPPLIER_OF = {MOUSSE: 1, CROISSANT: 2, DRINK: NEW_SUPPLIER_ID}
SUPPLIER_DAYS = {1: (0, 3), 2: (0, 2, 4), NEW_SUPPLIER_ID: (1,)}  # thứ trong tuần (Thứ 2 = 0)
SUPPLIER_HOURS = {1: (7, 0, 8, 30), 2: (6, 15, 7, 15), NEW_SUPPLIER_ID: (8, 0, 10, 0)}

WEEKDAY_FACTOR = (0.85, 0.85, 0.9, 0.95, 1.1, 1.35, 1.3)
BASE_ORDERS_PER_DAY = 11.0
PICKUP_HOURS = {7: 1, 8: 3, 9: 4, 10: 5, 11: 4, 12: 2.5, 13: 2, 14: 3, 15: 4.5,
                16: 5.5, 17: 6, 18: 5, 19: 6, 20: 4.5, 21: 1.5}
BROWSE_HOURS = {7: 1, 8: 2, 9: 3, 10: 4, 11: 4, 12: 5, 13: 4, 14: 3, 15: 3, 16: 3,
                17: 3, 18: 3, 19: 4, 20: 6, 21: 6, 22: 4, 23: 2}

MID_AUTUMN = {2025: date(2025, 10, 6), 2026: date(2026, 9, 25), 2027: date(2027, 9, 15)}

FAMILY = ["Nguyễn"] * 6 + ["Trần"] * 3 + ["Lê"] * 3 + ["Phạm"] * 2 + [
    "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Trương", "Đinh"]
FEMALE_MID = ["Thị", "Ngọc", "Thu", "Minh", "Bảo", "Khánh", "Thanh", "Phương", "Mai", "Hoài", "Diệu"]
FEMALE_NAME = ["Anh", "Linh", "Trang", "Hương", "Ngân", "Vy", "Hân", "Thảo", "Nhung", "Quỳnh", "Như",
               "Uyên", "My", "Tâm", "Hà", "Lan", "Yến", "Trâm", "Châu", "Nhi", "Giang", "Thư", "Hạnh"]
MALE_MID = ["Văn", "Minh", "Quốc", "Hoàng", "Đức", "Gia", "Thành", "Tuấn", "Anh", "Hữu", "Nhật"]
MALE_NAME = ["Huy", "Khang", "Phúc", "Nam", "Dũng", "Tuấn", "Long", "Bảo", "Khoa", "Hiếu", "Tài",
             "Đạt", "Thịnh", "Quân", "Sơn", "Vinh", "Phong", "Trí", "Duy", "Kiên", "Lâm"]
PHONE_PREFIX = ["090", "093", "089", "070", "076", "077", "078", "079", "091", "094", "088", "096",
                "097", "098", "086", "032", "033", "034", "035", "036", "037", "038", "039", "081",
                "082", "083", "084", "085"]

CANCEL_NOTES = {
    "Pending": [
        "Khách gọi điện yêu cầu hủy đơn do thay đổi kế hoạch",
        "Khách đặt trùng đơn, hủy bớt một đơn",
        "Khách muốn đổi sang vị khác nên hủy đơn để đặt lại",
        "Khách hủy vì không sắp xếp được giờ tới lấy bánh",
    ],
    "Processing": [
        "Khách báo bận đột xuất, xin hủy đơn",
        "Hết nguyên liệu cho vị bánh khách chọn, đã gọi xin lỗi và hủy đơn",
        "Khách đổi ý không lấy nữa",
    ],
    "Ready": [
        "Khách không đến nhận bánh, đã gọi nhưng không liên lạc được",
        "Quá giờ hẹn 3 tiếng khách không tới, hủy đơn",
    ],
}
PROCESSING_NOTES = ["Bếp tiếp nhận đơn và bắt đầu chuẩn bị bánh", "Đã xác nhận đơn, đang làm bánh", None, None, None]
READY_NOTES = ["Bánh đã làm xong và đóng hộp, sẵn sàng tại quầy", "Đã đóng hộp, chờ khách tới lấy", None, None, None]
GENERIC_NOTES = ["Lấy giúp túi giấy", "Không lấy dao nĩa nhựa", "Gọi giúp mình khi bánh xong",
                 "Mình đến trễ khoảng 15 phút", "Đóng gói kỹ giúp mình, đi xe máy xa"]
LINE_NOTES = {
    CROISSANT: ["Hâm nóng giúp mình", "Cắt đôi bánh", "Để riêng từng túi"],
    DRINK: ["Ít đá", "Ít đường", "Không đá", "Nhiều đá", "50% đường"],
}


@dataclass
class Product:
    product_id: int
    name: str
    category_id: int
    sizes: Dict[int, Decimal]  # size_id -> giá bán


@dataclass
class Customer:
    customer_id: int
    phone: str
    first: str
    last: str
    email: Optional[str]
    created_at: datetime
    kind: str  # existing | registered | guest | walkin | staff
    weight: float = 1.0
    orders: int = 0

    @property
    def full_name(self) -> str:
        return f"{self.first} {self.last}".strip()

    @property
    def given(self) -> str:
        return self.last.split()[-1] if self.last else self.first


@dataclass
class Event:
    at: datetime
    by: str
    old: Optional[str]
    new: str
    note: Optional[str]
    kind: str  # create | status | payment


@dataclass
class Order:
    channel: str
    customer: Customer
    recipient_name: str
    recipient_phone: str
    order_date: datetime
    pickup: datetime
    notes: Optional[str]
    lines: Dict[Tuple[int, int], list]  # (product_id, size_id) -> [qty, price, note]
    payment_method: str
    promotion_id: Optional[int] = None
    discount: Decimal = Decimal("0.00")
    events: List[Event] = field(default_factory=list)
    paid_at: Optional[datetime] = None
    cancelled: bool = False
    order_id: int = 0
    code: str = ""

    @property
    def total_cost(self) -> Decimal:
        return sum((price * qty for qty, price, _ in self.lines.values()), Decimal("0.00"))

    @property
    def total_quantity(self) -> int:
        return sum(qty for qty, _, _ in self.lines.values())


# ---------------------------------------------------------------------------
# Đọc danh mục từ data.sql để giá luôn khớp dữ liệu mẫu
# ---------------------------------------------------------------------------
def _block(sql: str, table: str) -> str:
    m = re.search(rf"INSERT INTO {table} \(.*?\) VALUES(.*?);\s*\n", sql, re.S)
    if not m:
        raise SystemExit(f"Không tìm thấy INSERT INTO {table} trong {SEED_SQL}")
    return m.group(1)


def load_catalog():
    sql = SEED_SQL.read_text(encoding="utf-8")
    products: Dict[int, Product] = {}
    for pid, name, cat in re.findall(r"^\((\d+), '((?:[^']|'')*)', (\d+), '", _block(sql, "product"), re.M):
        products[int(pid)] = Product(int(pid), name.replace("''", "'"), int(cat), {})
    for pid, sid, price, _ in re.findall(r"\((\d+), (\d+), ([\d.]+), (\d+)\)", _block(sql, "product_sizes")):
        products[int(pid)].sizes[int(sid)] = Decimal(price)

    promos = {}
    for pid, code, start, end, status, per_user, total in re.findall(
        r"\((\d+), '([^']+)', '(?:[^']|'')*', '(?:[^']|'')*', '([\d\- :]+)', '([\d\- :]+)', '(\w+)', (\d+), (\d+|NULL)\)",
        _block(sql, "promotions"),
    ):
        promos[int(pid)] = {
            "code": code, "start": datetime.fromisoformat(start), "end": datetime.fromisoformat(end),
            "active": status == "Active", "per_user": int(per_user),
            "total": None if total == "NULL" else int(total), "tiers": [], "used": 0,
        }
    for pid, min_value, pct, max_value in re.findall(
        r"\((\d+), ([\d.]+), ([\d.]+), ([\d.]+|NULL)\)", _block(sql, "invoice_promotions")
    ):
        promos[int(pid)]["tiers"].append(
            (Decimal(min_value), Decimal(pct), None if max_value == "NULL" else Decimal(max_value))
        )
    users = set(re.findall(r"'(0\d{9})'", _block(sql, "users")))
    emails = set(re.findall(r"'([^']+@[^']+)'", _block(sql, "users")))
    return products, promos, users, emails


# ---------------------------------------------------------------------------
# Bộ sinh
# ---------------------------------------------------------------------------
class Generator:
    def __init__(self, now: datetime, months: int, seed: int):
        self.rng = random.Random(seed)
        self.now = now
        start_month = now.month - months
        start_year = now.year + (start_month - 1) // 12
        start_month = (start_month - 1) % 12 + 1
        self.start = date(start_year, start_month, min(now.day, 28))
        self.start_dt = datetime.combine(self.start, time.min)
        self.products, self.promos, self.used_phones, self.used_emails = load_catalog()
        self.used_phones |= {WALK_IN_PHONE} | {s[0] for s in STAFF}
        self.next_customer_id = NEXT_CUSTOMER_ID
        self.customers: List[Customer] = []
        self.staff_customers: List[Customer] = []
        self.guests: List[Customer] = []
        self.promo_used = set(USED_PROMOS)
        self.orders: List[Order] = []
        self.receipts: List[dict] = []
        self.import_price: Dict[Tuple[int, int], Decimal] = {}

    # ----- tiện ích -----
    def minutes(self, a: int, b: int) -> timedelta:
        return timedelta(minutes=self.rng.randint(a, b))

    def weighted(self, weights: dict):
        keys = list(weights)
        return self.rng.choices(keys, weights=[weights[k] for k in keys])[0]

    def sample_time(self, day: date, profile: dict) -> datetime:
        hour = self.weighted(profile)
        lo, hi = 0, 59
        if hour == OPEN.hour:
            lo = OPEN.minute
        if hour == CLOSE.hour:
            hi = CLOSE.minute
        return datetime.combine(day, time(hour, self.rng.randint(lo, hi)))

    def open_at(self, t: datetime) -> datetime:
        """Thời điểm nhân viên xử lý được: ngoài giờ mở cửa thì dời sang đầu ca sáng"""
        if t.time() < OPEN:
            return datetime.combine(t.date(), OPEN) + self.minutes(0, 30)
        if t.time() > time(21, 45):
            return datetime.combine(t.date() + timedelta(days=1), OPEN) + self.minutes(0, 30)
        return t

    def new_phone(self) -> str:
        while True:
            phone = self.rng.choice(PHONE_PREFIX) + f"{self.rng.randint(0, 9999999):07d}"
            if phone not in self.used_phones:
                self.used_phones.add(phone)
                return phone

    def new_name(self) -> Tuple[str, str]:
        if self.rng.random() < 0.62:  # khách tiệm bánh phần lớn là nữ
            return self.rng.choice(FAMILY), f"{self.rng.choice(FEMALE_MID)} {self.rng.choice(FEMALE_NAME)}"
        return self.rng.choice(FAMILY), f"{self.rng.choice(MALE_MID)} {self.rng.choice(MALE_NAME)}"

    def new_email(self, first: str, last: str) -> str:
        def slug(s: str) -> str:
            s = unicodedata.normalize("NFD", s.replace("Đ", "D").replace("đ", "d"))
            return "".join(c for c in s if c.isascii() and c.isalnum()).lower()
        parts = last.split()
        base = f"{slug(parts[-1])}.{slug(first)}{''.join(slug(p)[0] for p in parts[:-1])}"
        while True:
            email = f"{base}{self.rng.randint(80, 2005)}@gmail.com"
            if email not in self.used_emails:
                self.used_emails.add(email)
                return email

    def add_customer(self, phone, first, last, email, created_at, kind, weight=1.0) -> Customer:
        c = Customer(self.next_customer_id, phone, first, last, email, created_at, kind, weight)
        self.next_customer_id += 1
        return c

    # ----- ngày lễ -----
    def special(self, d: date) -> Tuple[float, Optional[str]]:
        md = (d.month, d.day)
        mid = MID_AUTUMN.get(d.year)
        if mid and 0 <= (mid - d).days <= 3:
            return (2.0, 1.6, 1.35, 1.2)[(mid - d).days], "trungthu"
        table = {
            (9, 1): (1.2, None), (9, 2): (1.6, None),
            (10, 19): (1.5, "2010"), (10, 20): (2.6, "2010"),
            (10, 31): (1.3, None),
            (11, 19): (1.4, "2011"), (11, 20): (2.4, "2011"),
            (2, 14): (1.8, "valentine"), (3, 7): (1.4, "0803"), (3, 8): (2.2, "0803"),
            (12, 24): (1.8, None), (12, 25): (1.5, None),
        }
        return table.get(md, (1.0, None))

    # ----- con người -----
    def build_people(self):
        for phone, email, first, last in STAFF:
            self.staff_customers.append(self.add_customer(phone, first, last, email, STAFF_CREATED, "staff"))
        self.walk_in = self.add_customer(
            WALK_IN_PHONE, "Khách", "vãng lai", f"{WALK_IN_PHONE}@{GUEST_EMAIL_DOMAIN}",
            self.start_dt + timedelta(hours=7), "walkin",
        )
        for cid, phone, first, last in EXISTING_CUSTOMERS:
            self.customers.append(Customer(cid, phone, first, last, None, SEED_ACCOUNTS_CREATED, "existing", 2.0))
        span = (self.now - self.start_dt).total_seconds()
        for _ in range(150):
            first, last = self.new_name()
            if self.rng.random() < 0.45:
                created = datetime(2026, 3, 1) + timedelta(seconds=self.rng.uniform(0, (self.start_dt - datetime(2026, 3, 1)).total_seconds()))
            else:
                created = self.start_dt + timedelta(seconds=self.rng.uniform(0, span * 0.95))
            created = created.replace(second=self.rng.randint(0, 59), microsecond=0)
            weight = min(self.rng.lognormvariate(0, 0.8), 3.5)  # khách quen nhất ~2-3 đơn/tuần
            self.customers.append(self.add_customer(
                self.new_phone(), first, last, self.new_email(first, last), created, "registered", weight))

    def staff_on(self, t: datetime, busy: bool) -> str:
        """SĐT nhân viên trong ca tại thời điểm t (A: ca sáng, B: ca chiều tối, C: bán thời gian thay ca nghỉ / ngày đông)"""
        a, b, c = (s[0] for s in STAFF)
        wd, morning = t.weekday(), t.time() < time(14, 30)
        if morning:
            on = [c] if wd == 6 else [a]  # A nghỉ Chủ nhật
        else:
            on = [c] if wd == 0 else [b]  # B nghỉ Thứ 2
        if busy or wd == 5:  # Thứ 7 và ngày lễ đông khách: thêm một người
            on = sorted(set(on) | {c if c not in on else (a if morning else b)})
        if self.rng.random() < 0.04:
            return ADMIN_PHONE
        return self.rng.choice(on)

    def pick_customer(self, at: datetime) -> Customer:
        pool = [c for c in self.customers if c.created_at <= at]
        return self.rng.choices(pool, weights=[c.weight for c in pool])[0]

    def pick_guest(self, at: datetime) -> Customer:
        if self.guests and self.rng.random() < 0.55:
            return self.rng.choice(self.guests)
        first, last = self.new_name()
        phone = self.new_phone()
        g = self.add_customer(phone, first, last, f"{phone}@{GUEST_EMAIL_DOMAIN}", at, "guest")
        self.guests.append(g)
        return g

    # ----- món -----
    def pick_lines(self, channel: str, theme: Optional[str], month: int) -> Dict[Tuple[int, int], list]:
        n_lines = self.rng.choices((1, 2, 3, 4), weights=(40, 35, 18, 7))[0]
        cat_w = dict(CATEGORY_BY_CHANNEL[channel])
        if theme:
            cat_w[MOUSSE] *= 2.2
        weights = {}
        for p in self.products.values():
            w = POPULARITY.get(p.product_id, 1.0) * cat_w[p.category_id]
            if p.product_id == 5:  # xoài: mùa hè
                w *= 1.3 if month <= 9 else 0.8
            if p.product_id in (11, 25):  # socola: trời se lạnh cuối năm
                w *= 1.3 if month >= 11 else 1.0
            weights[p.product_id] = w
        lines: Dict[Tuple[int, int], list] = {}
        for _ in range(n_lines):
            p = self.products[self.weighted(weights)]
            if p.category_id == MOUSSE:
                sid = self.rng.choices((1, 2, 3), weights=MOUSSE_SIZE[channel])[0]
                qty = 1 if self.rng.random() < 0.9 else 2
            elif p.category_id == DRINK:
                sid = 4 if self.rng.random() < 0.65 else 5
                qty = self.rng.choices((1, 2, 3), weights=(55, 30, 15))[0]
            else:
                sid = 4
                qty = self.rng.choices((1, 2, 3, 4), weights=(45, 30, 15, 10))[0]
            key = (p.product_id, sid)
            if key in lines:
                lines[key][0] += qty
            else:
                note = None
                if p.category_id in LINE_NOTES and self.rng.random() < 0.15:
                    note = self.rng.choice(LINE_NOTES[p.category_id])
                lines[key] = [qty, p.sizes[sid], note]
        return lines

    def order_notes(self, has_mousse: bool, theme: Optional[str], given: str, proxy: bool) -> Optional[str]:
        r = self.rng.random()
        if proxy and r < 0.5:
            return "Đặt hộ, người nhận sẽ tới quầy lấy bánh"
        if has_mousse and r < 0.55:
            themed = {
                "2010": [f"Viết chữ: Chúc mừng 20/10 - Gửi {given} yêu thương", "Viết chữ: Mừng ngày Phụ nữ Việt Nam",
                         "Viết chữ: 20/10 vui vẻ nha mẹ"],
                "2011": ["Viết chữ: Tri ân thầy cô 20/11", f"Bánh tặng cô {given}, viết chữ: Mừng ngày Nhà giáo Việt Nam",
                         "Viết chữ: Kính chúc thầy cô luôn mạnh khỏe"],
                "trungthu": ["Viết chữ: Trung thu đoàn viên", "Đóng hộp quà tặng Trung thu giúp mình"],
                "valentine": ["Viết chữ: Happy Valentine's Day", "Trang trí thêm trái tim"],
                "0803": ["Viết chữ: Chúc mừng 8/3", f"Viết chữ: Gửi {given} - Happy Women's Day"],
            }.get(theme or "")
            if themed and self.rng.random() < 0.75:
                return self.rng.choice(themed)
            return self.rng.choice([
                f"Viết chữ: Happy Birthday {given}",
                f"Viết chữ: Chúc mừng sinh nhật {given} (nến số {self.rng.randint(1, 60)})",
                "Thêm 1 bộ nến và dao cắt bánh",
                "Không viết chữ, đóng hộp đẹp giúp mình",
                f"Viết chữ: Mừng sinh nhật bé {given}",
            ])
        if r < 0.65:
            return self.rng.choice(GENERIC_NOTES)
        return None

    # ----- khuyến mãi (giống ClientPromotionService.calculate_discount) -----
    @staticmethod
    def discount_for(promo: dict, total: Decimal) -> Optional[Decimal]:
        tiers = [t for t in promo["tiers"] if total >= t[0]]
        if not tiers:
            return None
        _, pct, cap = max(tiers, key=lambda t: t[0])
        d = total * pct / Decimal("100")
        if cap is not None and cap > 0:
            d = min(d, cap)
        return min(d, total).quantize(Decimal("1.00"))

    def apply_promo(self, o: Order):
        c = o.customer
        if c.kind == "walkin":
            return
        first_order = c.orders == 0 and c.kind == "registered"
        options = []
        for pid, p in self.promos.items():
            if not p["active"] or not (p["start"] <= o.order_date <= p["end"]):
                continue
            if (c.customer_id, pid) in self.promo_used:
                continue
            if p["total"] is not None and p["used"] >= p["total"]:
                continue
            d = self.discount_for(p, o.total_cost)
            if d:
                options.append((d, pid))
        if not options:
            return
        chance = 0.7 if first_order and any(self.promos[pid]["code"] == "SWEET10" for _, pid in options) else 0.25
        if o.channel == "walkin":
            chance *= 0.4
        if self.rng.random() < chance:
            o.discount, o.promotion_id = max(options)

    # ----- đơn hàng -----
    def build_orders(self):
        last_target = self.now.date() + timedelta(days=4)  # gồm đơn đặt trước cho vài ngày tới
        total_days = max((self.now.date() - self.start).days, 1)
        d = self.start
        while d <= last_target:
            mult, theme = self.special(d)
            growth = 1 + 0.25 * min((d - self.start).days / total_days, 1)
            n = round(BASE_ORDERS_PER_DAY * WEEKDAY_FACTOR[d.weekday()] * growth * mult * self.rng.uniform(0.82, 1.18))
            busy = mult >= 1.4
            for _ in range(n):
                channel = self.weighted({"walkin": 0.30, "online": 0.55, "phone": 0.15})
                o = self.build_order(d, channel, theme, busy)
                if o:
                    self.orders.append(o)
            d += timedelta(days=1)

        self.orders.sort(key=lambda o: o.order_date)
        codes = set()
        for i, o in enumerate(self.orders):
            o.order_id = NEXT_ORDER_ID + i
            while True:
                code = f"DH{self.rng.getrandbits(24):06X}"
                if code not in codes:
                    codes.add(code)
                    o.code = code
                    break

    def order_time(self, pickup: datetime, channel: str, themed: bool) -> datetime:
        r = self.rng.random()
        if channel == "phone":
            if r < 0.5:
                od = pickup - self.minutes(45, 240)
            else:
                od = self.sample_time(pickup.date() - timedelta(days=self.rng.randint(1, 3)), PICKUP_HOURS)
            if od.time() < OPEN:
                od = pickup - self.minutes(30, 45)
        else:
            pre_share = 0.5 if themed else 0.3
            if r < 0.28:
                od = pickup - self.minutes(30, 90)
            elif r < 1 - pre_share:
                od = pickup - self.minutes(120, 480)
                if od.time() < time(6, 30):  # đặt từ tối hôm trước
                    od = datetime.combine(pickup.date() - timedelta(days=1), time(self.rng.randint(19, 22), self.rng.randint(0, 59)))
            else:
                od = self.sample_time(pickup.date() - timedelta(days=self.rng.randint(1, 4 if themed else 3)), BROWSE_HOURS)
        if od < self.start_dt or od >= pickup - timedelta(minutes=20):
            od = pickup - self.minutes(30, 60)
        return od.replace(second=self.rng.randint(0, 59))

    def build_order(self, day: date, channel: str, theme: Optional[str], busy: bool) -> Optional[Order]:
        rng = self.rng
        pickup = self.sample_time(day, PICKUP_HOURS)
        od = pickup if channel == "walkin" else self.order_time(pickup, channel, theme is not None)
        if od > self.now:
            return None

        # Khách & người nhận
        proxy = False
        if channel == "walkin":
            customer = self.walk_in if rng.random() < 0.85 else self.pick_customer(od)
        elif channel == "online":
            customer = self.pick_customer(od)
        else:
            customer = self.pick_customer(od) if rng.random() < 0.5 else self.pick_guest(od)
        if customer.kind == "walkin":
            r_name, r_phone = "Khách vãng lai", WALK_IN_PHONE
        elif channel != "walkin" and rng.random() < 0.15:
            proxy = True
            first, last = self.new_name()
            r_name, r_phone = f"{first} {last}", self.new_phone()
        else:
            r_name, r_phone = customer.full_name, customer.phone

        lines = self.pick_lines(channel, theme, day.month)
        has_mousse = any(self.products[pid].category_id == MOUSSE for pid, _ in lines)
        if customer.kind == "walkin":
            notes = rng.choice(["Không lấy dao nĩa nhựa", "Lấy giúp túi giấy", "Thêm 1 bộ nến và dao cắt bánh"]) if rng.random() < 0.1 else None
        elif channel == "walkin" and rng.random() < 0.9:
            notes = None
        else:
            notes = self.order_notes(has_mousse, theme, r_name.split()[-1], proxy)

        method = self.weighted({
            "walkin": {"COD": 55, "Banking": 25, "Momo": 12, "Credit Card": 8},
            "online": {"COD": 35, "Banking": 25, "VNPay": 20, "Momo": 15, "Credit Card": 5},
            "phone": {"COD": 60, "Banking": 30, "Credit Card": 10},
        }[channel])
        o = Order(channel, customer, r_name, r_phone, od, pickup, notes, lines, method)
        self.apply_promo(o)
        self.build_timeline(o, busy)

        # Cắt các mốc chưa xảy ra
        o.events = [e for e in o.events if e.at <= self.now]
        if not o.events:
            return None
        o.cancelled = o.events[-1].new == "Cancelled"
        if o.promotion_id and not o.cancelled:
            self.promo_used.add((customer.customer_id, o.promotion_id))
            self.promos[o.promotion_id]["used"] += 1
        customer.orders += 1
        return o

    def build_timeline(self, o: Order, busy: bool):
        rng, ev = self.rng, o.events
        od, pickup = o.order_date, o.pickup

        if o.channel == "walkin":
            ev.append(Event(od, self.staff_on(od, busy), None, "Completed",
                            "Nhân viên tạo đơn và giao bánh trực tiếp tại quầy", "create"))
            o.paid_at = od
            return

        if o.channel == "online":
            ev.append(Event(od, "Hệ thống", None, "Pending", "Khách hàng tạo đơn hàng mới", "create"))
            if o.payment_method == "Banking":  # chuyển khoản mô phỏng: coi như đã thanh toán ngay
                o.paid_at = od
            accept = self.open_at(od + self.minutes(3, 25))
            if o.payment_method in ("Momo", "VNPay"):
                o.paid_at = accept
                ev.append(Event(accept, self.staff_on(accept, busy), "Pending", "Pending", "Xác nhận đã thanh toán", "payment"))
                accept += self.minutes(1, 4)
            if pickup.date() > accept.date():  # đặt trước: sáng ngày lấy bánh mới làm
                proc = max(datetime.combine(pickup.date(), OPEN) + self.minutes(0, 30), pickup - self.minutes(90, 240))
            else:
                proc = accept
            ev.append(Event(proc, self.staff_on(proc, busy), "Pending", "Processing", rng.choice(PROCESSING_NOTES), "status"))
        else:  # phone
            if o.payment_method == "Banking":
                o.paid_at = od
            proc = od
            ev.append(Event(od, self.staff_on(od, busy), None, "Processing",
                            "Nhân viên nhận đơn qua điện thoại và đã xác nhận với khách", "create"))

        ready = max(proc + self.minutes(15, 45), pickup - self.minutes(5, 35))
        ev.append(Event(ready, self.staff_on(ready, busy), "Processing", "Ready", rng.choice(READY_NOTES), "status"))
        done = max(ready + self.minutes(2, 10), pickup + self.minutes(-5, 30))
        if rng.random() < 0.1:  # khách tới trễ, bánh nằm chờ ở quầy
            done = max(done, min(pickup + self.minutes(60, 240), datetime.combine(pickup.date(), time(21, 58))))
        if o.payment_method == "Credit Card":
            o.paid_at = done - timedelta(minutes=1)
            ev.append(Event(o.paid_at, self.staff_on(done, busy), "Ready", "Ready", "Khách thanh toán bằng thẻ tại quầy", "payment"))
        done_note = None
        if o.payment_method == "COD":
            o.paid_at = done
            done_note = "Đã thu tiền mặt khi giao bánh"
        ev.append(Event(done, self.staff_on(done, busy), "Ready", "Completed", done_note, "status"))

        # Hủy đơn
        cancel_rate = 0.07 if o.channel == "online" else 0.04
        if rng.random() < cancel_rate:
            stages = {"Pending": 55, "Processing": 25, "Ready": 20} if o.channel == "online" else {"Processing": 60, "Ready": 40}
            stage = self.weighted(stages)
            if stage == "Pending":
                at = self.open_at(od + self.minutes(10, max(15, int((proc - od).total_seconds() // 60) - 5)))
                at = min(at, proc - timedelta(minutes=1))
            elif stage == "Processing":
                at = proc + timedelta(minutes=max(1, (ready - proc).total_seconds() / 60 * rng.uniform(0.2, 0.8)))
            else:
                at = max(ready + self.minutes(30, 60), min(pickup + self.minutes(120, 180), datetime.combine(pickup.date(), time(21, 45))))
            at = max(at, od + timedelta(minutes=2))
            kept = [e for e in ev if e.at < at and (e.kind != "status" or self._before_stage(e.new, stage))]
            note = rng.choice(CANCEL_NOTES[stage])
            if o.payment_method in ("COD", "Credit Card"):  # trả tại quầy khi nhận bánh: chưa thu đồng nào
                o.paid_at = None
                kept = [e for e in kept if e.kind != "payment"]
            elif o.paid_at and o.paid_at < at:
                note += " · Đã hoàn tiền cho khách"
            else:
                o.paid_at = None
            kept.append(Event(at, self.staff_on(at, busy), stage, "Cancelled", note, "status"))
            o.events[:] = kept
            o.cancelled = True

        # Mốc thời gian tăng dần
        for i in range(1, len(ev)):
            if ev[i].at <= ev[i - 1].at:
                ev[i].at = ev[i - 1].at + timedelta(minutes=1)

    @staticmethod
    def _before_stage(new_status: str, stage: str) -> bool:
        order = ["Pending", "Processing", "Ready", "Completed"]
        return order.index(new_status) <= order.index(stage)

    def status_of(self, o: Order) -> Tuple[str, str]:
        status = [e for e in o.events if e.kind != "payment"][-1].new
        if status == "Cancelled":
            if o.paid_at and o.payment_method != "COD" and o.paid_at <= o.events[-1].at:
                return status, "Refunded"
            return status, "Unpaid"
        paid = o.paid_at is not None and o.paid_at <= self.now
        return status, "Paid" if paid else "Unpaid"

    # ----- nhập hàng -----
    def build_receipts(self):
        demand: Dict[int, Dict[date, Dict[Tuple[int, int], int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        for o in self.orders:
            if o.cancelled:
                continue
            for (pid, sid), (qty, _, _) in o.lines.items():
                demand[SUPPLIER_OF[self.products[pid].category_id]][o.pickup.date()][(pid, sid)] += qty

        for p in self.products.values():
            for sid, price in p.sizes.items():
                ratio = IMPORT_RATIO[p.category_id] + self.rng.uniform(-0.02, 0.02)
                self.import_price[(p.product_id, sid)] = Decimal(round(float(price) * ratio / 1000) * 1000)

        horizon = self.now.date() + timedelta(days=4)
        drafts = []
        for supplier, weekdays in SUPPLIER_DAYS.items():
            days = [self.start] + [
                self.start + timedelta(days=i) for i in range(1, (self.now.date() - self.start).days + 1)
                if (self.start + timedelta(days=i)).weekday() in weekdays
            ]
            for i, d in enumerate(days):
                until = days[i + 1] if i + 1 < len(days) else horizon
                need: Dict[Tuple[int, int], int] = defaultdict(int)
                x = d
                while x < until:
                    for key, qty in demand[supplier][x].items():
                        need[key] += qty
                    x += timedelta(days=1)
                items = []
                for key, qty in sorted(need.items()):
                    # Dự phòng 3-12%; chỉ làm tròn theo lốc khi số lượng lớn để không nhập dư món bán chậm
                    step = 1 if qty < 10 else (2 if self.products[key[0]].category_id == MOUSSE else 5)
                    q = math.ceil(qty * self.rng.uniform(1.03, 1.12) / step) * step
                    items.append((key, q))
                if not items:
                    continue
                h1, m1, h2, m2 = SUPPLIER_HOURS[supplier]
                at = datetime.combine(d, time(h1, m1)) + timedelta(minutes=self.rng.randint(0, (h2 - h1) * 60 + m2 - m1))
                drafts.append({"supplier": supplier, "at": at, "items": items, "until": until, "status": "Completed"})

        # 2 phiếu bị hủy rồi lập lại, phiếu hôm nay chưa tới giờ giao thì chờ giao
        done = [r for r in drafts if r["at"].date() < self.now.date()]
        for r in self.rng.sample(done, k=min(2, len(done))):
            drafts.append({
                "supplier": r["supplier"], "at": r["at"] - self.minutes(20, 40),
                "items": [(k, max(2, q // 2)) for k, q in r["items"][: max(1, len(r["items"]) // 2)]],
                "until": r["until"], "status": "Cancelled",
                "note": self.rng.choice([
                    "Hàng giao không đạt chất lượng (hộp móp, kem chảy), trả lại NCC và hủy phiếu",
                    "Lập nhầm số lượng, hủy phiếu để lập lại",
                ]),
            })
        for r in drafts:
            if r["at"] > self.now:
                r["status"] = "Pending"
                r["note"] = "Nhà cung cấp hẹn giao trong ngày, chờ kiểm hàng"

        drafts.sort(key=lambda r: r["at"])
        for i, r in enumerate(drafts):
            r["import_id"] = NEXT_IMPORT_ID + i
            r["code"] = f"PN{NEXT_IMPORT_NO + i:03d}"
            r["details"] = [(pid, sid, q, self.import_price[(pid, sid)]) for (pid, sid), q in r["items"]]
            r["total"] = sum((Decimal(q) * price for _, _, q, price in r["details"]), Decimal("0.00"))
            if "note" not in r:
                r["note"] = self.receipt_note(r)
            self.receipts.append(r)

    def receipt_note(self, r: dict) -> str:
        d, until = r["at"].date(), r["until"]
        themed = {t for x in range((until - d).days) if (t := self.special(d + timedelta(days=x))[1])}
        event = {"2010": "20/10", "2011": "20/11", "trungthu": "Trung thu", "valentine": "Valentine", "0803": "8/3"}
        extra = f", nhập thêm phục vụ dịp {', '.join(event[t] for t in sorted(themed))}" if themed else ""
        if r["supplier"] == 1:
            part = "đầu tuần" if d.weekday() < 3 else "cuối tuần"
            return f"Nhập bánh mousse các vị cho {part}{extra}"
        if r["supplier"] == 2:
            return f"Nhập mẻ croissant bơ Pháp mới nướng ({d:%d/%m} - {until - timedelta(days=1):%d/%m}){extra}"
        return f"Nhập nguyên liệu pha chế đồ uống tuần {d:%d/%m}{extra}"


# ---------------------------------------------------------------------------
# Xuất SQL
# ---------------------------------------------------------------------------
def q(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, datetime):
        return f"'{v:%Y-%m-%d %H:%M:%S}'"
    if isinstance(v, Decimal):
        return f"{v:.2f}"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"


def insert(out: List[str], table: str, cols: List[str], rows: List[tuple], chunk: int = 250):
    for i in range(0, len(rows), chunk):
        values = ",\n".join("(" + ", ".join(q(v) for v in row) + ")" for row in rows[i:i + chunk])
        out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES\n{values};\n")


def write_sql(g: Generator) -> dict:
    out: List[str] = []
    people = g.staff_customers + [g.walk_in] + [c for c in g.customers if c.kind == "registered"] + g.guests
    people.sort(key=lambda c: c.customer_id)

    user_rows = []
    for c in people:
        role = "staff" if c.kind == "staff" else "customer"
        pw = NO_LOGIN_PASSWORD if c.kind in ("walkin", "guest") else PASSWORD_123
        user_rows.append((c.phone, c.email, pw, role, "active", c.created_at, c.created_at))
    customer_rows = [(c.customer_id, c.phone, c.first, c.last, c.created_at, c.created_at) for c in people]

    supplier_rows = [(NEW_SUPPLIER_ID, "NCC003", "Công ty TNHH Nguyên Liệu Pha Chế Hương Trà", "Ngô Thanh Tùng",
                      "02837775555", "huongtra.supply@gmail.com", "88 Lê Văn Việt, TP. Thủ Đức, TP.HCM", "Active",
                      datetime(2026, 5, 20, 9, 0), datetime(2026, 5, 20, 9, 0))]
    receipt_rows, receipt_detail_rows = [], []
    for r in g.receipts:
        receipt_rows.append((r["import_id"], r["code"], r["supplier"], r["total"], r["at"], r["status"], r["note"], r["at"], r["at"]))
        for pid, sid, qty, price in r["details"]:
            receipt_detail_rows.append((r["import_id"], pid, sid, qty, price, Decimal(qty) * price, None))

    order_rows, detail_rows, promo_rows, log_rows, notif_rows = [], [], [], [], []
    stats = defaultdict(int)
    for o in g.orders:
        status, pay = g.status_of(o)
        stats[status] += 1
        final = max(Decimal("0.00"), o.total_cost - o.discount)
        last = o.events[-1].at
        order_rows.append((o.order_id, o.code, o.customer.customer_id, o.recipient_name, o.recipient_phone, o.pickup,
                           o.notes, o.promotion_id, o.discount, o.total_quantity, o.total_cost, final,
                           o.payment_method, pay, status, o.order_date, last))
        for (pid, sid), (qty, price, note) in o.lines.items():
            detail_rows.append((o.order_id, pid, sid, qty, price, note))
        if o.promotion_id:
            promo_rows.append((o.order_id, o.promotion_id, o.discount, o.order_date))
        for e in o.events:
            log_rows.append((o.order_id, e.by, e.old, e.new, e.note, e.at))
            if o.customer.kind == "walkin":
                continue
            read = e.at < g.now - timedelta(days=2) or g.rng.random() < 0.4
            if e.kind == "status":
                msg = f"Đơn hàng #{o.code}: {STATUS_LABELS[e.new]}." + (f" Ghi chú: {e.note}" if e.note else "")
                notif_rows.append((o.customer.phone, f"Đơn hàng #{o.code} đã cập nhật", msg, "order", o.order_id, read, e.at))
            elif e.kind == "create" and o.channel == "phone" and o.customer.kind != "guest":
                money = f"{final:,.0f}".replace(",", ".")
                pay_text = "Đã thanh toán." if o.payment_method == "Banking" else "Thanh toán khi nhận bánh."
                msg = (f"Tiệm đã nhận đơn đặt qua điện thoại của bạn: {o.total_quantity} bánh, tổng {money}đ. "
                       f"Hẹn lấy bánh lúc {o.pickup:%H:%M %d/%m/%Y}. {pay_text}")
                notif_rows.append((o.customer.phone, f"Đơn hàng #{o.code} đã được xác nhận", msg, "order", o.order_id, read, e.at))

    out.append(f"""-- ==============================================================================
-- DỮ LIỆU 3 THÁNG GẦN NHẤT ({g.start:%d/%m/%Y} - {g.now:%d/%m/%Y %H:%M}) cho THE SWEETS
-- Sinh tự động bởi database/generate_recent_data.py — đừng sửa tay, chạy lại script để sinh mới.
--
-- Chạy SAU data.sql (dùng tiếp ID của dữ liệu mẫu). Nạp vào DB đang chạy:
--   docker cp database/data_recent.sql thesweets_db:/tmp/data_recent.sql
--   docker exec thesweets_db sh -c 'mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" thesweets_db < /tmp/data_recent.sql'
-- Nạp lại từ đầu: chạy data.sql (xóa sạch & nạp mẫu) rồi chạy file này.
--
-- Tài khoản nhân viên (mật khẩu 123): {', '.join(f'{s[0]} ({s[2]} {s[3]})' for s in STAFF)}
-- Khách hàng có tài khoản cũng dùng mật khẩu 123.
-- ==============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
START TRANSACTION;

-- Tài khoản mẫu của data.sql nhận created_at lúc nạp DB: lùi về đầu năm cho khớp lịch sử đơn hàng
UPDATE users SET created_at = '{SEED_ACCOUNTS_CREATED:%Y-%m-%d %H:%M:%S}', updated_at = '{SEED_ACCOUNTS_CREATED:%Y-%m-%d %H:%M:%S}'
WHERE phone IN ({', '.join(q(p) for p in [ADMIN_PHONE] + [c[1] for c in EXISTING_CUSTOMERS])});
UPDATE customers SET created_at = '{SEED_ACCOUNTS_CREATED:%Y-%m-%d %H:%M:%S}', updated_at = '{SEED_ACCOUNTS_CREATED:%Y-%m-%d %H:%M:%S}'
WHERE customer_id IN ({', '.join(str(c[0]) for c in EXISTING_CUSTOMERS)});
""")
    sections = [
        ("Tài khoản (nhân viên, khách hàng, khách vãng lai, khách đặt qua điện thoại)", "users",
         ["phone", "email", "password", "role", "status", "created_at", "updated_at"], user_rows),
        ("Hồ sơ khách hàng", "customers", ["customer_id", "phone", "first_name", "last_name", "created_at", "updated_at"], customer_rows),
        ("Nhà cung cấp đồ uống", "suppliers",
         ["supplier_id", "supplier_code", "supplier_name", "contact_name", "phone", "email", "address", "status", "created_at", "updated_at"],
         supplier_rows),
        ("Phiếu nhập hàng", "import_receipts",
         ["import_id", "import_code", "supplier_id", "total_amount", "import_date", "status", "notes", "created_at", "updated_at"], receipt_rows),
        ("Chi tiết phiếu nhập", "import_receipt_details",
         ["import_id", "product_id", "size_id", "quantity", "import_price", "total_price", "note"], receipt_detail_rows),
        ("Đơn hàng", "orders",
         ["order_id", "order_code", "customer_id", "recipient_name", "recipient_phone", "pickup_time", "notes", "promotion_id",
          "discount_amount", "total_quantity", "total_cost", "final_cost", "payment_method", "payment_status", "status",
          "order_date", "updated_at"], order_rows),
        ("Chi tiết đơn hàng", "order_detail", ["order_id", "product_id", "size_id", "quantity", "price", "note"], detail_rows),
        ("Khuyến mãi đã áp dụng", "order_promotions", ["order_id", "promotion_id", "discount_amount", "applied_at"], promo_rows),
        ("Lịch sử trạng thái đơn hàng", "order_status_logs",
         ["order_id", "changed_by", "old_status", "new_status", "note", "changed_at"], log_rows),
        ("Thông báo cho khách", "notifications",
         ["phone", "title", "message", "type", "reference_id", "is_read", "created_at"], notif_rows),
    ]
    for title, table, cols, rows in sections:
        out.append(f"\n-- {title}: {len(rows)} dòng\n")
        insert(out, table, cols, rows)
    out.append("\nCOMMIT;\n")
    OUT_SQL.write_text("".join(out), encoding="utf-8", newline="\n")

    return {
        "users": len(user_rows), "orders": len(order_rows), "order_detail": len(detail_rows),
        "status_logs": len(log_rows), "notifications": len(notif_rows), "import_receipts": len(receipt_rows),
        "promotions_used": len(promo_rows), **{f"status.{k}": v for k, v in sorted(stats.items())},
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--end", help='Mốc "bây giờ" (YYYY-MM-DD HH:MM), mặc định thời điểm chạy')
    ap.add_argument("--months", type=int, default=3)
    ap.add_argument("--seed", type=int, default=2026)
    args = ap.parse_args()
    now = datetime.fromisoformat(args.end) if args.end else datetime.now().replace(second=0, microsecond=0)

    g = Generator(now, args.months, args.seed)
    g.build_people()
    g.build_orders()
    g.build_receipts()
    stats = write_sql(g)
    print(f"Đã ghi {OUT_SQL} ({g.start:%d/%m/%Y} -> {now:%d/%m/%Y %H:%M})")
    for k, v in stats.items():
        print(f"  {k:<22}{v}")


if __name__ == "__main__":
    main()
