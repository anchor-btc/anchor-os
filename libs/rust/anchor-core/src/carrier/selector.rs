//! Carrier selection and detection logic

use std::collections::HashSet;
use std::sync::Arc;

use bitcoin::Transaction;

use super::{
    Carrier, CarrierError, CarrierInfo, CarrierInput, CarrierOutput, CarrierResult, CarrierStatus,
    CarrierType,
};
use crate::{encode_anchor_payload, ParsedAnchorMessage};

/// Preferences for carrier selection
#[derive(Debug, Clone)]
pub struct CarrierPreferences {
    /// Require permanent (non-prunable) storage
    pub require_permanent: bool,

    /// Maximum acceptable fee in satoshis (None = no limit)
    pub max_fee: Option<u64>,

    /// Preferred carriers in order of preference
    pub preferred: Vec<CarrierType>,

    /// Carriers to exclude from selection
    pub exclude: HashSet<CarrierType>,

    /// Fee rate in sat/vB for fee estimation
    pub fee_rate: f64,
}

impl Default for CarrierPreferences {
    fn default() -> Self {
        Self {
            require_permanent: false,
            max_fee: None,
            preferred: vec![
                CarrierType::OpReturn,
                CarrierType::Inscription,
                CarrierType::WitnessData,
                CarrierType::Stamps,
            ],
            exclude: HashSet::new(),
            fee_rate: 1.0, // 1 sat/vB default
        }
    }
}

impl CarrierPreferences {
    /// Create preferences that require permanent storage
    pub fn permanent() -> Self {
        Self {
            require_permanent: true,
            preferred: vec![CarrierType::Stamps],
            ..Default::default()
        }
    }

    /// Create preferences for large data (images, media)
    pub fn large_data() -> Self {
        Self {
            preferred: vec![
                CarrierType::Inscription,
                CarrierType::WitnessData,
            ],
            ..Default::default()
        }
    }

    /// Set fee rate
    pub fn with_fee_rate(mut self, fee_rate: f64) -> Self {
        self.fee_rate = fee_rate;
        self
    }

    /// Set maximum fee
    pub fn with_max_fee(mut self, max_fee: u64) -> Self {
        self.max_fee = Some(max_fee);
        self
    }

    /// Exclude a carrier
    pub fn exclude(mut self, carrier: CarrierType) -> Self {
        self.exclude.insert(carrier);
        self
    }
}

/// Result of carrier detection in a transaction
#[derive(Debug, Clone)]
pub struct DetectedMessage {
    /// Output index where message was found
    pub vout: u32,
    /// Type of carrier used
    pub carrier_type: CarrierType,
    /// Parsed ANCHOR message
    pub message: ParsedAnchorMessage,
}

/// Carrier selector and detector
///
/// Manages multiple carrier implementations and provides:
/// - Automatic carrier selection based on payload and preferences
/// - Detection of ANCHOR messages in transactions
pub struct CarrierSelector {
    carriers: Vec<Arc<dyn Carrier>>,
}

impl CarrierSelector {
    /// Create a new selector with default carriers
    pub fn new() -> Self {
        use super::{
            AnnexCarrier, InscriptionCarrier, OpReturnCarrier, StampsCarrier, WitnessCarrier,
        };

        let carriers: Vec<Arc<dyn Carrier>> = vec![
            Arc::new(OpReturnCarrier::new()),
            Arc::new(InscriptionCarrier::new()),
            Arc::new(StampsCarrier::new()),
            Arc::new(AnnexCarrier::new()),
            Arc::new(WitnessCarrier::new()),
        ];

        Self { carriers }
    }

    /// Create a selector with only OP_RETURN (legacy mode)
    pub fn op_return_only() -> Self {
        use super::OpReturnCarrier;

        Self {
            carriers: vec![Arc::new(OpReturnCarrier::new())],
        }
    }

    /// Get all registered carriers
    pub fn carriers(&self) -> &[Arc<dyn Carrier>] {
        &self.carriers
    }

    /// Get a specific carrier by type
    pub fn get_carrier(&self, carrier_type: CarrierType) -> Option<&dyn Carrier> {
        self.carriers
            .iter()
            .find(|c| c.info().carrier_type == carrier_type)
            .map(|c| c.as_ref())
    }

