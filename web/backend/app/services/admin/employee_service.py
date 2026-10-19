import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.admin.employee import EmployeeCreate, EmployeeUpdate

class AdminEmployeeService:
    @staticmethod
    def get_all(db: Session, department_id: Optional[int] = None) -> List[Employee]:
        query = db.query(Employee)
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        return query.order_by(Employee.employee_id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, employee_id: int) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.employee_id == employee_id).first()

    @staticmethod
    def create(db: Session, data: EmployeeCreate) -> Employee:
        emp_code = f"NV{uuid.uuid4().hex[:6].upper()}"
        employee = Employee(
            employee_code=emp_code,
            user_name=data.user_name,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            citizen_id=data.citizen_id,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            department_id=data.department_id,
            position=data.position,
            hire_date=data.hire_date,
            contract_type=data.contract_type,
            status=data.status,
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return employee

    @staticmethod
    def update(db: Session, employee_id: int, data: EmployeeUpdate) -> Optional[Employee]:
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(employee, key, value)

        db.commit()
        db.refresh(employee)
        return employee

    @staticmethod
    def delete(db: Session, employee_id: int) -> bool:
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            return False
        db.delete(employee)
        db.commit()
        return True
