from typing import Optional
from pydantic import BaseModel
from datetime import date

class EmployeeCreate(BaseModel):
    user_name: Optional[str] = None
    first_name: str
    last_name: str
    phone: Optional[str] = None
    citizen_id: Optional[str] = None
    gender: str = "Male"
    date_of_birth: Optional[date] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    hire_date: date
    contract_type: str = "Full-time"
    status: str = "Active"

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    citizen_id: Optional[str] = None
    gender: Optional[str] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    status: Optional[str] = None

class EmployeeOut(BaseModel):
    employee_id: int
    employee_code: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    position: Optional[str] = None
    department_name: Optional[str] = None
    status: str
    hire_date: date
