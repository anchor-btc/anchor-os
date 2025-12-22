//! Centralized error handling for the AnchorCanvas API

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use thiserror::Error;

/// Application-level error type
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database Error: {0}")]
    DbError(#[from] sqlx::Error),

    #[error("Anyhow Error: {0}")]
    AnyhowError(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::DbError(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::AnyhowError(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        };

        (status, error_message).into_response()
    }
}
