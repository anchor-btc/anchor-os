# Kind 10: DNS (Anchor Domains)

The **DNS** kind enables decentralized domain name registration and management on Bitcoin. It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domain names.

## Overview

| Property | Value |
|----------|-------|
| **Kind** | 10 (`0x0A`) |
| **Name** | DNS / Domains |
| **Status** | Extension |
| **Recommended Carrier** | Witness Data (4) |
| **Alternative Carriers** | Inscription (1), Stamps (2) |

::: danger OP_RETURN Not Supported
**OP_RETURN (carrier 0) does NOT work for DNS kind** due to the UTXO-based ownership model.

DNS domains use the first output (vout 0) of the registration transaction as the **ownership UTXO**. Updates and transfers must spend this UTXO as an input to prove ownership. Since **OP_RETURN outputs are unspendable** (they are burned and cannot be used as inputs in future transactions), they cannot be used for DNS:

- **Registration**: Would create an unspendable output, making the domain impossible to update or transfer
- **Updates/Transfers**: Would break the ownership chain by not creating a new spendable ownership UTXO

**Always use Witness Data (4), Inscription (1), or Stamps (2) carriers for DNS transactions.**
:::

## Carrier Selection

| Carrier | ID | Max Size | Cost | Recommended |
|---------|----|---------:|------|-------------|
| **Witness Data** | 4 | ~4 MB | Lowest (75% discount) | ✅ **Yes** |
| Inscription | 1 | ~4 MB | Low (75% discount) | ✅ Yes |
| Stamps | 2 | ~8 KB | High (no discount) | ⚠️ For permanence |
| OP_RETURN | 0 | N/A | N/A | ❌ **No** (unspendable) |

## Supported TLDs

| TLD | Description |
|-----|-------------|
| `.btc` | Primary Bitcoin-focused TLD |
| `.sat` | Satoshi-inspired TLD |
| `.anchor` | Anchor Protocol branded TLD |
| `.anc` | Short form of Anchor |
| `.bit` | Classic Bitcoin domain TLD |

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain (first-come-first-served) |
| UPDATE | `0x02` | Update domain records (must anchor to original registration) |
| TRANSFER | `0x03` | Transfer domain ownership to new address |

## Complete Payload Format

### Full Anchor Message Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANCHOR PROTOCOL MESSAGE                       │
├─────────────────────────────────────────────────────────────────┤
│ Magic Bytes  │ Kind │ Anchor Count │ Anchors     │ DNS Payload  │
│ (4 bytes)    │ (1)  │ (1 byte)     │ (9 × count) │ (variable)   │
│ a1 1c 00 01  │ 0A   │ 00-FF        │ [...]       │ [...]        │
└─────────────────────────────────────────────────────────────────┘
```

### DNS Payload Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                       DNS PAYLOAD                                │
├───────────┬───────────┬───────────────────┬─────────────────────┤
│ Operation │ Name Len  │ Domain Name       │ Records...          │
│ (1 byte)  │ (1 byte)  │ (name_len bytes)  │ (variable)          │
├───────────┼───────────┼───────────────────┼─────────────────────┤
│ 01/02/03  │ 00-FF     │ UTF-8 string      │ [record][record]... │
└───────────┴───────────┴───────────────────┴─────────────────────┘
```

### Single Record Format

```
┌─────────────────────────────────────────────────────────────────┐
│                       DNS RECORD                                 │
├───────────┬───────────┬───────────┬─────────────────────────────┤
│ Type      │ TTL       │ Data Len  │ Record Data                 │
│ (1 byte)  │ (2 bytes) │ (1 byte)  │ (data_len bytes)            │
├───────────┼───────────┼───────────┼─────────────────────────────┤
│ 01-07     │ BE u16    │ 00-FF     │ Type-specific data          │
└───────────┴───────────┴───────────┴─────────────────────────────┘
```

## Record Types

| Type | Value | Data Format | Example |
|------|-------|-------------|---------|
| A | `0x01` | 4 bytes (IPv4) | `93.184.216.34` → `5d b8 d8 22` |
| AAAA | `0x02` | 16 bytes (IPv6) | `2001:db8::1` → `20 01 0d b8 ...` |
| CNAME | `0x03` | UTF-8 string | `www.example.com` |
| TXT | `0x04` | UTF-8 string | `v=spf1 include:...` |
| MX | `0x05` | u16 priority + UTF-8 domain | `00 0a mail.example.com` |
| NS | `0x06` | UTF-8 string | `ns1.example.com` |
| SRV | `0x07` | u16×3 (pri, weight, port) + target | `00 0a 00 01 0f a1 xmpp.example.com` |

