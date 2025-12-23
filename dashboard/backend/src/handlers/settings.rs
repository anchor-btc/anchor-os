//! Settings management handlers

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::Row;
use std::sync::Arc;
use utoipa::ToSchema;

use crate::AppState;

/// System setting
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SystemSetting {
    pub key: String,
    pub value: JsonValue,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// All settings response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AllSettingsResponse {
    pub settings: Vec<SystemSetting>,
}

/// Update setting request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSettingRequest {
    pub value: JsonValue,
}

/// Setting response
#[derive(Debug, Serialize, ToSchema)]
pub struct SettingResponse {
    pub success: bool,
    pub setting: Option<SystemSetting>,
    pub message: Option<String>,
}

/// Get all settings
#[utoipa::path(
    get,
    path = "/settings",
    responses(
        (status = 200, description = "All settings", body = AllSettingsResponse)
    ),
    tag = "Settings"
)]
pub async fn get_all_settings(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AllSettingsResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let rows = sqlx::query("SELECT key, value, updated_at FROM system_settings")
        .fetch_all(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let settings: Vec<SystemSetting> = rows
        .iter()
        .map(|row| SystemSetting {
            key: row.get("key"),
            value: row.get("value"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    Ok(Json(AllSettingsResponse { settings }))
}

/// Get a specific setting
#[utoipa::path(
    get,
    path = "/settings/{key}",
    params(
        ("key" = String, Path, description = "Setting key")
    ),
    responses(
        (status = 200, description = "Setting value", body = SettingResponse),
        (status = 404, description = "Setting not found")
    ),
    tag = "Settings"
)]
pub async fn get_setting(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> Result<Json<SettingResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let row = sqlx::query("SELECT key, value, updated_at FROM system_settings WHERE key = $1")
        .bind(&key)
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match row {
        Some(r) => Ok(Json(SettingResponse {
            success: true,
            setting: Some(SystemSetting {
                key: r.get("key"),
                value: r.get("value"),
                updated_at: r.get("updated_at"),
            }),
            message: None,
        })),
        None => Err((StatusCode::NOT_FOUND, format!("Setting '{}' not found", key))),
    }
}

/// Update or create a setting (upsert)
#[utoipa::path(
    put,
    path = "/settings/{key}",
    params(
        ("key" = String, Path, description = "Setting key")
    ),
    request_body = UpdateSettingRequest,
    responses(
        (status = 200, description = "Setting updated", body = SettingResponse)
    ),
    tag = "Settings"
)]
pub async fn update_setting(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
    Json(req): Json<UpdateSettingRequest>,
) -> Result<Json<SettingResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    // Use UPSERT to create or update the setting
    let row = sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
         RETURNING key, value, updated_at"
    )
    .bind(&key)
    .bind(&req.value)
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SettingResponse {
        success: true,
        setting: Some(SystemSetting {
            key: row.get("key"),
            value: row.get("value"),
            updated_at: row.get("updated_at"),
        }),
        message: Some("Setting saved successfully".to_string()),
    }))
}

/// Export all settings
#[utoipa::path(
    get,
    path = "/settings/export",
    responses(
        (status = 200, description = "Exported settings", body = AllSettingsResponse)
    ),
    tag = "Settings"
)]
pub async fn export_settings(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AllSettingsResponse>, (StatusCode, String)> {
    get_all_settings(State(state)).await
}

/// Import settings request
#[derive(Debug, Deserialize, ToSchema)]
pub struct ImportSettingsRequest {
    pub settings: Vec<SystemSetting>,
}

/// Import settings
#[utoipa::path(
    post,
    path = "/settings/import",
    request_body = ImportSettingsRequest,
    responses(
        (status = 200, description = "Settings imported", body = SettingResponse)
    ),
    tag = "Settings"
)]
pub async fn import_settings(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ImportSettingsRequest>,
) -> Result<Json<SettingResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    for setting in req.settings {
        sqlx::query(
            "INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()"
        )
        .bind(&setting.key)
        .bind(&setting.value)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(SettingResponse {
        success: true,
        setting: None,
        message: Some("Settings imported successfully".to_string()),
    }))
}






