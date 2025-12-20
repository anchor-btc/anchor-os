//! Authentication handlers

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use std::sync::Arc;
use utoipa::ToSchema;

use crate::AppState;

/// JWT secret (in production, this should come from environment)
const JWT_SECRET: &[u8] = b"anchor-os-jwt-secret-key-change-in-production";

/// JWT claims
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

/// Auth status response
#[derive(Debug, Serialize, ToSchema)]
pub struct AuthStatusResponse {
    pub enabled: bool,
    pub has_password: bool,
    pub inactivity_timeout: i64,
}

/// Login request
#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub message: String,
}

/// Setup password request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SetupPasswordRequest {
    pub password: String,
    pub inactivity_timeout: Option<i64>,
}

/// Change password request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

/// Verify token request
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyTokenRequest {
    pub token: String,
}

/// Verify token response
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifyTokenResponse {
    pub valid: bool,
}

/// Auth action response
#[derive(Debug, Serialize, ToSchema)]
pub struct AuthActionResponse {
    pub success: bool,
    pub message: String,
}

/// Get auth status
#[utoipa::path(
    get,
    path = "/auth/status",
    responses(
        (status = 200, description = "Auth status", body = AuthStatusResponse)
    ),
    tag = "Auth"
)]
pub async fn get_auth_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AuthStatusResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let row = sqlx::query("SELECT value FROM system_settings WHERE key = 'auth'")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match row {
        Some(r) => {
            let value: serde_json::Value = r.get("value");
            let enabled = value.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
            let has_password = value.get("password_hash").map(|v| !v.is_null()).unwrap_or(false);
            let inactivity_timeout = value.get("inactivity_timeout").and_then(|v| v.as_i64()).unwrap_or(300);
            
            Ok(Json(AuthStatusResponse {
                enabled,
                has_password,
                inactivity_timeout,
            }))
        }
        None => Ok(Json(AuthStatusResponse {
            enabled: false,
            has_password: false,
            inactivity_timeout: 300,
        })),
    }
}

/// Setup initial password
#[utoipa::path(
    post,
    path = "/auth/setup",
    request_body = SetupPasswordRequest,
    responses(
        (status = 200, description = "Password set", body = AuthActionResponse)
    ),
    tag = "Auth"
)]
pub async fn setup_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SetupPasswordRequest>,
) -> Result<Json<AuthActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    // Hash the password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .to_string();

    let timeout = req.inactivity_timeout.unwrap_or(300);

    let auth_value = json!({
        "enabled": true,
        "password_hash": password_hash,
        "inactivity_timeout": timeout
    });

    sqlx::query("UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = 'auth'")
        .bind(&auth_value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthActionResponse {
        success: true,
        message: "Password set successfully. Authentication is now enabled.".to_string(),
    }))
}

/// Login with password
#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login result", body = LoginResponse)
    ),
    tag = "Auth"
)]
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let row = sqlx::query("SELECT value FROM system_settings WHERE key = 'auth'")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let auth_value: serde_json::Value = row
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Auth not configured".to_string()))?
        .get("value");

    let enabled = auth_value.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    if !enabled {
        return Ok(Json(LoginResponse {
            success: true,
            token: None,
            message: "Authentication is disabled".to_string(),
        }));
    }

    let stored_hash = auth_value
        .get("password_hash")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "No password set".to_string()))?;

    // Verify password
    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let is_valid = Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .is_ok();

    if !is_valid {
        return Ok(Json(LoginResponse {
            success: false,
            token: None,
            message: "Invalid password".to_string(),
        }));
    }

    // Generate JWT token (valid for 24 hours)
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: "anchor-os-user".to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(LoginResponse {
        success: true,
        token: Some(token),
        message: "Login successful".to_string(),
    }))
}

/// Verify JWT token
#[utoipa::path(
    post,
    path = "/auth/verify",
    request_body = VerifyTokenRequest,
    responses(
        (status = 200, description = "Token verification result", body = VerifyTokenResponse)
    ),
    tag = "Auth"
)]
pub async fn verify_token(
    Json(req): Json<VerifyTokenRequest>,
) -> Json<VerifyTokenResponse> {
    let validation = Validation::default();
    let is_valid = decode::<Claims>(
        &req.token,
        &DecodingKey::from_secret(JWT_SECRET),
        &validation,
    )
    .is_ok();

    Json(VerifyTokenResponse { valid: is_valid })
}

/// Change password
#[utoipa::path(
    post,
    path = "/auth/change-password",
    request_body = ChangePasswordRequest,
    responses(
        (status = 200, description = "Password changed", body = AuthActionResponse)
    ),
    tag = "Auth"
)]
pub async fn change_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<Json<AuthActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    // Get current auth settings
    let row = sqlx::query("SELECT value FROM system_settings WHERE key = 'auth'")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let auth_value: serde_json::Value = row
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Auth not configured".to_string()))?
        .get("value");

    let stored_hash = auth_value
        .get("password_hash")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "No password set".to_string()))?;

    // Verify current password
    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let is_valid = Argon2::default()
        .verify_password(req.current_password.as_bytes(), &parsed_hash)
        .is_ok();

    if !is_valid {
        return Ok(Json(AuthActionResponse {
            success: false,
            message: "Current password is incorrect".to_string(),
        }));
    }

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let new_hash = argon2
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .to_string();

    // Update password hash
    let timeout = auth_value.get("inactivity_timeout").and_then(|v| v.as_i64()).unwrap_or(300);
    let new_auth_value = json!({
        "enabled": true,
        "password_hash": new_hash,
        "inactivity_timeout": timeout
    });

    sqlx::query("UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = 'auth'")
        .bind(&new_auth_value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthActionResponse {
        success: true,
        message: "Password changed successfully".to_string(),
    }))
}

/// Disable authentication
#[utoipa::path(
    delete,
    path = "/auth/disable",
    responses(
        (status = 200, description = "Auth disabled", body = AuthActionResponse)
    ),
    tag = "Auth"
)]
pub async fn disable_auth(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AuthActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let auth_value = json!({
        "enabled": false,
        "password_hash": null,
        "inactivity_timeout": 300
    });

    sqlx::query("UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = 'auth'")
        .bind(&auth_value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthActionResponse {
        success: true,
        message: "Authentication disabled".to_string(),
    }))
}