### Record Data Encoding Details

#### A Record (Type 1)
```
IPv4: 93.184.216.34
Bytes: [93, 184, 216, 34] = [0x5D, 0xB8, 0xD8, 0x22]
```

#### AAAA Record (Type 2)
```
IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
Bytes: [0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0x00, 0x00, 
        0x00, 0x00, 0x8A, 0x2E, 0x03, 0x70, 0x73, 0x34]
```

#### MX Record (Type 5)
```
Priority: 10 (u16 BE) = [0x00, 0x0A]
Domain: "mail.example.btc" (UTF-8)
Full: [0x00, 0x0A, 0x6D, 0x61, 0x69, 0x6C, ...]
```

#### SRV Record (Type 7)
```
Priority: 10  (u16 BE) = [0x00, 0x0A]
Weight:   1   (u16 BE) = [0x00, 0x01]
Port:     443 (u16 BE) = [0x01, 0xBB]
Target: "server.example.btc" (UTF-8)
Full: [0x00, 0x0A, 0x00, 0x01, 0x01, 0xBB, 0x73, 0x65, ...]
```

## Domain Ownership Model

### Registration (First UTXO)
When a domain is registered, the **first output (vout 0)** of the transaction becomes the ownership UTXO. Only the owner of this UTXO can update or transfer the domain.

### Update Chain
Updates must **anchor** to the current ownership UTXO by including it in the anchors array:

```
Registration TX: abc123...  (vout 0 = ownership UTXO)
        ↓ anchor
Update TX 1: def456...      (vout 0 = new ownership UTXO)
        ↓ anchor
Update TX 2: ghi789...      (vout 0 = new ownership UTXO)
```

### Transfer
Transfer moves ownership to a new address. The transaction must:
1. Anchor to the current ownership UTXO
2. Use TRANSFER operation
3. Send the output to the new owner's address

## TypeScript Interfaces

```typescript
// DNS Operations
enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

// Record Types
enum RecordType {
  A = 1,      // IPv4 address
  AAAA = 2,   // IPv6 address
  CNAME = 3,  // Canonical name
  TXT = 4,    // Text record
  MX = 5,     // Mail exchange
  NS = 6,     // Name server
  SRV = 7,    // Service record
}

// DNS Record
interface DnsRecord {
  type: RecordType;
  ttl: number;        // 0-65535 seconds
  value: string;
  priority?: number;  // For MX, SRV
  weight?: number;    // For SRV
  port?: number;      // For SRV
}

// Full DNS Payload
interface DnsPayload {
  operation: DnsOperation;
  name: string;         // e.g., "example.btc"
  records: DnsRecord[];
}

// Anchor reference (for updates/transfers)
interface Anchor {
  txidPrefix: Uint8Array; // First 8 bytes of txid
  vout: number;           // Output index (0-255)
}
```

## Rust Structures

```rust
/// DNS Operations
#[repr(u8)]
pub enum DnsOperation {
    Register = 0x01,
    Update = 0x02,
    Transfer = 0x03,
}

/// Record Types
#[repr(u8)]
pub enum RecordType {
    A = 1,
    AAAA = 2,
    CNAME = 3,
    TXT = 4,
    MX = 5,
    NS = 6,
    SRV = 7,
}

/// A DNS record
pub struct DnsRecord {
    pub record_type: RecordType,
    pub ttl: u16,
    pub value: String,
    pub priority: Option<u16>,
    pub weight: Option<u16>,
    pub port: Option<u16>,
}

/// DNS Payload
pub struct DnsPayload {
    pub operation: DnsOperation,
    pub name: String,
    pub records: Vec<DnsRecord>,
}
```

## Rust Parsing Implementation

### Complete Decoding

