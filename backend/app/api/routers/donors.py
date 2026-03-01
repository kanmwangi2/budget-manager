from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import Donor, Organization, UserRole
from app.schemas import DonorCreate, DonorOut, DonorUpdate, MessageOut
from app.services import build_donor_out, manageable_org_ids, organization_ids_for_user

router = APIRouter(prefix="/donors", tags=["donors"])


def _assert_org_exists(db: DbSession, organization_id: str) -> None:
    if not db.scalar(select(Organization.id).where(Organization.id == organization_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")


def _assert_can_manage_org(current_user: CurrentUser, db: DbSession, organization_id: str) -> None:
    if current_user.role == UserRole.app_admin:
        _assert_org_exists(db, organization_id)
        return

    allowed = manageable_org_ids(db, current_user)
    if organization_id not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("", response_model=list[DonorOut])
def list_donors(
    current_user: CurrentUser,
    db: DbSession,
    organization_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[DonorOut]:
    query = select(Donor)

    if current_user.role == UserRole.app_admin:
        allowed_org_ids: set[str] | None = None
    else:
        allowed_org_ids = organization_ids_for_user(db, current_user)

    if allowed_org_ids is not None:
        if organization_id and organization_id not in allowed_org_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if not allowed_org_ids:
            return []
        query = query.where(Donor.organization_id.in_(allowed_org_ids))

    if organization_id:
        query = query.where(Donor.organization_id == organization_id)

    if status_filter:
        query = query.where(Donor.status == status_filter)

    donors = db.scalars(query.order_by(Donor.name)).all()
    return [build_donor_out(donor) for donor in donors]


@router.post("", response_model=DonorOut, status_code=status.HTTP_201_CREATED)
def create_donor(payload: DonorCreate, current_user: CurrentUser, db: DbSession) -> DonorOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can create donors")

    _assert_can_manage_org(current_user, db, payload.organization_id)

    donor = Donor(
        organization_id=payload.organization_id,
        name=payload.name.strip(),
        donor_type=payload.donor_type,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
        currency=payload.currency,
        total_donated=payload.total_donated,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return build_donor_out(donor)


@router.patch("/{donor_id}", response_model=DonorOut)
def update_donor(donor_id: str, payload: DonorUpdate, current_user: CurrentUser, db: DbSession) -> DonorOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can update donors")

    donor = db.scalar(select(Donor).where(Donor.id == donor_id))
    if not donor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor not found")

    _assert_can_manage_org(current_user, db, donor.organization_id)

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        donor.name = updates["name"].strip()
    if "donor_type" in updates and updates["donor_type"] is not None:
        donor.donor_type = updates["donor_type"]
    if "email" in updates:
        donor.email = str(updates["email"]) if updates["email"] else None
    if "phone" in updates:
        donor.phone = updates["phone"]
    if "currency" in updates and updates["currency"] is not None:
        donor.currency = updates["currency"]
    if "total_donated" in updates and updates["total_donated"] is not None:
        donor.total_donated = updates["total_donated"]
    if "status" in updates and updates["status"] is not None:
        donor.status = updates["status"]
    if "notes" in updates:
        donor.notes = updates["notes"]

    db.add(donor)
    db.commit()
    db.refresh(donor)
    return build_donor_out(donor)


@router.delete("/{donor_id}", response_model=MessageOut)
def delete_donor(donor_id: str, current_user: CurrentUser, db: DbSession) -> MessageOut:
    if current_user.role not in {UserRole.app_admin, UserRole.org_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can delete donors")

    donor = db.scalar(select(Donor).where(Donor.id == donor_id))
    if not donor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor not found")

    _assert_can_manage_org(current_user, db, donor.organization_id)
    db.delete(donor)
    db.commit()
    return MessageOut(message="Donor deleted successfully")
