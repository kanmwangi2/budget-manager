from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.security import get_password_hash
from app.dependencies import CurrentUser, DbSession
from app.models import (
    Department,
    DepartmentMembership,
    Organization,
    OrganizationMembership,
    User,
    UserRole,
    default_preferences,
)
from app.schemas import MessageOut, UserCreate, UserListItem, UserOut, UserStatusUpdate, UserUpdate
from app.services import (
    build_user_list_item,
    build_user_out,
    can_manage_users,
    manageable_org_ids,
    organization_ids_for_user,
)

router = APIRouter(prefix="/users", tags=["users"])


def _assert_user_management_permissions(current_user: User) -> None:
    if not can_manage_users(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _ensure_orgs_allowed_for_actor(
    db: DbSession,
    current_user: User,
    organization_ids: list[str],
) -> None:
    if current_user.role == UserRole.app_admin:
        existing = set(db.scalars(select(Organization.id).where(Organization.id.in_(organization_ids))).all())
        missing = sorted(set(organization_ids) - existing)
        if missing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown organizations: {', '.join(missing)}")
        return

    allowed = manageable_org_ids(db, current_user)
    invalid = sorted(set(organization_ids) - allowed)
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You can only assign organizations you administrate: {', '.join(invalid)}",
        )


def _ensure_departments_belong_to_orgs(
    db: DbSession,
    department_ids: list[str],
    organization_ids: list[str],
) -> None:
    if not department_ids:
        return

    departments = db.scalars(select(Department).where(Department.id.in_(department_ids))).all()
    existing = {department.id for department in departments}
    missing = sorted(set(department_ids) - existing)
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown departments: {', '.join(missing)}")

    allowed_orgs = set(organization_ids)
    mismatched = sorted(department.id for department in departments if department.organization_id not in allowed_orgs)
    if mismatched:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Departments must belong to selected organizations: {', '.join(mismatched)}",
        )


def _assert_target_manageable(db: DbSession, current_user: User, target_user: User) -> None:
    if current_user.role == UserRole.app_admin:
        return

    actor_org_ids = manageable_org_ids(db, current_user)
    target_org_ids = organization_ids_for_user(db, target_user)
    if not actor_org_ids.intersection(target_org_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage users in organizations you administrate",
        )


