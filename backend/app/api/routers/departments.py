from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import Department, DepartmentMembership, Organization, UserRole
from app.schemas import DepartmentCreate, DepartmentOut, DepartmentUpdate, MessageOut
from app.services import build_department_out, manageable_org_ids, organization_ids_for_user

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    current_user: CurrentUser,
    db: DbSession,
    organization_ids: list[str] = Query(default=[]),
) -> list[DepartmentOut]:
    query = select(Department)

    if current_user.role == UserRole.app_admin:
        allowed_org_ids: set[str] | None = None
    elif current_user.role == UserRole.org_admin:
        allowed_org_ids = manageable_org_ids(db, current_user)
    else:
        allowed_org_ids = organization_ids_for_user(db, current_user)

    if allowed_org_ids is not None:
        if not allowed_org_ids:
            return []
        query = query.where(Department.organization_id.in_(allowed_org_ids))

    if organization_ids:
        query = query.where(Department.organization_id.in_(organization_ids))

    if current_user.role == UserRole.user:
        member_dept_ids = db.scalars(
            select(DepartmentMembership.department_id).where(DepartmentMembership.user_id == current_user.id)
        ).all()
        if not member_dept_ids:
            return []
        query = query.where(Department.id.in_(member_dept_ids))

    departments = db.scalars(query.order_by(Department.name)).all()
    return [build_department_out(db, department) for department in departments]


def _assert_can_manage_organization(current_user: CurrentUser, db: DbSession, organization_id: str) -> None:
    if current_user.role == UserRole.app_admin:
        if not db.scalar(select(Organization.id).where(Organization.id == organization_id)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return

    allowed_org_ids = manageable_org_ids(db, current_user)
    if organization_id not in allowed_org_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this organization",
        )


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> DepartmentOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can create departments")

    _assert_can_manage_organization(current_user, db, payload.organization_id)

    department = Department(
        name=payload.name.strip(),
        description=payload.description,
        organization_id=payload.organization_id,
        manager_id=payload.manager_id,
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return build_department_out(db, department)


@router.patch("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> DepartmentOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can update departments")

    department = db.scalar(select(Department).where(Department.id == department_id))
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    _assert_can_manage_organization(current_user, db, department.organization_id)

    if payload.name is not None:
        department.name = payload.name.strip()
    if payload.description is not None:
        department.description = payload.description
    if payload.manager_id is not None:
        department.manager_id = payload.manager_id

    db.add(department)
    db.commit()
    db.refresh(department)
    return build_department_out(db, department)


@router.delete("/{department_id}", response_model=MessageOut)
def delete_department(department_id: str, current_user: CurrentUser, db: DbSession) -> MessageOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can delete departments")

    department = db.scalar(select(Department).where(Department.id == department_id))
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    _assert_can_manage_organization(current_user, db, department.organization_id)
    db.delete(department)
    db.commit()
    return MessageOut(message="Department deleted successfully")
