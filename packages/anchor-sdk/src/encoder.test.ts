import { describe, it, expect } from "vitest";
import {
  encodeAnchorPayload,
  encodeTextMessage,
  encodeRootMessage,
  encodeReplyMessage,
  createMessage,
  txidToPrefix,
  hexToBytes,
  bytesToHex,
  maxBodySize,
} from "./encoder.js";
import { parseAnchorPayload, isAnchorPayload } from "./parser.js";
import { AnchorKind, ANCHOR_MAGIC } from "./types.js";

describe("encoder", () => {
  it("should encode root message", () => {
    const payload = encodeRootMessage("Hello, ANCHOR!");

    // Check magic
    expect(payload.slice(0, 4)).toEqual(ANCHOR_MAGIC);

    // Check kind (text = 1)
    expect(payload[4]).toBe(1);

    // Check anchor count (0 for root)
    expect(payload[5]).toBe(0);

    // Check body
    const body = new TextDecoder().decode(payload.slice(6));
    expect(body).toBe("Hello, ANCHOR!");
  });

  it("should encode reply message", () => {
    const parentTxid =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const payload = encodeReplyMessage("Reply!", parentTxid, 0);

    // Check magic
    expect(payload.slice(0, 4)).toEqual(ANCHOR_MAGIC);

    // Check kind (text = 1)
    expect(payload[4]).toBe(1);

    // Check anchor count (1 for reply)
    expect(payload[5]).toBe(1);

    // Check body starts after magic + kind + count + anchor (9 bytes)
    const body = new TextDecoder().decode(payload.slice(6 + 9));
    expect(body).toBe("Reply!");
  });

  it("should roundtrip encode/decode", () => {
    const original = createMessage({
      kind: AnchorKind.Text,
      body: "Test message",
      anchors: [
        { txid: "abcd".repeat(16), vout: 1 },
        { txid: "1234".repeat(16), vout: 2 },
      ],
    });

    const encoded = encodeAnchorPayload(original);
    const decoded = parseAnchorPayload(encoded);

    expect(decoded.kind).toBe(original.kind);
    expect(decoded.anchors.length).toBe(original.anchors.length);
    expect(decoded.anchors[0].vout).toBe(1);
    expect(decoded.anchors[1].vout).toBe(2);
    expect(new TextDecoder().decode(decoded.body)).toBe("Test message");
  });

  it("should detect ANCHOR payload", () => {
    const payload = encodeRootMessage("test");
    expect(isAnchorPayload(payload)).toBe(true);

    const notAnchor = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(isAnchorPayload(notAnchor)).toBe(false);
  });

  it("should calculate max body size", () => {
    // 80 - 4 (magic) - 1 (kind) - 1 (count) = 74 for root
    expect(maxBodySize(0)).toBe(74);

    // 80 - 6 - 9 = 65 for 1 anchor
    expect(maxBodySize(1)).toBe(65);

    // 80 - 6 - 18 = 56 for 2 anchors
    expect(maxBodySize(2)).toBe(56);
  });

  it("should convert txid to prefix", () => {
    const txid =
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const prefix = txidToPrefix(txid);
    expect(prefix.length).toBe(8);
  });

  it("should handle hex conversion", () => {
    const hex = "deadbeef";
    const bytes = hexToBytes(hex);
    expect(bytes).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

    const back = bytesToHex(bytes);
    expect(back).toBe(hex);
  });
});