```rust
impl DnsPayload {
    /// Parse a DNS payload from binary data
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 3 {
            return None;
        }

        let operation = DnsOperation::try_from(bytes[0]).ok()?;
        let name_len = bytes[1] as usize;

        if bytes.len() < 2 + name_len {
            return None;
        }

        let name = String::from_utf8(bytes[2..2 + name_len].to_vec()).ok()?;

        // Validate domain name
        if !is_valid_domain_name(&name) {
            return None;
        }

        // Parse records
        let mut records = Vec::new();
        let mut offset = 2 + name_len;

        while offset + 4 <= bytes.len() {
            let record_type = RecordType::try_from(bytes[offset]).ok()?;
            let ttl = u16::from_be_bytes([bytes[offset + 1], bytes[offset + 2]]);
            let data_len = bytes[offset + 3] as usize;

            if offset + 4 + data_len > bytes.len() {
                break;
            }

            let data = &bytes[offset + 4..offset + 4 + data_len];
            let record = parse_record(record_type, ttl, data)?;
            records.push(record);

            offset += 4 + data_len;
        }

        Some(DnsPayload { operation, name, records })
    }

    /// Encode the payload to binary
    pub fn to_bytes(&self) -> Vec<u8> {
        let name_bytes = self.name.as_bytes();
        let mut result = Vec::new();

        result.push(self.operation as u8);
        result.push(name_bytes.len() as u8);
        result.extend_from_slice(name_bytes);

        for record in &self.records {
            result.extend_from_slice(&encode_record(record));
        }

        result
    }
}

/// Parse a single DNS record from binary data
fn parse_record(record_type: RecordType, ttl: u16, data: &[u8]) -> Option<DnsRecord> {
    use std::net::{Ipv4Addr, Ipv6Addr};

    let (value, priority, weight, port) = match record_type {
        RecordType::A => {
            if data.len() != 4 {
                return None;
            }
            let ip = Ipv4Addr::new(data[0], data[1], data[2], data[3]);
            (ip.to_string(), None, None, None)
        }
        RecordType::AAAA => {
            if data.len() != 16 {
                return None;
            }
            let segments: [u16; 8] = [
                u16::from_be_bytes([data[0], data[1]]),
                u16::from_be_bytes([data[2], data[3]]),
                u16::from_be_bytes([data[4], data[5]]),
                u16::from_be_bytes([data[6], data[7]]),
                u16::from_be_bytes([data[8], data[9]]),
                u16::from_be_bytes([data[10], data[11]]),
                u16::from_be_bytes([data[12], data[13]]),
                u16::from_be_bytes([data[14], data[15]]),
            ];
            let ip = Ipv6Addr::new(
                segments[0], segments[1], segments[2], segments[3],
                segments[4], segments[5], segments[6], segments[7],
            );
            (ip.to_string(), None, None, None)
        }
        RecordType::CNAME | RecordType::NS | RecordType::TXT => {
            let value = String::from_utf8(data.to_vec()).ok()?;
            (value, None, None, None)
        }
        RecordType::MX => {
            if data.len() < 3 {
                return None;
            }
            let priority = u16::from_be_bytes([data[0], data[1]]);
            let domain = String::from_utf8(data[2..].to_vec()).ok()?;
            (domain, Some(priority), None, None)
        }
        RecordType::SRV => {
            if data.len() < 7 {
                return None;
            }
            let priority = u16::from_be_bytes([data[0], data[1]]);
            let weight = u16::from_be_bytes([data[2], data[3]]);
            let port = u16::from_be_bytes([data[4], data[5]]);
            let target = String::from_utf8(data[6..].to_vec()).ok()?;
            (target, Some(priority), Some(weight), Some(port))
        }
    };

    Some(DnsRecord {
        record_type,
        ttl,
        value,
        priority,
        weight,
        port,
    })
}

/// Encode a single DNS record to binary
fn encode_record(record: &DnsRecord) -> Vec<u8> {
    use std::net::{Ipv4Addr, Ipv6Addr};
    
    let mut data = Vec::new();

    match record.record_type {
        RecordType::A => {
            if let Ok(ip) = record.value.parse::<Ipv4Addr>() {
                data.extend_from_slice(&ip.octets());
            }
        }
        RecordType::AAAA => {
            if let Ok(ip) = record.value.parse::<Ipv6Addr>() {
                data.extend_from_slice(&ip.octets());
            }
        }
        RecordType::CNAME | RecordType::NS | RecordType::TXT => {
            data.extend_from_slice(record.value.as_bytes());
        }
        RecordType::MX => {
            let priority = record.priority.unwrap_or(10);
            data.extend_from_slice(&priority.to_be_bytes());
            data.extend_from_slice(record.value.as_bytes());
        }
        RecordType::SRV => {
            let priority = record.priority.unwrap_or(0);
            let weight = record.weight.unwrap_or(0);
            let port = record.port.unwrap_or(0);
            data.extend_from_slice(&priority.to_be_bytes());
            data.extend_from_slice(&weight.to_be_bytes());
            data.extend_from_slice(&port.to_be_bytes());
            data.extend_from_slice(record.value.as_bytes());
        }
    }

    let mut result = Vec::with_capacity(4 + data.len());
    result.push(record.record_type as u8);
    result.extend_from_slice(&record.ttl.to_be_bytes());
    result.push(data.len() as u8);
    result.extend_from_slice(&data);

    result
}

/// Validate domain name
fn is_valid_domain_name(name: &str) -> bool {
    const SUPPORTED_TLDS: &[&str] = &[".btc", ".sat", ".anchor", ".anc", ".bit"];
    
    let tld = SUPPORTED_TLDS.iter().find(|t| name.ends_with(*t));
    let tld = match tld {
        Some(t) => *t,
        None => return false,
    };

    let name_part = &name[..name.len() - tld.len()];

    if name_part.is_empty() || name.len() > 255 {
        return false;
    }

    let valid_chars = name_part
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.');

    let no_leading_trailing_hyphen = !name_part.starts_with('-')
        && !name_part.ends_with('-')
        && !name_part.contains(".-")
        && !name_part.contains("-.");

    valid_chars && no_leading_trailing_hyphen
}
```

