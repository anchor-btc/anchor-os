//! Notifications management handlers

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::Arc;
use utoipa::ToSchema;

use crate::AppState;

/// Notification severity levels
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum NotificationSeverity {
    Info,
    Success,
    Warning,
    Error,
}

impl Default for NotificationSeverity {
    fn default() -> Self {
        Self::Info
    }
}

/// Notification types
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    System,
    Backup,
    Service,
    Transaction,
}

/// A notification entry
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Notification {
    pub id: i32,
    pub notification_type: String,
    pub title: String,
    pub message: Option<String>,
    pub severity: String,
    pub read: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// List notifications response
#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationsListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
}

/// Query parameters for listing notifications
#[derive(Debug, Deserialize)]
pub struct NotificationsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    #[serde(rename = "type")]
    pub notification_type: Option<String>,
    pub severity: Option<String>,
    pub read: Option<String>,
}

/// Unread count response
#[derive(Debug, Serialize, ToSchema)]
pub struct UnreadCountResponse {
    pub count: i64,
}

/// Create notification request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateNotificationRequest {
    pub notification_type: String,
    pub title: String,
    pub message: Option<String>,
    pub severity: Option<String>,
}

/// Generic action response
#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationActionResponse {
    pub success: bool,
    pub message: String,
}

/// List all notifications with optional pagination and filters
#[utoipa::path(
    get,
    path = "/notifications",
    params(
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<i32>, Query, description = "Items per page (default: 50, max: 100)"),
        ("type" = Option<String>, Query, description = "Filter by type: service, transaction, backup, system"),
        ("severity" = Option<String>, Query, description = "Filter by severity: info, success, warning, error"),
        ("read" = Option<String>, Query, description = "Filter by read status: true, false")
    ),
    responses(
        (status = 200, description = "List of notifications", body = NotificationsListResponse)
    ),
    tag = "Notifications"
)]
pub async fn list_notifications(
    State(state): State<Arc<AppState>>,
    Query(query): Query<NotificationsQuery>,
) -> Result<Json<NotificationsListResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    // Pagination
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(50).min(100).max(1);
    let offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref t) = query.notification_type {
        if t != "all" {
            params.push(t.clone());
            conditions.push(format!("notification_type = ${}", params.len()));
        }
    }

    if let Some(ref s) = query.severity {
        if s != "all" {
            params.push(s.clone());
            conditions.push(format!("severity = ${}", params.len()));
        }
    }

    if let Some(ref r) = query.read {
        if r != "all" {
            let read_bool = r == "true";
            conditions.push(format!("read = {}", read_bool));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Build the query dynamically
    let query_str = format!(
        "SELECT id, notification_type, title, message, severity, read, created_at 
         FROM notifications 
         {} 
         ORDER BY created_at DESC 
         LIMIT {} OFFSET {}",
        where_clause, limit, offset
    );

    let count_query_str = format!(
        "SELECT COUNT(*) as count FROM notifications {}",
        where_clause
    );

    // Execute query with params
    let rows = match (query.notification_type.as_ref(), query.severity.as_ref()) {
        (Some(t), Some(s)) if t != "all" && s != "all" => {
            sqlx::query(&query_str)
                .bind(t)
                .bind(s)
                .fetch_all(pool)
                .await
        }
        (Some(t), _) if t != "all" => {
            sqlx::query(&query_str)
                .bind(t)
                .fetch_all(pool)
                .await
        }
        (_, Some(s)) if s != "all" => {
            sqlx::query(&query_str)
                .bind(s)
                .fetch_all(pool)
                .await
        }
        _ => {
            sqlx::query(&query_str)
                .fetch_all(pool)
                .await
        }
    }.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let notifications: Vec<Notification> = rows
        .iter()
        .map(|row| Notification {
            id: row.get("id"),
            notification_type: row.get("notification_type"),
            title: row.get("title"),
            message: row.get("message"),
            severity: row.get("severity"),
            read: row.get("read"),
            created_at: row.get("created_at"),
        })
        .collect();

    // Get total count with same filters
    let count_row = match (query.notification_type.as_ref(), query.severity.as_ref()) {
        (Some(t), Some(s)) if t != "all" && s != "all" => {
            sqlx::query(&count_query_str)
                .bind(t)
                .bind(s)
                .fetch_one(pool)
                .await
        }
        (Some(t), _) if t != "all" => {
            sqlx::query(&count_query_str)
                .bind(t)
                .fetch_one(pool)
                .await
        }
        (_, Some(s)) if s != "all" => {
            sqlx::query(&count_query_str)
                .bind(s)
                .fetch_one(pool)
                .await
        }
        _ => {
            sqlx::query(&count_query_str)
                .fetch_one(pool)
                .await
        }
    }.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let total: i64 = count_row.get("count");

    Ok(Json(NotificationsListResponse {
        notifications,
        total,
        page: Some(page),
        limit: Some(limit),
    }))
}

/// Get unread notifications count
#[utoipa::path(
    get,
    path = "/notifications/unread-count",
    responses(
        (status = 200, description = "Unread notifications count", body = UnreadCountResponse)
    ),
    tag = "Notifications"
)]
pub async fn get_unread_count(
    State(state): State<Arc<AppState>>,
) -> Result<Json<UnreadCountResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let row = sqlx::query("SELECT COUNT(*) as count FROM notifications WHERE read = FALSE")
        .fetch_one(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let count: i64 = row.get("count");

    Ok(Json(UnreadCountResponse { count }))
}

