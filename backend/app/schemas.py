from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole


class NotificationPreferences(BaseModel):
    email: bool = True
    push: bool = True
    budget_alerts: bool = Field(default=True, alias="budgetAlerts")
    approval_requests: bool = Field(default=True, alias="approvalRequests")


class UserPreferences(BaseModel):
    theme: Literal["light", "dark", "system"] = "system"
    currency: str = "RWF"
    language: str = "en"
    notifications: NotificationPreferences = NotificationPreferences()


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=150)
    role: UserRole = UserRole.user
    avatar: str | None = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)
    organization_ids: list[str] = []
    department_ids: list[str] = []


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = None
    role: UserRole | None = None
    avatar: str | None = None
    is_active: bool | None = None
    organization_ids: list[str] | None = None
    department_ids: list[str] | None = None
    preferences: UserPreferences | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: UserRole
    avatar: str | None = None
    created_at: datetime
    last_login: datetime | None = None
    is_active: bool
    organization_ids: list[str]
    department_ids: list[str]
    preferences: dict[str, Any]


class UserListItem(UserOut):
    organization_names: list[str]
    department_names: list[str]


class DepartmentBrief(BaseModel):
    id: str
    name: str


class OrganizationSelectionOut(BaseModel):
    id: str
    name: str
    role: Literal["admin", "member"]
    departments: list[DepartmentBrief]


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=150)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    available_organizations: list[OrganizationSelectionOut]


class AuthMeResponse(BaseModel):
    user: UserOut
    available_organizations: list[OrganizationSelectionOut]


class PasswordResetRequest(BaseModel):
    email: EmailStr


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    country: str = ""
    currency: str = "RWF"
    settings: dict[str, Any] | None = None
    subscription: dict[str, Any] | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    country: str | None = None
    currency: str | None = None
    settings: dict[str, Any] | None = None
    subscription: dict[str, Any] | None = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    description: str | None
    country: str
    currency: str
    admin_ids: list[str]
    member_ids: list[str]
    settings: dict[str, Any]
    subscription: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    created_by: str | None


class OrganizationWithStatsOut(OrganizationOut):
    member_count: int
    admin_count: int
    department_count: int


class DepartmentOut(BaseModel):
    id: str
    name: str
    description: str | None
    organization_id: str
    manager_id: str | None
    member_ids: list[str]
    created_at: datetime
    updated_at: datetime


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    organization_id: str
    manager_id: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    manager_id: str | None = None


class DonorCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=1, max_length=255)
    donor_type: Literal["individual", "foundation", "corporation", "government"] = "individual"
    email: EmailStr | None = None
    phone: str | None = None
    currency: str = "RWF"
    total_donated: float = 0
    status: Literal["active", "inactive", "prospect"] = "active"
    notes: str | None = None


class DonorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    donor_type: Literal["individual", "foundation", "corporation", "government"] | None = None
    email: EmailStr | None = None
    phone: str | None = None
    currency: str | None = None
    total_donated: float | None = None
    status: Literal["active", "inactive", "prospect"] | None = None
    notes: str | None = None


class DonorOut(BaseModel):
    id: str
    organization_id: str
    name: str
    donor_type: Literal["individual", "foundation", "corporation", "government"]
    email: EmailStr | None = None
    phone: str | None = None
    currency: str
    total_donated: float
    status: Literal["active", "inactive", "prospect"]
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    message: str