## Complete Encoding Example

### TypeScript

```typescript
const ANCHOR_MAGIC = new Uint8Array([0xa1, 0x1c, 0x00, 0x01]);
const ANCHOR_KIND_DNS = 10;

function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(payload.name);
  
  if (nameBytes.length > 255) {
    throw new Error('Domain name too long (max 255 bytes)');
  }
  
  // Encode all records
  const recordBuffers = payload.records.map(encodeRecord);
  const totalRecordBytes = recordBuffers.reduce((sum, buf) => sum + buf.length, 0);
  
  const totalSize = 2 + nameBytes.length + totalRecordBytes;
  const result = new Uint8Array(totalSize);
  
  let offset = 0;
  result[offset++] = payload.operation;
  result[offset++] = nameBytes.length;
  result.set(nameBytes, offset);
  offset += nameBytes.length;
  
  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset);
    offset += recordBuf.length;
  }
  
  return result;
}

function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder();
  let data: Uint8Array;
  
  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value);
      break;
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value);
      break;
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value);
      break;
    case RecordType.MX: {
      const priority = record.priority ?? 10;
      const domain = encoder.encode(record.value);
      data = new Uint8Array(2 + domain.length);
      new DataView(data.buffer).setUint16(0, priority, false); // big-endian
      data.set(domain, 2);
      break;
    }
    case RecordType.SRV: {
      const priority = record.priority ?? 0;
      const weight = record.weight ?? 0;
      const port = record.port ?? 0;
      const target = encoder.encode(record.value);
      data = new Uint8Array(6 + target.length);
      const view = new DataView(data.buffer);
      view.setUint16(0, priority, false);
      view.setUint16(2, weight, false);
      view.setUint16(4, port, false);
      data.set(target, 6);
      break;
    }
    default:
      throw new Error(`Unknown record type: ${record.type}`);
  }
  
  // Record format: [type: u8][ttl: u16 BE][data_len: u8][data]
  const result = new Uint8Array(4 + data.length);
  const view = new DataView(result.buffer);
  result[0] = record.type;
  view.setUint16(1, record.ttl, false); // big-endian
  result[3] = data.length;
  result.set(data, 4);
  
  return result;
}

function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split('.');
  return new Uint8Array(parts.map(p => parseInt(p, 10)));
}

function ipv6ToBytes(ip: string): Uint8Array {
  const full = expandIPv6(ip);
  const bytes = new Uint8Array(16);
  const parts = full.split(':');
  for (let i = 0; i < 8; i++) {
    const val = parseInt(parts[i], 16);
    bytes[i * 2] = (val >> 8) & 0xff;
    bytes[i * 2 + 1] = val & 0xff;
  }
  return bytes;
}

// Create full Anchor message with DNS payload
function createAnchorDnsMessage(
  payload: DnsPayload,
  anchors: Anchor[] = []
): Uint8Array {
  const body = encodeDnsPayload(payload);
  const anchorSize = anchors.length * 9; // 8 bytes txid prefix + 1 byte vout
  const totalSize = 4 + 1 + 1 + anchorSize + body.length;
  
  const message = new Uint8Array(totalSize);
  let offset = 0;
  
  // Magic bytes: a1 1c 00 01
  message.set(ANCHOR_MAGIC, offset);
  offset += 4;
  
  // Kind: 10 (DNS)
  message[offset++] = ANCHOR_KIND_DNS;
  
  // Anchor count
  message[offset++] = anchors.length;
  
  // Anchors (for updates/transfers)
  for (const anchor of anchors) {
    message.set(anchor.txidPrefix, offset);
    offset += 8;
    message[offset++] = anchor.vout;
  }
  
  // Body (DNS payload)
  message.set(body, offset);
  
  return message;
}
```

