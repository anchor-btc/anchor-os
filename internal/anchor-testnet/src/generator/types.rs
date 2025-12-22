//! Types for the message generator

use crate::config::MessageType;
use serde::{Deserialize, Serialize};

/// Carrier types for transactions
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CarrierType {
    OpReturn = 0,
    Inscription = 1,
    Stamps = 2,
    TaprootAnnex = 3,
    WitnessData = 4,
}

impl CarrierType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CarrierType::OpReturn => "op_return",
            CarrierType::Inscription => "inscription",
            CarrierType::Stamps => "stamps",
            CarrierType::TaprootAnnex => "taproot_annex",
            CarrierType::WitnessData => "witness_data",
        }
    }

    pub fn from_u8(val: u8) -> Self {
        match val {
            0 => CarrierType::OpReturn,
            1 => CarrierType::Inscription,
            2 => CarrierType::Stamps,
            3 => CarrierType::TaprootAnnex,
            4 => CarrierType::WitnessData,
            _ => CarrierType::OpReturn,
        }
    }
}

/// Result of creating a message
#[derive(Debug)]
pub struct MessageResult {
    pub txid: String,
    pub vout: u32,
    pub message_type: MessageType,
    pub is_reply: bool,
    pub parent_txid: Option<String>,
    pub parent_vout: Option<u32>,
    pub carrier: CarrierType,
}

/// Response from wallet create-message endpoint
#[derive(Debug, Deserialize)]
pub struct CreateMessageResponse {
    pub txid: String,
    pub vout: u32,
    #[allow(dead_code)]
    pub hex: String,
    pub carrier: u8,
    #[allow(dead_code)]
    pub carrier_name: String,
}

/// Response from wallet mine endpoint
#[derive(Debug, Deserialize)]
pub struct MineResponse {
    pub blocks: Vec<String>,
}

/// Response from wallet balance endpoint
#[derive(Debug, Deserialize)]
pub struct BalanceResponse {
    #[allow(dead_code)]
    pub confirmed: f64,
    #[allow(dead_code)]
    pub unconfirmed: f64,
    pub total: f64,
}

/// Request for creating a message
#[derive(Debug, Serialize)]
pub struct CreateMessageRequest {
    pub kind: u8,
    pub body: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub body_is_hex: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_txid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_vout: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carrier: Option<u8>,
}

