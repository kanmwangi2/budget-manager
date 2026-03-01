from __future__ import annotations

from fastapi.testclient import TestClient


def test_regular_user_cannot_create_department(
    client: TestClient,
    seed_data: dict[str, str],
    auth_headers: dict[str, dict[str, str]],
) -> None:
    response = client.post(
        "/api/departments",
        json={"name": "Blocked Dept", "organization_id": seed_data["org_a"]},
        headers=auth_headers["regular_user"],
    )

    assert response.status_code == 403
    assert "administrators" in response.json()["detail"]


def test_org_admin_can_create_only_within_managed_organization(
    client: TestClient,
    seed_data: dict[str, str],
    auth_headers: dict[str, dict[str, str]],
) -> None:
    allowed = client.post(
        "/api/departments",
        json={"name": "Allowed Dept", "organization_id": seed_data["org_a"]},
        headers=auth_headers["org_admin"],
    )
    blocked = client.post(
        "/api/departments",
        json={"name": "Blocked Dept", "organization_id": seed_data["org_b"]},
        headers=auth_headers["org_admin"],
    )

    assert allowed.status_code == 201
    assert blocked.status_code == 403


def test_regular_user_donor_list_is_scoped_to_assigned_organizations(
    client: TestClient,
    seed_data: dict[str, str],
    auth_headers: dict[str, dict[str, str]],
) -> None:
    response = client.get("/api/donors", headers=auth_headers["regular_user"])
    assert response.status_code == 200

    payload = response.json()
    org_ids = {item["organization_id"] for item in payload}
    assert org_ids == {seed_data["org_a"]}

    forbidden = client.get(
        f"/api/donors?organization_id={seed_data['org_b']}",
        headers=auth_headers["regular_user"],
    )
    assert forbidden.status_code == 403


def test_org_admin_user_filter_rejects_unmanaged_organization(
    client: TestClient,
    seed_data: dict[str, str],
    auth_headers: dict[str, dict[str, str]],
) -> None:
    allowed = client.get(
        f"/api/users?organization_id={seed_data['org_a']}",
        headers=auth_headers["org_admin"],
    )
    blocked = client.get(
        f"/api/users?organization_id={seed_data['org_b']}",
        headers=auth_headers["org_admin"],
    )

    assert allowed.status_code == 200
    assert blocked.status_code == 403


def test_app_admin_can_query_users_and_donors_for_any_organization(
    client: TestClient,
    seed_data: dict[str, str],
    auth_headers: dict[str, dict[str, str]],
) -> None:
    users_response = client.get(
        f"/api/users?organization_id={seed_data['org_b']}",
        headers=auth_headers["app_admin"],
    )
    donors_response = client.get(
        f"/api/donors?organization_id={seed_data['org_b']}",
        headers=auth_headers["app_admin"],
    )

    assert users_response.status_code == 200
    user_ids = {item["id"] for item in users_response.json()}
    assert seed_data["other_user_id"] in user_ids

    assert donors_response.status_code == 200
    donor_ids = {item["id"] for item in donors_response.json()}
    assert seed_data["donor_b"] in donor_ids