## Complete Decoding Example

```typescript
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) return null;
  
  const operation = bytes[0] as DnsOperation;
  if (![1, 2, 3].includes(operation)) return null;
  
  const nameLen = bytes[1];
  if (bytes.length < 2 + nameLen) return null;
  
  const decoder = new TextDecoder();
  const name = decoder.decode(bytes.slice(2, 2 + nameLen));
  
  // Validate domain name
  if (!isValidDomainName(name)) return null;
  
  // Parse records
  const records: DnsRecord[] = [];
  let offset = 2 + nameLen;
  
  while (offset + 4 <= bytes.length) {
    const type = bytes[offset];
    const ttl = (bytes[offset + 1] << 8) | bytes[offset + 2];
    const dataLen = bytes[offset + 3];
    
    if (offset + 4 + dataLen > bytes.length) break;
    
    const data = bytes.slice(offset + 4, offset + 4 + dataLen);
    const record = decodeRecord(type, ttl, data);
    
    if (record) records.push(record);
    offset += 4 + dataLen;
  }
  
  return { operation, name, records };
}

function decodeRecord(type: number, ttl: number, data: Uint8Array): DnsRecord | null {
  const decoder = new TextDecoder();
  
  switch (type) {
    case RecordType.A:
      if (data.length !== 4) return null;
      return {
        type: RecordType.A,
        ttl,
        value: `${data[0]}.${data[1]}.${data[2]}.${data[3]}`,
      };
      
    case RecordType.AAAA:
      if (data.length !== 16) return null;
      const parts: string[] = [];
      for (let i = 0; i < 16; i += 2) {
        parts.push(((data[i] << 8) | data[i + 1]).toString(16));
      }
      return {
        type: RecordType.AAAA,
        ttl,
        value: parts.join(':'),
      };
      
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      return {
        type,
        ttl,
        value: decoder.decode(data),
      };
      
    case RecordType.MX:
      if (data.length < 3) return null;
      return {
        type: RecordType.MX,
        ttl,
        value: decoder.decode(data.slice(2)),
        priority: (data[0] << 8) | data[1],
      };
      
    case RecordType.SRV:
      if (data.length < 7) return null;
      return {
        type: RecordType.SRV,
        ttl,
        value: decoder.decode(data.slice(6)),
        priority: (data[0] << 8) | data[1],
        weight: (data[2] << 8) | data[3],
        port: (data[4] << 8) | data[5],
      };
      
    default:
      return null;
  }
}
```

## Transaction Examples

### 1. Register a Domain

```typescript
// Register example.btc with A and TXT records
const payload = encodeDnsPayload({
  operation: DnsOperation.REGISTER,
  name: 'example.btc',
  records: [
    { type: RecordType.A, ttl: 3600, value: '93.184.216.34' },
    { type: RecordType.TXT, ttl: 3600, value: 'Hello from Bitcoin!' },
  ],
});

const message = createAnchorDnsMessage({ operation, name, records }, []);

// Broadcast via wallet service
// NOTE: Use carrier 4 (Witness Data) or 1 (Inscription) - OP_RETURN (0) does not work for DNS
const result = await fetch('http://localhost:8001/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    body: bytesToHex(message),
    carrier: 4, // Witness Data (recommended for DNS)
  }),
});

const { txid } = await result.json();
console.log('Domain registered:', txid);
// txid is also the txid_prefix for lookups (first 16 hex chars)
```