    /// Select the best carrier for a message
    ///
    /// # Arguments
    /// * `message` - The ANCHOR message to encode
    /// * `prefs` - Selection preferences
    ///
    /// # Returns
    /// The best matching carrier, or an error if none suitable
    pub fn select(
        &self,
        message: &ParsedAnchorMessage,
        prefs: &CarrierPreferences,
    ) -> CarrierResult<&dyn Carrier> {
        let payload = encode_anchor_payload(message);
        let size = payload.len();

        // Filter carriers by capability
        let mut candidates: Vec<(&dyn Carrier, CarrierInfo)> = self
            .carriers
            .iter()
            .map(|c| (c.as_ref(), c.info()))
            .filter(|(_, info)| {
                // Must be able to handle the size
                info.max_size >= size
            })
            .filter(|(_, info)| {
                // Must not be excluded
                !prefs.exclude.contains(&info.carrier_type)
            })
            .filter(|(_, info)| {
                // Must be active or we explicitly allow reserved
                info.status == CarrierStatus::Active || info.status == CarrierStatus::Reserved
            })
            .filter(|(_, info)| {
                // If permanent required, must not be prunable
                !prefs.require_permanent || !info.is_prunable
            })
            .filter(|(carrier, _)| {
                // Check fee limit if specified
                if let Some(max_fee) = prefs.max_fee {
                    let fee = carrier.estimate_fee(size, prefs.fee_rate);
                    fee <= max_fee
                } else {
                    true
                }
            })
            .collect();

        if candidates.is_empty() {
            return Err(CarrierError::NoSuitableCarrier { size });
        }

        // Sort by preference order
        candidates.sort_by(|(_, a), (_, b)| {
            let a_pref = prefs
                .preferred
                .iter()
                .position(|&t| t == a.carrier_type)
                .unwrap_or(usize::MAX);
            let b_pref = prefs
                .preferred
                .iter()
                .position(|&t| t == b.carrier_type)
                .unwrap_or(usize::MAX);
            a_pref.cmp(&b_pref)
        });

        Ok(candidates[0].0)
    }

    /// Encode a message using the best carrier
    pub fn encode(
        &self,
        message: &ParsedAnchorMessage,
        prefs: &CarrierPreferences,
    ) -> CarrierResult<(CarrierType, CarrierOutput)> {
        let carrier = self.select(message, prefs)?;
        let output = carrier.encode(message)?;
        Ok((carrier.info().carrier_type, output))
    }

    /// Detect ANCHOR messages in a transaction
    ///
    /// Checks all outputs and witness data for ANCHOR messages.
    pub fn detect(&self, tx: &Transaction) -> Vec<DetectedMessage> {
        let mut results = Vec::new();

        // Check OP_RETURN and Stamps outputs
        for (vout, output) in tx.output.iter().enumerate() {
            let input = CarrierInput::Script(&output.script_pubkey);

            for carrier in &self.carriers {
                let info = carrier.info();
                // Skip carriers that don't decode from scripts
                if info.carrier_type == CarrierType::TaprootAnnex
                    || info.carrier_type == CarrierType::WitnessData
                    || info.carrier_type == CarrierType::Inscription
                {
                    continue;
                }

                if let Ok(message) = carrier.decode(&input) {
                    results.push(DetectedMessage {
                        vout: vout as u32,
                        carrier_type: info.carrier_type,
                        message,
                    });
                    break; // Only one message per output
                }
            }
        }

        // Check witness data for inscriptions, annex, and raw witness
        for input in &tx.input {
            let witness_items: Vec<Vec<u8>> = input.witness.iter().map(|w| w.to_vec()).collect();
            if witness_items.is_empty() {
                continue;
            }

            let witness_input = CarrierInput::Witness(&witness_items);

            for carrier in &self.carriers {
                let info = carrier.info();
                // Only check witness-based carriers
                if info.carrier_type != CarrierType::TaprootAnnex
                    && info.carrier_type != CarrierType::WitnessData
                    && info.carrier_type != CarrierType::Inscription
                {
                    continue;
                }

                if let Ok(message) = carrier.decode(&witness_input) {
                    results.push(DetectedMessage {
                        vout: 0, // Witness data binds to first sat typically
                        carrier_type: info.carrier_type,
                        message,
                    });
                }
            }
        }

        results
    }
}

impl Default for CarrierSelector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AnchorKind;

    #[test]
    fn test_selector_creation() {
        let selector = CarrierSelector::new();
        assert!(!selector.carriers.is_empty());
    }

    #[test]
    fn test_get_carrier() {
        let selector = CarrierSelector::new();

        let op_return = selector.get_carrier(CarrierType::OpReturn);
        assert!(op_return.is_some());
        assert_eq!(op_return.unwrap().info().carrier_type, CarrierType::OpReturn);
    }

    #[test]
    fn test_select_small_message() {
        let selector = CarrierSelector::new();
        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Hello, ANCHOR!".to_vec(),
        };

        let prefs = CarrierPreferences::default();
        let carrier = selector.select(&message, &prefs).unwrap();

        // Small messages should use OP_RETURN by default
        assert_eq!(carrier.info().carrier_type, CarrierType::OpReturn);
    }

    #[test]
    fn test_select_permanent() {
        let selector = CarrierSelector::new();
        let message = ParsedAnchorMessage {
            kind: AnchorKind::Text,
            anchors: vec![],
            body: b"Permanent message".to_vec(),
        };

        let prefs = CarrierPreferences::permanent();
        let carrier = selector.select(&message, &prefs).unwrap();

        // Should select Stamps for permanent storage
        assert_eq!(carrier.info().carrier_type, CarrierType::Stamps);
        assert!(!carrier.info().is_prunable);
    }

    #[test]
    fn test_preferences_builder() {
        let prefs = CarrierPreferences::default()
            .with_fee_rate(5.0)
            .with_max_fee(10000)
            .exclude(CarrierType::Stamps);

        assert_eq!(prefs.fee_rate, 5.0);
        assert_eq!(prefs.max_fee, Some(10000));
        assert!(prefs.exclude.contains(&CarrierType::Stamps));
    }
}
