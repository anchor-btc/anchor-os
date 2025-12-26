//! Category handlers

use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::{AppError, Result};
use crate::handlers::AppState;
use crate::models::Category;

/// Get all categories
#[utoipa::path(
    get,
    path = "/categories",
    tag = "Map",
    responses(
        (status = 200, description = "List of categories", body = Vec<Category>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_categories(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Category>>> {
    let categories = state.db.get_categories().await.map_err(AppError::from)?;
    Ok(Json(categories))
}