### 2. Update Domain Records

```typescript
// Get the current owner UTXO from the API
const domain = await fetch('http://localhost:3401/domains/example.btc').then(r => r.json());

// Create update payload
const payload = encodeDnsPayload({
  operation: DnsOperation.UPDATE,
  name: 'example.btc',
  records: [
    { type: RecordType.A, ttl: 3600, value: '192.168.1.1' }, // New IP
    { type: RecordType.MX, ttl: 3600, value: 'mail.example.btc', priority: 10 },
  ],
});

// Anchor to the current ownership UTXO
const anchor = {
  txidPrefix: hexToBytes(domain.owner_txid.slice(0, 16)),
  vout: domain.vout,
};

const message = createAnchorDnsMessage({ operation, name, records }, [anchor]);
```

### 3. Transfer Domain

```typescript
// Transfer requires spending the ownership UTXO to a new address
const payload = encodeDnsPayload({
  operation: DnsOperation.TRANSFER,
  name: 'example.btc',
  records: [], // No records needed for transfer
});

// Anchor to current ownership
const anchor = {
  txidPrefix: hexToBytes(currentOwnerTxid.slice(0, 16)),
  vout: currentOwnerVout,
};

const message = createAnchorDnsMessage({ operation, name, records }, [anchor]);

// The wallet should send the first output to the new owner's address
```

## Validation Rules

### Domain Name Validation

```typescript
const SUPPORTED_TLDS = ['.btc', '.sat', '.anchor', '.anc', '.bit'];

function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD
  const tld = SUPPORTED_TLDS.find(t => name.endsWith(t));
  if (!tld) return false;
  
  const namePart = name.slice(0, -tld.length);
  
  // Must have at least 1 character
  if (namePart.length === 0) return false;
  
  // Max 255 bytes total
  if (new TextEncoder().encode(name).length > 255) return false;
  
  // Only alphanumeric, hyphens, and dots (for subdomains)
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
  if (!pattern.test(namePart)) return false;
  
  // No leading/trailing hyphens per label
  return !namePart.startsWith('-') && 
         !namePart.endsWith('-') && 
         !namePart.includes('.-') && 
         !namePart.includes('-.');
}
```

### Record Validation

```typescript
function validateRecord(record: DnsRecord): string[] {
  const errors: string[] = [];
  
  // TTL range
  if (record.ttl < 0 || record.ttl > 65535) {
    errors.push('TTL must be 0-65535');
  }
  
  // Type-specific validation
  switch (record.type) {
    case RecordType.A:
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value)) {
        errors.push('Invalid IPv4 address');
      }
      break;
    case RecordType.AAAA:
      // Simplified IPv6 validation
      if (!record.value.includes(':')) {
        errors.push('Invalid IPv6 address');
      }
      break;
    case RecordType.MX:
    case RecordType.SRV:
      if (record.priority === undefined || record.priority > 65535) {
        errors.push('Priority must be 0-65535');
      }
      break;
  }
  
  return errors;
}
```

## Size Calculations

```typescript
function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length;
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + getRecordDataSize(record);
  }, 0);
  return 2 + nameBytes + recordsSize;
}

function getRecordDataSize(record: DnsRecord): number {
  switch (record.type) {
    case RecordType.A: return 4;
    case RecordType.AAAA: return 16;
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      return new TextEncoder().encode(record.value).length;
    case RecordType.MX:
      return 2 + new TextEncoder().encode(record.value).length;
    case RecordType.SRV:
      return 6 + new TextEncoder().encode(record.value).length;
    default:
      return 0;
  }
}
```

### Example Size Breakdown

For a domain `example.btc` with one A record:

