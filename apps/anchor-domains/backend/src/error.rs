//! Centralized error handling for the Anchor Domains API
//!
//! This module provides a unified error type that implements `IntoResponse`,
//! eliminating the need for `Result<impl IntoResponse, (StatusCode, String)>` in handlers.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

/// API error response body
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: u16,
}

/// Application-wide error type
#[derive(Debug)]
pub enum AppError {
    /// 400 Bad Request - Invalid input from client
    BadRequest(String),
    /// 404 Not Found - Resource doesn't exist
    NotFound(String),
    /// 500 Internal Server Error - Unexpected server error
    Internal(String),
    /// 502 Bad Gateway - Error communicating with wallet service
    WalletError(String),
}

impl AppError {
    /// Create a BadRequest error
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    /// Create a NotFound error
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    /// Create a WalletError
    pub fn wallet_error(msg: impl Into<String>) -> Self {
        Self::WalletError(msg.into())
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::BadRequest(msg) => write!(f, "Bad Request: {}", msg),
            Self::NotFound(msg) => write!(f, "Not Found: {}", msg),
            Self::Internal(msg) => write!(f, "Internal Error: {}", msg),
            Self::WalletError(msg) => write!(f, "Wallet Error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            Self::Internal(msg) => {
                error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
            Self::WalletError(msg) => {
                error!("Wallet service error: {}", msg);
                (StatusCode::BAD_GATEWAY, msg.clone())
            }
        };

        let body = Json(ErrorResponse {
            error: message,
            code: status.as_u16(),
        });

        (status, body).into_response()
    }
}

// Convenient conversions from common error types

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        Self::Internal(err.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        Self::Internal(err.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        Self::WalletError(err.to_string())
    }
}

impl From<hex::FromHexError> for AppError {
    fn from(err: hex::FromHexError) -> Self {
        Self::BadRequest(format!("Invalid hex format: {}", err))
    }
}

/// Result type alias using AppError
pub type AppResult<T> = Result<T, AppError>;
