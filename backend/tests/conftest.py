from __future__ import annotations

import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Department, Donor, Organization, OrganizationMembership, User, UserRole


@pytest.fixture()
def db_engine() -> Generator[Engine, None, None]:
    temp_dir = tempfile.TemporaryDirectory()
    db_path = Path(temp_dir.name) / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        temp_dir.cleanup()


@pytest.fixture()
def session_factory(db_engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False, class_=Session)


@pytest.fixture()
def client(session_factory: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seed_data(session_factory: sessionmaker[Session]) -> dict[str, str]:
    session = session_factory()
    try:
        app_admin = User(
            id="user-app-admin",
            email="app.admin@example.com",
            name="App Admin",
            role=UserRole.app_admin,
            password_hash=get_password_hash("AdminPass123!"),
            is_active=True,
        )
        org_admin = User(
            id="user-org-admin",
            email="org.admin@example.com",
            name="Org Admin",
            role=UserRole.org_admin,
            password_hash=get_password_hash("OrgAdminPass123!"),
            is_active=True,
        )
        regular_user = User(
            id="user-regular",
            email="regular.user@example.com",
            name="Regular User",
            role=UserRole.user,
            password_hash=get_password_hash("RegularPass123!"),
            is_active=True,
        )
        other_user = User(
            id="user-other",
            email="other.user@example.com",
            name="Other User",
            role=UserRole.user,
            password_hash=get_password_hash("OtherPass123!"),
            is_active=True,
        )

        org_a = Organization(id="org-a", name="Organization A", country="Rwanda", currency="RWF")
        org_b = Organization(id="org-b", name="Organization B", country="Kenya", currency="KES")

        memberships = [
            OrganizationMembership(user_id=app_admin.id, organization_id=org_a.id, is_admin=True),
            OrganizationMembership(user_id=app_admin.id, organization_id=org_b.id, is_admin=True),
            OrganizationMembership(user_id=org_admin.id, organization_id=org_a.id, is_admin=True),
            OrganizationMembership(user_id=regular_user.id, organization_id=org_a.id, is_admin=False),
            OrganizationMembership(user_id=other_user.id, organization_id=org_b.id, is_admin=False),
        ]

        dept_a = Department(id="dept-a", name="Dept A", organization_id=org_a.id)
        donor_a = Donor(
            id="donor-a",
            organization_id=org_a.id,
            name="Donor A",
            donor_type="foundation",
            currency="RWF",
            total_donated=1000,
            status="active",
        )
        donor_b = Donor(
            id="donor-b",
            organization_id=org_b.id,
            name="Donor B",
            donor_type="corporation",
            currency="KES",
            total_donated=2500,
            status="active",
        )

        session.add_all(
            [app_admin, org_admin, regular_user, other_user, org_a, org_b, dept_a, donor_a, donor_b, *memberships]
        )
        session.commit()

        return {
            "org_a": org_a.id,
            "org_b": org_b.id,
            "app_admin_id": app_admin.id,
            "org_admin_id": org_admin.id,
            "regular_user_id": regular_user.id,
            "other_user_id": other_user.id,
            "donor_a": donor_a.id,
            "donor_b": donor_b.id,
        }
    finally:
        session.close()


@pytest.fixture()
def auth_headers(seed_data: dict[str, str]) -> dict[str, dict[str, str]]:
    return {
        "app_admin": {"Authorization": f"Bearer {create_access_token(seed_data['app_admin_id'])}"},
        "org_admin": {"Authorization": f"Bearer {create_access_token(seed_data['org_admin_id'])}"},
        "regular_user": {"Authorization": f"Bearer {create_access_token(seed_data['regular_user_id'])}"},
        "other_user": {"Authorization": f"Bearer {create_access_token(seed_data['other_user_id'])}"},
    }