@router.get("", response_model=list[UserListItem])
def list_users(
    current_user: CurrentUser,
    db: DbSession,
    role: UserRole | None = Query(default=None),
    organization_id: str | None = Query(default=None),
) -> list[UserListItem]:
    _assert_user_management_permissions(current_user)

    if current_user.role == UserRole.app_admin:
        if organization_id:
            user_ids = set(
                db.scalars(
                    select(OrganizationMembership.user_id).where(
                        OrganizationMembership.organization_id == organization_id
                    )
                ).all()
            )
            if not user_ids:
                return []
            query = select(User).where(User.id.in_(user_ids))
        else:
            query = select(User)

        if role:
            query = query.where(User.role == role)
        users = db.scalars(query.order_by(User.name)).all()
        return [build_user_list_item(db, user) for user in users]

    org_ids = manageable_org_ids(db, current_user)
    if not org_ids:
        return []

    if organization_id:
        if organization_id not in org_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage users in organizations you administrate",
            )
        org_ids = {organization_id}

    user_ids = set(
        db.scalars(
            select(OrganizationMembership.user_id).where(OrganizationMembership.organization_id.in_(org_ids))
        ).all()
    )
    if not user_ids:
        return []

    query = select(User).where(User.id.in_(user_ids))
    if role:
        query = query.where(User.role == role)

    users = db.scalars(query.order_by(User.name)).all()
    return [build_user_list_item(db, user) for user in users]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, current_user: CurrentUser, db: DbSession) -> UserOut:
    _assert_user_management_permissions(current_user)

    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    if current_user.role == UserRole.org_admin and payload.role == UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Org admins cannot create app admins")

    _ensure_orgs_allowed_for_actor(db, current_user, payload.organization_ids)
    _ensure_departments_belong_to_orgs(db, payload.department_ids, payload.organization_ids)

    new_user = User(
        email=email,
        name=payload.name.strip(),
        role=payload.role,
        avatar=payload.avatar,
        is_active=payload.is_active,
        password_hash=get_password_hash(payload.password),
        preferences=default_preferences(),
    )
    db.add(new_user)
    db.flush()

    for organization_id in sorted(set(payload.organization_ids)):
        db.add(
            OrganizationMembership(
                user_id=new_user.id,
                organization_id=organization_id,
                is_admin=payload.role == UserRole.org_admin,
            )
        )

    for department_id in sorted(set(payload.department_ids)):
        db.add(DepartmentMembership(user_id=new_user.id, department_id=department_id))

    db.commit()
    db.refresh(new_user)
    return build_user_out(db, new_user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, current_user: CurrentUser, db: DbSession) -> UserOut:
    _assert_user_management_permissions(current_user)

    target_user = db.scalar(select(User).where(User.id == user_id))
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _assert_target_manageable(db, current_user, target_user)

    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates and current_user.role == UserRole.org_admin and updates["role"] == UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Org admins cannot promote to app admin")

    if "email" in updates:
        normalized_email = updates["email"].lower()
        existing = db.scalar(select(User).where(User.email == normalized_email, User.id != target_user.id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        target_user.email = normalized_email

    if "name" in updates:
        target_user.name = updates["name"].strip()
    if "role" in updates:
        target_user.role = updates["role"]
    if "avatar" in updates:
        target_user.avatar = updates["avatar"]
    if "is_active" in updates:
        target_user.is_active = updates["is_active"]
    if "preferences" in updates and updates["preferences"] is not None:
        target_user.preferences = updates["preferences"]

    if "organization_ids" in updates and updates["organization_ids"] is not None:
        organization_ids = updates["organization_ids"]
        _ensure_orgs_allowed_for_actor(db, current_user, organization_ids)
        target_org_ids = set(organization_ids)

        existing_memberships = db.scalars(
            select(OrganizationMembership).where(OrganizationMembership.user_id == target_user.id)
        ).all()
        existing_map = {membership.organization_id: membership for membership in existing_memberships}

        for organization_id in list(existing_map.keys()):
            if organization_id not in target_org_ids:
                db.delete(existing_map[organization_id])

        for organization_id in target_org_ids:
            membership = existing_map.get(organization_id)
            if membership:
                membership.is_admin = target_user.role == UserRole.org_admin
            else:
                db.add(
                    OrganizationMembership(
                        user_id=target_user.id,
                        organization_id=organization_id,
                        is_admin=target_user.role == UserRole.org_admin,
                    )
                )

        # Remove department assignments that no longer belong to selected organizations.
        if target_org_ids:
            valid_department_ids = set(
                db.scalars(select(Department.id).where(Department.organization_id.in_(target_org_ids))).all()
            )
            stale_memberships = db.scalars(
                select(DepartmentMembership).where(
                    DepartmentMembership.user_id == target_user.id,
                    DepartmentMembership.department_id.not_in(valid_department_ids) if valid_department_ids else True,
                )
            ).all()
            for membership in stale_memberships:
                db.delete(membership)

    if "department_ids" in updates and updates["department_ids"] is not None:
        department_ids = updates["department_ids"]
        active_org_ids = list(
            db.scalars(
                select(OrganizationMembership.organization_id).where(OrganizationMembership.user_id == target_user.id)
            ).all()
        )
        _ensure_departments_belong_to_orgs(db, department_ids, active_org_ids)

        db.query(DepartmentMembership).filter(DepartmentMembership.user_id == target_user.id).delete()
        for department_id in sorted(set(department_ids)):
            db.add(DepartmentMembership(user_id=target_user.id, department_id=department_id))

    db.add(target_user)
    db.commit()
    db.refresh(target_user)
    return build_user_out(db, target_user)


@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(user_id: str, payload: UserStatusUpdate, current_user: CurrentUser, db: DbSession) -> UserOut:
    _assert_user_management_permissions(current_user)

    target_user = db.scalar(select(User).where(User.id == user_id))
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _assert_target_manageable(db, current_user, target_user)
    target_user.is_active = payload.is_active
    db.add(target_user)
    db.commit()
    db.refresh(target_user)
    return build_user_out(db, target_user)


@router.delete("/{user_id}", response_model=MessageOut)
def delete_user(user_id: str, current_user: CurrentUser, db: DbSession) -> MessageOut:
    _assert_user_management_permissions(current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    target_user = db.scalar(select(User).where(User.id == user_id))
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.role == UserRole.app_admin and current_user.role != UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only app admins can delete app admins")

    _assert_target_manageable(db, current_user, target_user)
    db.delete(target_user)
    db.commit()
    return MessageOut(message="User deleted successfully")
