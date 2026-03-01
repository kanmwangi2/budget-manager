from __future__ import annotations

from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import (
    Department,
    DepartmentMembership,
    Donor,
    Organization,
    OrganizationMembership,
    User,
    UserRole,
    default_org_settings,
    default_org_subscription,
    default_preferences,
)
from app.schemas import (
    DepartmentBrief,
    DepartmentOut,
    DonorOut,
    OrganizationOut,
    OrganizationSelectionOut,
    OrganizationWithStatsOut,
    UserListItem,
    UserOut,
)


def can_manage_users(user: User) -> bool:
    return user.role in {UserRole.app_admin, UserRole.org_admin}


def manageable_org_ids(db: Session, user: User) -> set[str]:
    if user.role == UserRole.app_admin:
        rows = db.scalars(select(Organization.id)).all()
        return set(rows)

    rows = db.scalars(
        select(OrganizationMembership.organization_id).where(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.is_admin.is_(True),
        )
    ).all()
    return set(rows)


def organization_ids_for_user(db: Session, user: User) -> set[str]:
    if user.role == UserRole.app_admin:
        return set(db.scalars(select(Organization.id)).all())
    return set(
        db.scalars(select(OrganizationMembership.organization_id).where(OrganizationMembership.user_id == user.id)).all()
    )


def department_ids_for_user(db: Session, user: User) -> set[str]:
    return set(db.scalars(select(DepartmentMembership.department_id).where(DepartmentMembership.user_id == user.id)).all())


def build_user_out(db: Session, user: User) -> UserOut:
    preferences = user.preferences or default_preferences()
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        avatar=user.avatar,
        created_at=user.created_at,
        last_login=user.last_login,
        is_active=user.is_active,
        organization_ids=sorted(organization_ids_for_user(db, user)),
        department_ids=sorted(department_ids_for_user(db, user)),
        preferences=preferences,
    )


def build_user_list_item(db: Session, user: User) -> UserListItem:
    user_out = build_user_out(db, user)

    org_name_rows = db.execute(
        select(Organization.id, Organization.name)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user.id)
        .order_by(Organization.name)
    ).all()
    organization_names = [row.name for row in org_name_rows]

    dept_name_rows = db.execute(
        select(Department.id, Department.name)
        .join(DepartmentMembership, DepartmentMembership.department_id == Department.id)
        .where(DepartmentMembership.user_id == user.id)
        .order_by(Department.name)
    ).all()
    department_names = [row.name for row in dept_name_rows]

    return UserListItem(**user_out.model_dump(), organization_names=organization_names, department_names=department_names)


def build_organization_out(db: Session, organization: Organization, with_stats: bool = False) -> OrganizationOut | OrganizationWithStatsOut:
    membership_rows = db.execute(
        select(OrganizationMembership.user_id, OrganizationMembership.is_admin).where(
            OrganizationMembership.organization_id == organization.id
        )
    ).all()

    admin_ids = sorted([row.user_id for row in membership_rows if row.is_admin])
    member_ids = sorted([row.user_id for row in membership_rows])

    payload = {
        "id": organization.id,
        "name": organization.name,
        "description": organization.description,
        "country": organization.country or "",
        "currency": organization.currency or "RWF",
        "admin_ids": admin_ids,
        "member_ids": member_ids,
        "settings": organization.settings or default_org_settings(),
        "subscription": organization.subscription or default_org_subscription(),
        "created_at": organization.created_at,
        "updated_at": organization.updated_at,
        "created_by": organization.created_by,
    }

    if not with_stats:
        return OrganizationOut(**payload)

    department_count = db.scalar(
        select(func.count(Department.id)).where(Department.organization_id == organization.id)
    ) or 0
    return OrganizationWithStatsOut(
        **payload,
        member_count=len(member_ids),
        admin_count=len(admin_ids),
        department_count=department_count,
    )


def build_department_out(db: Session, department: Department) -> DepartmentOut:
    member_ids = db.scalars(
        select(DepartmentMembership.user_id).where(DepartmentMembership.department_id == department.id)
    ).all()
    return DepartmentOut(
        id=department.id,
        name=department.name,
        description=department.description,
        organization_id=department.organization_id,
        manager_id=department.manager_id,
        member_ids=sorted(member_ids),
        created_at=department.created_at,
        updated_at=department.updated_at,
    )


def build_donor_out(donor: Donor) -> DonorOut:
    return DonorOut(
        id=donor.id,
        organization_id=donor.organization_id,
        name=donor.name,
        donor_type=donor.donor_type,
        email=donor.email,
        phone=donor.phone,
        currency=donor.currency or "RWF",
        total_donated=float(donor.total_donated or 0),
        status=donor.status,
        notes=donor.notes,
        created_at=donor.created_at,
        updated_at=donor.updated_at,
    )


def get_available_organizations(db: Session, user: User) -> list[OrganizationSelectionOut]:
    if user.role == UserRole.app_admin:
        orgs = db.scalars(select(Organization).order_by(Organization.name)).all()
        result: list[OrganizationSelectionOut] = []
        for org in orgs:
            departments = db.scalars(
                select(Department).where(Department.organization_id == org.id).order_by(Department.name)
            ).all()
            result.append(
                OrganizationSelectionOut(
                    id=org.id,
                    name=org.name,
                    role="admin",
                    departments=[DepartmentBrief(id=dept.id, name=dept.name) for dept in departments],
                )
            )
        return result

    memberships = db.execute(
        select(OrganizationMembership.organization_id, OrganizationMembership.is_admin)
        .where(OrganizationMembership.user_id == user.id)
        .order_by(OrganizationMembership.organization_id)
    ).all()
    if not memberships:
        return []

    result: list[OrganizationSelectionOut] = []
    dept_ids = department_ids_for_user(db, user)

    for membership in memberships:
        org = db.scalar(select(Organization).where(Organization.id == membership.organization_id))
        if not org:
            continue

        if membership.is_admin or user.role == UserRole.org_admin:
            departments = db.scalars(
                select(Department).where(Department.organization_id == org.id).order_by(Department.name)
            ).all()
        else:
            departments = db.scalars(
                select(Department)
                .where(Department.organization_id == org.id, Department.id.in_(dept_ids))
                .order_by(Department.name)
            ).all()

        result.append(
            OrganizationSelectionOut(
                id=org.id,
                name=org.name,
                role="admin" if membership.is_admin else "member",
                departments=[DepartmentBrief(id=dept.id, name=dept.name) for dept in departments],
            )
        )

    return sorted(result, key=lambda item: item.name.lower())


def ensure_ids_exist(db: Session, stmt: Select[tuple[str]], ids: Iterable[str], error_prefix: str) -> None:
    unique_ids = {item for item in ids if item}
    if not unique_ids:
        return
    found_ids = set(db.scalars(stmt.where(stmt.selected_columns[0].in_(unique_ids))).all())
    missing = unique_ids - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{error_prefix}: {', '.join(sorted(missing))}",
        )
