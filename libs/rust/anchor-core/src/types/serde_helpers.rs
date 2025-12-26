//! Serde helpers for hex encoding of various types

use bitcoin::Txid;
use serde::{Deserialize, Deserializer, Serializer};
use std::str::FromStr;

/// Serialize/deserialize Vec<u8> as hex string
pub mod hex_bytes {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S, T>(bytes: T, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: AsRef<[u8]>,
    {
        serializer.serialize_str(&hex::encode(bytes.as_ref()))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        hex::decode(&s).map_err(serde::de::Error::custom)
    }
}

/// Serialize/deserialize [u8; 8] as hex string
pub mod hex_array_8 {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8; 8], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&hex::encode(bytes))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 8], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(&s).map_err(serde::de::Error::custom)?;
        bytes
            .try_into()
            .map_err(|_| serde::de::Error::custom("invalid length for [u8; 8]"))
    }
}

/// Serialize/deserialize Txid as hex string
pub mod txid_hex {
    use super::*;

    pub fn serialize<S>(txid: &Txid, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&txid.to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Txid, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Txid::from_str(&s).map_err(serde::de::Error::custom)
    }
}

/// Serialize/deserialize Option<Txid> as hex string
pub mod option_txid_hex {
    use super::*;

    pub fn serialize<S>(txid: &Option<Txid>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match txid {
            Some(t) => serializer.serialize_some(&t.to_string()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Txid>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s: Option<String> = Option::deserialize(deserializer)?;
        match s {
            Some(s) => Ok(Some(Txid::from_str(&s).map_err(serde::de::Error::custom)?)),
            None => Ok(None),
        }
    }
}
