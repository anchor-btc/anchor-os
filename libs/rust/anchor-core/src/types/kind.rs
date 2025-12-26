//! AnchorKind enum - message type definitions

use serde::{Deserialize, Serialize};

/// Represents the kind/type of an ANCHOR message
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum AnchorKind {
    /// Generic/unspecified type
    Generic = 0,
    /// Text message (body interpreted as UTF-8)
    Text = 1,
    /// State update
    State = 2,
    /// Vote
    Vote = 3,
    /// Image (body is raw image bytes: PNG, JPEG, GIF, WebP)
    Image = 4,

    // Oracle types (30-39)
    /// Oracle registration/update
    Oracle = 30,
    /// Oracle attestation (signed outcome)
    OracleAttestation = 31,
    /// Dispute an oracle attestation
    OracleDispute = 32,
    /// Slash oracle stake (after dispute resolution)
    OracleSlash = 33,

    // Prediction Market types (40-49)
    /// Create a new prediction market
    MarketCreate = 40,
    /// Place a bet on a market outcome
    PlaceBet = 41,
    /// Resolve a market (oracle attestation)
    MarketResolve = 42,
    /// Claim winnings from resolved market
    ClaimWinnings = 43,

    /// Custom type (value 5-255, excluding reserved ranges)
    Custom(u8),
}

impl From<u8> for AnchorKind {
    fn from(value: u8) -> Self {
        match value {
            0 => AnchorKind::Generic,
            1 => AnchorKind::Text,
            2 => AnchorKind::State,
            3 => AnchorKind::Vote,
            4 => AnchorKind::Image,
            // Oracle types
            30 => AnchorKind::Oracle,
            31 => AnchorKind::OracleAttestation,
            32 => AnchorKind::OracleDispute,
            33 => AnchorKind::OracleSlash,
            // Prediction Market types
            40 => AnchorKind::MarketCreate,
            41 => AnchorKind::PlaceBet,
            42 => AnchorKind::MarketResolve,
            43 => AnchorKind::ClaimWinnings,
            n => AnchorKind::Custom(n),
        }
    }
}

impl From<AnchorKind> for u8 {
    fn from(kind: AnchorKind) -> Self {
        match kind {
            AnchorKind::Generic => 0,
            AnchorKind::Text => 1,
            AnchorKind::State => 2,
            AnchorKind::Vote => 3,
            AnchorKind::Image => 4,
            // Oracle types
            AnchorKind::Oracle => 30,
            AnchorKind::OracleAttestation => 31,
            AnchorKind::OracleDispute => 32,
            AnchorKind::OracleSlash => 33,
            // Prediction Market types
            AnchorKind::MarketCreate => 40,
            AnchorKind::PlaceBet => 41,
            AnchorKind::MarketResolve => 42,
            AnchorKind::ClaimWinnings => 43,
            AnchorKind::Custom(n) => n,
        }
    }
}