| Component | Size |
|-----------|------|
| Anchor header (magic + kind + anchor_count) | 6 bytes |
| Operation | 1 byte |
| Name length | 1 byte |
| Domain name (`example.btc`) | 11 bytes |
| Record header (type + ttl + data_len) | 4 bytes |
| A record data (IPv4) | 4 bytes |
| **Total** | **27 bytes** |

While this fits in OP_RETURN, adding a second record or a longer domain name will exceed the 80-byte limit. **Always use Witness Data (4) or Inscription (1) carriers for DNS.**

## Resolution Methods

### By Domain Name
```
GET /resolve/example.btc
```

### By TXID Prefix
Domains can also be resolved by the first 16 hex characters of the registration txid:
```
GET /resolve/txid/a1b2c3d4e5f67890
```

This is useful for short URLs or when the domain name is not known.

## Pending Transactions

When registering or updating a domain, the transaction needs to be confirmed on the blockchain before it appears in the API. To provide better UX, the system supports tracking pending transactions locally.

### Create Pending Transaction

```typescript
// After broadcasting a transaction, save it as pending
const pending = await fetch('http://localhost:3401/pending', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txid: result.txid,
    domain_name: 'example.btc',
    operation: 1, // 1=register, 2=update, 3=transfer
    records: [
      { record_type: 'A', value: '93.184.216.34', ttl: 3600 }
    ],
    carrier: 4
  }),
});
```

### Check Pending Status

```typescript
// Check if a domain has a pending transaction
const status = await fetch('http://localhost:3401/pending/example.btc');
const data = await status.json();

if (data.has_pending) {
  console.log('Transaction pending:', data.pending.txid);
}
```

### List All Pending

```typescript
// Get all pending transactions
const pending = await fetch('http://localhost:3401/pending');
const list = await pending.json();
```

## API Reference

<div class="custom-block" style="padding: 16px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid #f7931a; border-radius: 12px; margin: 20px 0;">

### 📚 Interactive API Documentation

Explore all endpoints with live examples using **Swagger UI**:

<a href="http://localhost:3401/docs" target="_blank" rel="noopener" style="display: inline-block; background: #f7931a; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 10px 10px 10px 0;">
  🚀 Open Swagger UI
</a>
<a href="http://localhost:3401/api-doc/openapi.json" target="_blank" rel="noopener" style="display: inline-block; background: #333; color: #fff; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 10px 0;">
  📄 OpenAPI JSON
</a>

**Base URL**: `http://localhost:3401`

</div>

### Domain Resolution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/resolve/:name` | GET | Resolve domain by name |
| `/resolve/txid/:prefix` | GET | Resolve by txid prefix (16 hex chars) |

### Domain Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/domains` | GET | List all domains (paginated) |
| `/domains/:name` | GET | Get domain details |
| `/domains/:name/history` | GET | Get domain update history |
| `/available/:name` | GET | Check if domain is available |
| `/my-domains` | GET | List domains owned by the wallet |

### Registration & Updates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Register a new domain |
| `/update/:name` | POST | Update domain records |

### Pending Transactions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pending` | GET | List all pending transactions |
| `/pending` | POST | Create a pending transaction |
| `/pending/:name` | GET | Check pending status for a domain |

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stats` | GET | Protocol statistics |

### Request/Response Examples

#### Register Domain

```bash
curl -X POST http://localhost:3401/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mysite.btc",
    "records": [
      { "record_type": "A", "value": "93.184.216.34", "ttl": 3600 }
    ],
    "carrier": 4
  }'
```

Response:
```json
{
  "txid": "abc123...",
  "vout": 0,
  "hex": "0200000001...",
  "carrier": 4,
  "carrier_name": "witness_data"
}
```

#### Resolve Domain

```bash
curl http://localhost:3401/resolve/mysite.btc
```

Response:
```json
{
  "name": "mysite.btc",
  "txid": "abc123...",
  "vout": 0,
  "txid_prefix": "abc123def4567890",
  "records": [
    {
      "id": 1,
      "record_type": "A",
      "ttl": 3600,
      "value": "93.184.216.34",
      "txid": "abc123...",
      "block_height": 850000,
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

## See Also

- [Threading](/concepts/threading) - How update chains work
- [Message Format](/concepts/message-format) - Full protocol specification
- [Carriers](/concepts/carriers) - OP_RETURN, Witness, Inscription options
- [Text Kind](/kinds/text) - Store additional metadata
