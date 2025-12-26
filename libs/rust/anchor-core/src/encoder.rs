//! ANCHOR protocol payload encoder

use bitcoin::script::{Builder, PushBytesBuf};
use bitcoin::{ScriptBuf, Txid};

use crate::{Anchor, AnchorKind, ParsedAnchorMessage, ANCHOR_MAGIC};

/// Encode an ANCHOR message to a raw payload
pub fn encode_anchor_payload(message: &ParsedAnchorMessage) -> Vec<u8> {
    let mut payload =
        Vec::with_capacity(4 + 1 + 1 + message.anchors.len() * 9 + message.body.len());

    // Magic bytes
    payload.extend_from_slice(&ANCHOR_MAGIC);

    // Kind
    payload.push(u8::from(message.kind));

    // Anchor count
    payload.push(message.anchors.len() as u8);

    // Anchors
    for anchor in &message.anchors {
        payload.extend_from_slice(&anchor.txid_prefix);
        payload.push(anchor.vout);
    }

    // Body
    payload.extend_from_slice(&message.body);

    payload
}

/// Create an OP_RETURN script containing an ANCHOR message
pub fn create_anchor_script(message: &ParsedAnchorMessage) -> ScriptBuf {
    let payload = encode_anchor_payload(message);
    let push_bytes =
        PushBytesBuf::try_from(payload).expect("ANCHOR payload should fit in push bytes");

    Builder::new()
        .push_opcode(bitcoin::opcodes::all::OP_RETURN)
        .push_slice(push_bytes.as_push_bytes())
        .into_script()
}

/// Builder for creating ANCHOR messages
#[derive(Debug, Clone)]
pub struct AnchorMessageBuilder {
    kind: AnchorKind,
    anchors: Vec<Anchor>,
    body: Vec<u8>,
}

impl AnchorMessageBuilder {
    /// Create a new builder for a root message
    pub fn new() -> Self {
        Self {
            kind: AnchorKind::Generic,
            anchors: Vec::new(),
            body: Vec::new(),
        }
    }

    /// Set the message kind
    pub fn kind(mut self, kind: AnchorKind) -> Self {
        self.kind = kind;
        self
    }

    /// Set the message as a text message
    pub fn text(mut self, text: &str) -> Self {
        self.kind = AnchorKind::Text;
        self.body = text.as_bytes().to_vec();
        self
    }

    /// Add a parent reference (anchor)
    pub fn add_anchor(mut self, txid: &Txid, vout: u8) -> Self {
        self.anchors.push(Anchor::from_txid(txid, vout));
        self
    }

    /// Add a raw anchor
    pub fn add_raw_anchor(mut self, txid_prefix: [u8; 8], vout: u8) -> Self {
        self.anchors.push(Anchor { txid_prefix, vout });
        self
    }

    /// Set the reply parent (canonical parent as first anchor)
    pub fn reply_to(self, txid: &Txid, vout: u8) -> Self {
        // Insert at the beginning to make it the canonical parent
        let anchor = Anchor::from_txid(txid, vout);
        let mut builder = self;
        builder.anchors.insert(0, anchor);
        builder
    }

    /// Set the message body
    pub fn body(mut self, body: Vec<u8>) -> Self {
        self.body = body;
        self
    }

    /// Build the message
    pub fn build(self) -> ParsedAnchorMessage {
        ParsedAnchorMessage {
            kind: self.kind,
            anchors: self.anchors,
            body: self.body,
        }
    }

    /// Build and encode to raw bytes
    pub fn encode(self) -> Vec<u8> {
        encode_anchor_payload(&self.build())
    }

    /// Build and create an OP_RETURN script
    pub fn to_script(self) -> ScriptBuf {
        create_anchor_script(&self.build())
    }

    /// Get the anchors (without consuming the builder)
    pub fn get_anchors(&self) -> Vec<Anchor> {
        self.anchors.clone()
    }

    /// Get the body (without consuming the builder)
    pub fn get_body(&self) -> Vec<u8> {
        self.body.clone()
    }

    /// Get the kind (without consuming the builder)
    pub fn get_kind(&self) -> AnchorKind {
        self.kind
    }
}

impl Default for AnchorMessageBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parse_anchor_payload;
    #[allow(unused_imports)]
    use bitcoin::hashes::Hash;

    #[test]
    fn test_encode_root_message() {
        let msg = AnchorMessageBuilder::new().text("Hello, ANCHOR!").build();

        let encoded = encode_anchor_payload(&msg);

        assert_eq!(&encoded[0..4], &ANCHOR_MAGIC);
        assert_eq!(encoded[4], 1); // kind = Text
        assert_eq!(encoded[5], 0); // no anchors
        assert_eq!(&encoded[6..], b"Hello, ANCHOR!");
    }

    #[test]
    fn test_encode_reply() {
        let parent_txid = Txid::from_byte_array([
            0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x9a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ]);

        let msg = AnchorMessageBuilder::new()
            .reply_to(&parent_txid, 0)
            .text("This is a reply")
            .build();

        let encoded = encode_anchor_payload(&msg);
        let decoded = parse_anchor_payload(&encoded).unwrap();

        assert_eq!(decoded.anchors.len(), 1);
        assert!(decoded.anchors[0].matches_txid(&parent_txid));
        assert_eq!(decoded.body_as_text(), Some("This is a reply"));
    }

    #[test]
    fn test_create_script() {
        let msg = AnchorMessageBuilder::new().text("Test").build();

        let script = create_anchor_script(&msg);

        assert!(script.is_op_return());
    }

    #[test]
    fn test_builder_chain() {
        let txid1 = Txid::from_byte_array([1u8; 32]);
        let txid2 = Txid::from_byte_array([2u8; 32]);

        let msg = AnchorMessageBuilder::new()
            .kind(AnchorKind::State)
            .reply_to(&txid1, 0)
            .add_anchor(&txid2, 1)
            .body(vec![0x01, 0x02, 0x03])
            .build();

        assert_eq!(msg.kind, AnchorKind::State);
        assert_eq!(msg.anchors.len(), 2);
        assert!(msg.anchors[0].matches_txid(&txid1)); // canonical parent
        assert!(msg.anchors[1].matches_txid(&txid2)); // additional reference
    }
}
