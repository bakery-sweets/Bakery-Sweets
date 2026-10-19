from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User
from app.services.admin.employee_service import AdminEmployeeService
from app.schemas.admin.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.schemas.common import ResponseBase

router = APIRouter()

def _to_emp_out(e) -> EmployeeOut:
    return EmployeeOut(
        employee_id=e.employee_id,
        employee_code=e.employee_code,
        first_name=e.first_name,
        last_name=e.last_name,
        phone=e.phone,
        position=e.position,
        department_name=e.department.department_name if e.department else None,
        status=e.status,
        hire_date=e.hire_date,
    )

@router.get("", response_model=ResponseBase[List[EmployeeOut]], summary="Danh sách nhân viên")
def list_employees(
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    employees = AdminEmployeeService.get_all(db, department_id=department_id)
    return ResponseBase(data=[_to_emp_out(e) for e in employees])

@router.get("/{employee_id}", response_model=ResponseBase[EmployeeOut], summary="Xem thông tin nhân viên")
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    emp = AdminEmployeeService.get_by_id(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    return ResponseBase(data=_to_emp_out(emp))

@router.post("", response_model=ResponseBase[EmployeeOut], status_code=status.HTTP_201_CREATED, summary="Thêm nhân viên mới")
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    emp = AdminEmployeeService.create(db, data)
    return ResponseBase(message="Thêm nhân viên thành công", data=_to_emp_out(emp))

@router.put("/{employee_id}", response_model=ResponseBase[EmployeeOut], summary="Cập nhật nhân viên")
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    emp = AdminEmployeeService.update(db, employee_id, data)
    if not emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên để cập nhật")
    return ResponseBase(message="Cập nhật thông tin nhân viên thành công", data=_to_emp_out(emp))

@router.delete("/{employee_id}", response_model=ResponseBase, summary="Xóa nhân viên")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    success = AdminEmployeeService.delete(db, employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên để xóa")
    return ResponseBase(message="Xóa nhân viên thành công")