/// Create a new notification
#[utoipa::path(
    post,
    path = "/notifications",
    request_body = CreateNotificationRequest,
    responses(
        (status = 201, description = "Notification created", body = Notification)
    ),
    tag = "Notifications"
)]
pub async fn create_notification(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateNotificationRequest>,
) -> Result<(StatusCode, Json<Notification>), (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let severity = req.severity.unwrap_or_else(|| "info".to_string());

    let row = sqlx::query(
        "INSERT INTO notifications (notification_type, title, message, severity) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, notification_type, title, message, severity, read, created_at"
    )
    .bind(&req.notification_type)
    .bind(&req.title)
    .bind(&req.message)
    .bind(&severity)
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let notification = Notification {
        id: row.get("id"),
        notification_type: row.get("notification_type"),
        title: row.get("title"),
        message: row.get("message"),
        severity: row.get("severity"),
        read: row.get("read"),
        created_at: row.get("created_at"),
    };

    Ok((StatusCode::CREATED, Json(notification)))
}

/// Mark a notification as read
#[utoipa::path(
    put,
    path = "/notifications/{id}/read",
    params(
        ("id" = i32, Path, description = "Notification ID")
    ),
    responses(
        (status = 200, description = "Notification marked as read", body = NotificationActionResponse),
        (status = 404, description = "Notification not found")
    ),
    tag = "Notifications"
)]
pub async fn mark_as_read(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<NotificationActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let result = sqlx::query("UPDATE notifications SET read = TRUE WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Notification not found".to_string()));
    }

    Ok(Json(NotificationActionResponse {
        success: true,
        message: "Notification marked as read".to_string(),
    }))
}

/// Mark all notifications as read
#[utoipa::path(
    put,
    path = "/notifications/read-all",
    responses(
        (status = 200, description = "All notifications marked as read", body = NotificationActionResponse)
    ),
    tag = "Notifications"
)]
pub async fn mark_all_as_read(
    State(state): State<Arc<AppState>>,
) -> Result<Json<NotificationActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let result = sqlx::query("UPDATE notifications SET read = TRUE WHERE read = FALSE")
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(NotificationActionResponse {
        success: true,
        message: format!("{} notifications marked as read", result.rows_affected()),
    }))
}

/// Delete a notification
#[utoipa::path(
    delete,
    path = "/notifications/{id}",
    params(
        ("id" = i32, Path, description = "Notification ID")
    ),
    responses(
        (status = 200, description = "Notification deleted", body = NotificationActionResponse),
        (status = 404, description = "Notification not found")
    ),
    tag = "Notifications"
)]
pub async fn delete_notification(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<NotificationActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let result = sqlx::query("DELETE FROM notifications WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Notification not found".to_string()));
    }

    Ok(Json(NotificationActionResponse {
        success: true,
        message: "Notification deleted".to_string(),
    }))
}

/// Delete all read notifications (cleanup)
#[utoipa::path(
    delete,
    path = "/notifications/clear-read",
    responses(
        (status = 200, description = "Read notifications cleared", body = NotificationActionResponse)
    ),
    tag = "Notifications"
)]
pub async fn clear_read_notifications(
    State(state): State<Arc<AppState>>,
) -> Result<Json<NotificationActionResponse>, (StatusCode, String)> {
    let pool = state.db_pool.as_ref().ok_or_else(|| {
        (StatusCode::SERVICE_UNAVAILABLE, "Database not available".to_string())
    })?;

    let result = sqlx::query("DELETE FROM notifications WHERE read = TRUE")
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(NotificationActionResponse {
        success: true,
        message: format!("{} read notifications cleared", result.rows_affected()),
    }))
}
