//! Canvas state management and tile generation

use anyhow::Result;
use image::codecs::png::PngEncoder;
use image::{ImageBuffer, ImageEncoder, Rgb, RgbImage};

use crate::config::{CANVAS_HEIGHT, CANVAS_WIDTH, TILE_SIZE};
use crate::db::Database;

/// Default background color (dark gray)
const BG_COLOR: [u8; 3] = [32, 32, 32];

/// Canvas manager for generating tiles and images
pub struct CanvasManager {
    db: Database,
}

impl CanvasManager {
    /// Create a new canvas manager
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Generate a tile image at the specified zoom level and coordinates
    /// Zoom level 0 = full canvas in one tile
    /// Zoom level 1 = 2x2 tiles, etc.
    pub async fn generate_tile(&self, zoom: u32, tile_x: u32, tile_y: u32) -> Result<Vec<u8>> {
        let tiles_per_side = 1u32 << zoom; // 2^zoom
        let pixels_per_tile = CANVAS_WIDTH / tiles_per_side;

        let x_min = (tile_x * pixels_per_tile) as i32;
        let y_min = (tile_y * pixels_per_tile) as i32;
        let x_max = x_min + pixels_per_tile as i32;
        let y_max = y_min + pixels_per_tile as i32;

        // Get pixels from database
        let pixels = self
            .db
            .get_region_pixels(x_min, y_min, x_max, y_max)
            .await?;

        // Create image
        let mut img: RgbImage = ImageBuffer::from_fn(TILE_SIZE, TILE_SIZE, |_, _| Rgb(BG_COLOR));

        // Scale factor (canvas pixels to tile pixels)
        let scale = TILE_SIZE as f32 / pixels_per_tile as f32;

        // Draw pixels
        for (x, y, r, g, b) in pixels {
            let px = ((x - x_min) as f32 * scale) as u32;
            let py = ((y - y_min) as f32 * scale) as u32;

            if px < TILE_SIZE && py < TILE_SIZE {
                // If scale >= 1, we need to draw larger blocks
                let block_size = scale.ceil() as u32;
                for dx in 0..block_size {
                    for dy in 0..block_size {
                        let fx = px + dx;
                        let fy = py + dy;
                        if fx < TILE_SIZE && fy < TILE_SIZE {
                            img.put_pixel(fx, fy, Rgb([r as u8, g as u8, b as u8]));
                        }
                    }
                }
            }
        }

        // Encode to PNG
        let mut buffer = Vec::new();
        let encoder = PngEncoder::new(&mut buffer);
        encoder.write_image(
            img.as_raw(),
            TILE_SIZE,
            TILE_SIZE,
            image::ExtendedColorType::Rgb8,
        )?;

        Ok(buffer)
    }

    /// Generate a region image
    pub async fn generate_region(
        &self,
        x: i32,
        y: i32,
        width: u32,
        height: u32,
    ) -> Result<Vec<u8>> {
        let x_max = x + width as i32;
        let y_max = y + height as i32;

        // Get pixels from database
        let pixels = self.db.get_region_pixels(x, y, x_max, y_max).await?;

        // Create image
        let mut img: RgbImage = ImageBuffer::from_fn(width, height, |_, _| Rgb(BG_COLOR));

        // Draw pixels
        for (px, py, r, g, b) in pixels {
            let ix = (px - x) as u32;
            let iy = (py - y) as u32;
            if ix < width && iy < height {
                img.put_pixel(ix, iy, Rgb([r as u8, g as u8, b as u8]));
            }
        }

        // Encode to PNG
        let mut buffer = Vec::new();
        let encoder = PngEncoder::new(&mut buffer);
        encoder.write_image(img.as_raw(), width, height, image::ExtendedColorType::Rgb8)?;

        Ok(buffer)
    }

    /// Generate a full canvas preview (scaled down)
    pub async fn generate_preview(&self, max_size: u32) -> Result<Vec<u8>> {
        let scale = max_size as f32 / CANVAS_WIDTH.max(CANVAS_HEIGHT) as f32;
        let width = (CANVAS_WIDTH as f32 * scale) as u32;
        let height = (CANVAS_HEIGHT as f32 * scale) as u32;

        // Get all pixels
        let pixels = self.db.get_all_pixels().await?;

        // Create image
        let mut img: RgbImage = ImageBuffer::from_fn(width, height, |_, _| Rgb(BG_COLOR));

        // Draw scaled pixels
        for (px, py, r, g, b) in pixels {
            let ix = (px as f32 * scale) as u32;
            let iy = (py as f32 * scale) as u32;
            if ix < width && iy < height {
                img.put_pixel(ix, iy, Rgb([r as u8, g as u8, b as u8]));
            }
        }

        // Encode to PNG
        let mut buffer = Vec::new();
        let encoder = PngEncoder::new(&mut buffer);
        encoder.write_image(img.as_raw(), width, height, image::ExtendedColorType::Rgb8)?;

        Ok(buffer)
    }

    /// Get canvas data as binary (for efficient transfer)
    /// Format: [width: u32][height: u32][pixels: (x: u16, y: u16, r: u8, g: u8, b: u8)...]
    pub async fn get_canvas_binary(&self) -> Result<Vec<u8>> {
        let pixels = self.db.get_all_pixels().await?;

        let mut data = Vec::with_capacity(8 + pixels.len() * 7);
        data.extend_from_slice(&CANVAS_WIDTH.to_be_bytes());
        data.extend_from_slice(&CANVAS_HEIGHT.to_be_bytes());

        for (x, y, r, g, b) in pixels {
            data.extend_from_slice(&(x as u16).to_be_bytes());
            data.extend_from_slice(&(y as u16).to_be_bytes());
            data.push(r as u8);
            data.push(g as u8);
            data.push(b as u8);
        }

        Ok(data)
    }
}
