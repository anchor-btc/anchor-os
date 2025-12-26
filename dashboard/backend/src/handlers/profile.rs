//! User profile handlers for personalization

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use tracing::info;
use utoipa::ToSchema;

use crate::AppState;

/// User profile data
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UserProfile {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

/// Request to update user profile
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateProfileRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

/// Profile action response
#[derive(Debug, Serialize, ToSchema)]
pub struct ProfileResponse {
    pub success: bool,
    pub profile: Option<UserProfile>,
    pub message: Option<String>,
}

/// Get current user profile
#[utoipa::path(
    get,
    path = "/profile",
    tag = "Profile",
    responses(
        (status = 200, description = "User profile", body = ProfileResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_profile(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(ProfileResponse {
                success: true,
                profile: Some(UserProfile {
                    name: "Bitcoiner".to_string(),
                    avatar_url: None,
                }),
                message: None,
            }));
        }
    };

    let row = sqlx::query("SELECT name, avatar_url FROM user_profile WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let profile = match row {
        Some(row) => UserProfile {
            name: row.get("name"),
            avatar_url: row.get("avatar_url"),
        },
        None => UserProfile {
            name: "Bitcoiner".to_string(),
            avatar_url: None,
        },
    };

    Ok(Json(ProfileResponse {
        success: true,
        profile: Some(profile),
        message: None,
    }))
}

/// Update user profile
#[utoipa::path(
    put,
    path = "/profile",
    tag = "Profile",
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Profile updated", body = ProfileResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateProfileRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Validate name
    let name = req.name.trim();
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Name cannot be empty".to_string()));
    }
    if name.len() > 100 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Name too long (max 100 characters)".to_string(),
        ));
    }

    let pool = match &state.db_pool {
        Some(p) => p,
        None => {
            return Ok(Json(ProfileResponse {
                success: false,
                profile: None,
                message: Some("Database not available".to_string()),
            }));
        }
    };

    // Check if profile exists
    let exists = sqlx::query("SELECT id FROM user_profile WHERE id = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .is_some();

    if exists {
        sqlx::query(
            "UPDATE user_profile SET name = $1, avatar_url = $2, updated_at = NOW() WHERE id = 1",
        )
        .bind(name)
        .bind(&req.avatar_url)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        sqlx::query("INSERT INTO user_profile (id, name, avatar_url) VALUES (1, $1, $2)")
            .bind(name)
            .bind(&req.avatar_url)
            .execute(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    info!("Updated user profile: {}", name);

    Ok(Json(ProfileResponse {
        success: true,
        profile: Some(UserProfile {
            name: name.to_string(),
            avatar_url: req.avatar_url,
        }),
        message: Some("Profile updated successfully".to_string()),
    }))
}
