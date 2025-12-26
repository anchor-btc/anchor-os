//! Carrier-specific transaction builders
//!
//! Each carrier type has its own module for creating and broadcasting transactions:
//! - `op_return` - Standard OP_RETURN transactions
//! - `stamps` - Bare multisig (Stamps/SRC-20) transactions
//! - `inscription` - Taproot inscription (commit+reveal) transactions
//! - `annex` - Taproot annex transactions
//! - `witness` - Witness data (commit+reveal) transactions

pub mod annex;
pub mod inscription;
pub mod op_return;
pub mod stamps;
pub mod witness;
