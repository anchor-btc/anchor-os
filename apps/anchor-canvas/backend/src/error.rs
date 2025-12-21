//! Centralized error handling for the AnchorCanvas API

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use thiserror::Error;

/// Result type alias for application operations
pub type AppResult<T> = Result<T, AppError>;

/// Application-level error type
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Bad Request: {0}")]
    BadRequest(String),

    #[error("Not Found: {0}")]
    NotFound(String),

    #[error("Internal Server Error: {0}")]
    Internal(String),

    #[error("Database Error: {0}")]
    DbError(#[from] sqlx::Error),

    #[error("Anyhow Error: {0}")]
    AnyhowError(#[from] anyhow::Error),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::DbError(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::AnyhowError(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        };

        (status, error_message).into_response()
    }
}

