from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import Organization, OrganizationMembership, UserRole, default_org_settings, default_org_subscription
from app.schemas import (
    MessageOut,
    OrganizationCreate,
    OrganizationOut,
    OrganizationSelectionOut,
    OrganizationUpdate,
    OrganizationWithStatsOut,
)
from app.services import build_organization_out, get_available_organizations, manageable_org_ids

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/available", response_model=list[OrganizationSelectionOut])
def available(current_user: CurrentUser, db: DbSession) -> list[OrganizationSelectionOut]:
    return get_available_organizations(db, current_user)


@router.get("", response_model=list[OrganizationOut | OrganizationWithStatsOut])
def list_organizations(
    current_user: CurrentUser,
    db: DbSession,
    with_stats: bool = Query(default=False),
    admin_only: bool = Query(default=False),
) -> list[OrganizationOut | OrganizationWithStatsOut]:
    if current_user.role == UserRole.app_admin:
        organizations = db.scalars(select(Organization).order_by(Organization.name)).all()
    else:
        membership_query = select(OrganizationMembership.organization_id).where(OrganizationMembership.user_id == current_user.id)
        if admin_only:
            membership_query = membership_query.where(OrganizationMembership.is_admin.is_(True))
        organization_ids = db.scalars(membership_query).all()
        if not organization_ids:
            return []
        organizations = db.scalars(
            select(Organization).where(Organization.id.in_(organization_ids)).order_by(Organization.name)
        ).all()

    return [build_organization_out(db, org, with_stats=with_stats) for org in organizations]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(payload: OrganizationCreate, current_user: CurrentUser, db: DbSession) -> OrganizationOut:
    if current_user.role != UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only app admins can create organizations")

    organization = Organization(
        name=payload.name.strip(),
        description=payload.description,
        country=payload.country,
        currency=payload.currency,
        settings=payload.settings or default_org_settings(),
        subscription=payload.subscription or default_org_subscription(),
        created_by=current_user.id,
    )
    db.add(organization)
    db.flush()

    membership = OrganizationMembership(user_id=current_user.id, organization_id=organization.id, is_admin=True)
    db.add(membership)
    db.commit()
    db.refresh(organization)
    return build_organization_out(db, organization)


@router.patch("/{organization_id}", response_model=OrganizationOut)
def update_organization(
    organization_id: str,
    payload: OrganizationUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> OrganizationOut:
    if current_user.role != UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only app admins can update organizations")

    organization = db.scalar(select(Organization).where(Organization.id == organization_id))
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(organization, field, value)

    db.add(organization)
    db.commit()
    db.refresh(organization)
    return build_organization_out(db, organization)


@router.delete("/{organization_id}", response_model=MessageOut)
def delete_organization(organization_id: str, current_user: CurrentUser, db: DbSession) -> MessageOut:
    if current_user.role != UserRole.app_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only app admins can delete organizations")

    organization = db.scalar(select(Organization).where(Organization.id == organization_id))
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    db.delete(organization)
    db.commit()
    return MessageOut(message="Organization deleted successfully")


@router.get("/{organization_id}", response_model=OrganizationOut | OrganizationWithStatsOut)
def get_organization(
    organization_id: str,
    current_user: CurrentUser,
    db: DbSession,
    with_stats: bool = Query(default=False),
) -> OrganizationOut | OrganizationWithStatsOut:
    organization = db.scalar(select(Organization).where(Organization.id == organization_id))
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    allowed_org_ids = manageable_org_ids(db, current_user) if current_user.role == UserRole.org_admin else set()
    if current_user.role != UserRole.app_admin and organization_id not in allowed_org_ids:
        # Fallback: members can read org details if assigned.
        membership_exists = db.scalar(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == current_user.id,
            )
        )
        if not membership_exists:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return build_organization_out(db, organization, with_stats=with_stats)
