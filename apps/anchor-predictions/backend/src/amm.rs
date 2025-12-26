//! Automated Market Maker (AMM) for Binary Prediction Markets
//!
//! Uses Constant Product Market Maker (CPMM) formula:
//! k = yes_pool * no_pool (constant)
//!
//! Prices:
//! - price_yes = no_pool / (yes_pool + no_pool)
//! - price_no = yes_pool / (yes_pool + no_pool)
//!
//! When buying YES shares:
//! 1. User deposits sats
//! 2. Sats are converted to shares at current price
//! 3. YES pool decreases, NO pool increases to maintain k

/// Initial liquidity for new markets (in pool units, not sats)
pub const INITIAL_LIQUIDITY: i64 = 1_000_000_000; // 1 billion units

/// AMM state for a market
#[derive(Debug, Clone)]
pub struct AmmState {
    pub yes_pool: i64,
    pub no_pool: i64,
    pub k: i128, // Use i128 to prevent overflow
}

impl AmmState {
    /// Create new AMM state with initial liquidity
    #[cfg(test)]
    pub fn new(initial_liquidity: i64) -> Self {
        let k = (initial_liquidity as i128) * (initial_liquidity as i128);
        Self {
            yes_pool: initial_liquidity,
            no_pool: initial_liquidity,
            k,
        }
    }

    /// Create AMM state from existing pool values
    pub fn from_pools(yes_pool: i64, no_pool: i64) -> Self {
        let k = (yes_pool as i128) * (no_pool as i128);
        Self {
            yes_pool,
            no_pool,
            k,
        }
    }

    /// Get current YES price (0.0 to 1.0)
    pub fn yes_price(&self) -> f64 {
        let total = self.yes_pool + self.no_pool;
        if total == 0 {
            return 0.5;
        }
        self.no_pool as f64 / total as f64
    }

    /// Get current NO price (0.0 to 1.0)
    pub fn no_price(&self) -> f64 {
        let total = self.yes_pool + self.no_pool;
        if total == 0 {
            return 0.5;
        }
        self.yes_pool as f64 / total as f64
    }

    /// Calculate shares received when buying YES with amount_sats
    /// Returns (shares_out, new_yes_pool, new_no_pool, avg_price)
    pub fn buy_yes(&self, amount_sats: i64) -> BuyResult {
        // Convert sats to pool units (1:1 for simplicity)
        let amount = amount_sats;

        // New NO pool after adding liquidity
        let new_no_pool = self.no_pool + amount;

        // Calculate new YES pool to maintain k
        // k = yes_pool * no_pool
        // new_yes_pool = k / new_no_pool
        let new_yes_pool = (self.k / new_no_pool as i128) as i64;

        // Shares out = decrease in YES pool
        let shares_out = self.yes_pool - new_yes_pool;

        // Average price = amount_paid / shares_received
        let avg_price = if shares_out > 0 {
            amount as f64 / shares_out as f64
        } else {
            1.0
        };

        // Price impact = (new_price - old_price) / old_price
        let old_yes_price = self.yes_price();
        let new_total = new_yes_pool + new_no_pool;
        let new_yes_price = new_no_pool as f64 / new_total as f64;
        let price_impact = if old_yes_price > 0.0 {
            (new_yes_price - old_yes_price) / old_yes_price
        } else {
            0.0
        };

        BuyResult {
            shares_out,
            new_yes_pool,
            new_no_pool,
            avg_price,
            new_yes_price,
            new_no_price: new_yes_pool as f64 / new_total as f64,
            price_impact,
        }
    }

    /// Calculate shares received when buying NO with amount_sats
    /// Returns (shares_out, new_yes_pool, new_no_pool, avg_price)
    pub fn buy_no(&self, amount_sats: i64) -> BuyResult {
        // Convert sats to pool units (1:1 for simplicity)
        let amount = amount_sats;

        // New YES pool after adding liquidity
        let new_yes_pool = self.yes_pool + amount;

        // Calculate new NO pool to maintain k
        let new_no_pool = (self.k / new_yes_pool as i128) as i64;

        // Shares out = decrease in NO pool
        let shares_out = self.no_pool - new_no_pool;

        // Average price = amount_paid / shares_received
        let avg_price = if shares_out > 0 {
            amount as f64 / shares_out as f64
        } else {
            1.0
        };

        // Price impact
        let old_no_price = self.no_price();
        let new_total = new_yes_pool + new_no_pool;
        let new_no_price = new_yes_pool as f64 / new_total as f64;
        let price_impact = if old_no_price > 0.0 {
            (new_no_price - old_no_price) / old_no_price
        } else {
            0.0
        };

        BuyResult {
            shares_out,
            new_yes_pool,
            new_no_pool,
            avg_price,
            new_yes_price: new_no_pool as f64 / new_total as f64,
            new_no_price,
            price_impact,
        }
    }

    /// Calculate quote for buying outcome
    pub fn quote(&self, outcome: i16, amount_sats: i64) -> BuyResult {
        match outcome {
            0 => self.buy_no(amount_sats),
            1 => self.buy_yes(amount_sats),
            _ => BuyResult::invalid(),
        }
    }
}

/// Result of a buy operation
#[derive(Debug, Clone)]
pub struct BuyResult {
    pub shares_out: i64,
    pub new_yes_pool: i64,
    pub new_no_pool: i64,
    pub avg_price: f64,
    pub new_yes_price: f64,
    pub new_no_price: f64,
    pub price_impact: f64,
}

impl BuyResult {
    pub fn invalid() -> Self {
        Self {
            shares_out: 0,
            new_yes_pool: 0,
            new_no_pool: 0,
            avg_price: 0.0,
            new_yes_price: 0.0,
            new_no_price: 0.0,
            price_impact: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_prices() {
        let amm = AmmState::new(1_000_000);
        assert!((amm.yes_price() - 0.5).abs() < 0.001);
        assert!((amm.no_price() - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_buy_yes() {
        let amm = AmmState::new(1_000_000);
        let result = amm.buy_yes(100_000);

        // After buying YES, YES price should increase
        assert!(result.new_yes_price > 0.5);
        assert!(result.new_no_price < 0.5);

        // Should receive positive shares
        assert!(result.shares_out > 0);

        // k should remain approximately constant (may differ slightly due to integer division)
        let new_k = (result.new_yes_pool as i128) * (result.new_no_pool as i128);
        let k_diff_pct = ((amm.k - new_k).abs() as f64 / amm.k as f64) * 100.0;
        assert!(
            k_diff_pct < 0.01,
            "k deviated by more than 0.01%: {}",
            k_diff_pct
        );
    }

    #[test]
    fn test_buy_no() {
        let amm = AmmState::new(1_000_000);
        let result = amm.buy_no(100_000);

        // After buying NO, NO price should increase
        assert!(result.new_no_price > 0.5);
        assert!(result.new_yes_price < 0.5);

        // Should receive positive shares
        assert!(result.shares_out > 0);
    }

    #[test]
    fn test_large_bet_price_impact() {
        let amm = AmmState::new(1_000_000);

        // Small bet = small impact
        let small = amm.buy_yes(1_000);
        assert!(small.price_impact < 0.01);

        // Large bet = larger impact
        let large = amm.buy_yes(500_000);
        assert!(large.price_impact > small.price_impact);
    }
}
