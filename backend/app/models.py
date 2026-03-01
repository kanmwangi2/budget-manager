from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


def default_preferences() -> dict[str, Any]:
    return {
        "theme": "system",
        "currency": "RWF",
        "language": "en",
        "notifications": {
            "email": True,
            "push": True,
            "budgetAlerts": True,
            "approvalRequests": True,
        },
    }


def default_org_settings() -> dict[str, Any]:
    return {
        "fiscalYearStart": "January",
        "approvalWorkflow": True,
        "multiCurrency": False,
        "complianceReporting": True,
    }


def default_org_subscription() -> dict[str, Any]:
    return {"plan": "free", "status": "active"}


class UserRole(str, Enum):
    app_admin = "app_admin"
    org_admin = "org_admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, name="user_role", native_enum=False), nullable=False, default=UserRole.user
    )
    avatar: Mapped[str | None] = mapped_column(String(512), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    preferences: Mapped[dict[str, Any]] = mapped_column(JSON, default=default_preferences, nullable=False)

    organization_memberships: Mapped[list[OrganizationMembership]] = relationship(
        "OrganizationMembership", back_populates="user", cascade="all, delete-orphan"
    )
    department_memberships: Mapped[list[DepartmentMembership]] = relationship(
        "DepartmentMembership", back_populates="user", cascade="all, delete-orphan"
    )
    created_organizations: Mapped[list[Organization]] = relationship(
        "Organization", back_populates="creator", foreign_keys="Organization.created_by"
    )


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=default_org_settings, nullable=False)
    subscription: Mapped[dict[str, Any]] = mapped_column(JSON, default=default_org_subscription, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    creator: Mapped[User | None] = relationship("User", back_populates="created_organizations")
    memberships: Mapped[list[OrganizationMembership]] = relationship(
        "OrganizationMembership", back_populates="organization", cascade="all, delete-orphan"
    )
    departments: Mapped[list[Department]] = relationship(
        "Department", back_populates="organization", cascade="all, delete-orphan"
    )
    donors: Mapped[list[Donor]] = relationship(
        "Donor", back_populates="organization", cascade="all, delete-orphan"
    )


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    manager_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    organization: Mapped[Organization] = relationship("Organization", back_populates="departments")
    memberships: Mapped[list[DepartmentMembership]] = relationship(
        "DepartmentMembership", back_populates="department", cascade="all, delete-orphan"
    )


class Donor(Base):
    __tablename__ = "donors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    donor_type: Mapped[str] = mapped_column(String(32), default="individual", nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    total_donated: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    organization: Mapped[Organization] = relationship("Organization", back_populates="donors")


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="organization_memberships")
    organization: Mapped[Organization] = relationship("Organization", back_populates="memberships")


class DepartmentMembership(Base):
    __tablename__ = "department_memberships"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="department_memberships")
    department: Mapped[Department] = relationship("Department", back_populates="memberships")
