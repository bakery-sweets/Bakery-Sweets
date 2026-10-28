from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Union

Number = Union[int, float, Decimal]

DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
GROUP_UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]

def to_int(value: Optional[Number]) -> int:
    return int(Decimal(str(value or 0)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def money(value: Optional[Number], unit: str = " đ") -> str:
    """130000 -> '130.000 đ' (dấu chấm ngăn cách hàng nghìn như cách viết ở Việt Nam)"""
    return f"{to_int(value):,}".replace(",", ".") + unit

def date_time(value: Optional[datetime]) -> str:
    return value.strftime("%H:%M %d/%m/%Y") if value else "—"

def date_only(value: Optional[datetime]) -> str:
    return value.strftime("%d/%m/%Y") if value else "—"

def _read_group(n: int, full: bool) -> List[str]:
    """Đọc nhóm 3 chữ số; full=True khi không phải nhóm đầu (đọc cả 'không trăm', 'linh')"""
    hundreds, tens, units = n // 100, n // 10 % 10, n % 10
    words: List[str] = []
    if hundreds or full:
        words += [DIGITS[hundreds], "trăm"]
    if tens == 0:
        if units and (hundreds or full):
            words.append("linh")
    elif tens == 1:
        words.append("mười")
    else:
        words += [DIGITS[tens], "mươi"]
    if units:
        if units == 1 and tens > 1:
            words.append("mốt")
        elif units == 5 and tens > 0:
            words.append("lăm")
        elif units == 4 and tens > 1:
            words.append("tư")
        else:
            words.append(DIGITS[units])
    return words

def money_in_words(value: Optional[Number]) -> str:
    """1250000 -> 'Một triệu hai trăm năm mươi nghìn đồng'"""
    n = to_int(value)
    if n <= 0:
        return "Không đồng"
    groups = []
    while n:
        groups.append(n % 1000)
        n //= 1000
    words: List[str] = []
    for i in reversed(range(len(groups))):
        if groups[i] == 0:
            continue
        words += _read_group(groups[i], full=i < len(groups) - 1)
        if GROUP_UNITS[i]:
            words.append(GROUP_UNITS[i])
    text = " ".join(words)
    return text[0].upper() + text[1:] + " đồng"
