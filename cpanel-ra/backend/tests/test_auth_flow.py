def test_register_login_and_profile_flow(client):
    register_payload = {
        "email": "resident@example.com",
        "password": "SecurePass123!",
        "full_name": "John Doe",
        "phone_number": "+60123456789"
    }

    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == register_payload["email"]
    assert body["full_name"] == register_payload["full_name"]
    assert body["is_active"] is True
    assert body["is_verified"] is False

    login_payload = {
        "email": "resident@example.com",
        "password": "SecurePass123!"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    login_body = response.json()
    assert "access_token" in login_body
    assert "refresh_token" in login_body
    assert login_body["token_type"] == "bearer"

    headers = {"Authorization": f"Bearer {login_body['access_token']}"}
    response = client.get("/api/users/me", headers=headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == register_payload["email"]
    assert profile["full_name"] == register_payload["full_name"]

    update_payload = {
        "full_name": "John Doe Updated",
        "phone_number": "+60133456789",
        "ic_number": "123456-78-9012",
        "date_of_birth": "1990-01-15T00:00:00Z",
        "place_of_birth": "Kuala Lumpur",
        "sex": "M",
        "race": "Malay",
        "marital_status": "married",
        "taman_name": "Taman Aman Serenia",
        "house_number": "12A",
        "jalan_aman_serenia": "Jalan Aman Serenia 1",
        "job_title": "Software Engineer",
        "employer_name": "Tech Company Sdn Bhd"
    }

    response = client.put("/api/users/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    updated = response.json()
    assert updated["full_name"] == "John Doe Updated"
    assert updated["phone_number"] == "+60133456789"
    assert updated["ic_number"] == "123456-78-9012"

    response = client.post("/api/auth/refresh", json={"refresh_token": login_body["refresh_token"]})
    assert response.status_code == 200
    refresh_body = response.json()
    assert refresh_body["token_type"] == "bearer"
    assert "access_token" in refresh_body
