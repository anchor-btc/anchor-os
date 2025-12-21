# Kind 10: DNS

The **DNS** kind enables decentralized domain name registration and management on Bitcoin. It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domain names.

## Overview

- **Kind**: 10 (`0x0A`)
- **Name**: DNS
- **Status**: Extension
- **Max Payload**: 80 bytes for basic, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain |
| UPDATE | `0x02` | Update domain records |
| TRANSFER | `0x03` | Transfer domain ownership |

## Payload Format

### Base Structure

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | Operation type |
| 1 | name_len | u8 | Domain name length |
| 2+ | name | utf8 | Domain name (e.g., "example.btc") |
| ... | records | bytes | DNS record data |

### Record Format

Each record follows:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | type | u8 | Record type |
| 1-2 | ttl | u16 | Time-to-live (big-endian) |
| 3 | data_len | u8 | Record data length |
| 4+ | data | bytes | Type-specific data |

### Record Types

| Type | Value | Data Format |
|------|-------|-------------|
| A | 1 | 4 bytes (IPv4) |
| AAAA | 2 | 16 bytes (IPv6) |
| CNAME | 3 | UTF-8 string |
| TXT | 4 | UTF-8 string |
| MX | 5 | u16 priority + UTF-8 domain |
| NS | 6 | UTF-8 string |
| SRV | 7 | u16×3 (priority, weight, port) + UTF-8 target |

## TypeScript Interface

```typescript
enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

enum RecordType {
  A = 1,
  AAAA = 2,
  CNAME = 3,
  TXT = 4,
  MX = 5,
  NS = 6,
  SRV = 7,
}

interface DnsRecord {
  type: RecordType
  ttl: number
  value: string
  priority?: number  // For MX, SRV
  weight?: number    // For SRV
  port?: number      // For SRV
}

interface DnsPayload {
  operation: DnsOperation
  name: string
  records: DnsRecord[]
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_DNS = 10

function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(payload.name)
  
  if (nameBytes.length > 255) {
    throw new Error('Domain name too long')
  }
  
  // Encode all records
  const recordBuffers = payload.records.map(encodeRecord)
  const totalRecordBytes = recordBuffers.reduce(
    (sum, buf) => sum + buf.length, 0
  )
  
  const totalSize = 2 + nameBytes.length + totalRecordBytes
  const result = new Uint8Array(totalSize)
  
  let offset = 0
  result[offset++] = payload.operation
  result[offset++] = nameBytes.length
  result.set(nameBytes, offset)
  offset += nameBytes.length
  
  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset)
    offset += recordBuf.length
  }
  
  return result
}

function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder()
  let data: Uint8Array
  
  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value)
      break
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value)
      break
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value)
      break
    case RecordType.MX: {
      const priority = record.priority ?? 10
      const domain = encoder.encode(record.value)
      data = new Uint8Array(2 + domain.length)
      new DataView(data.buffer).setUint16(0, priority, false)
      data.set(domain, 2)
      break
    }
    // ... SRV handling
    default:
      throw new Error(`Unknown record type: ${record.type}`)
  }
  
  // Record: [type: u8][ttl: u16][data_len: u8][data]
  const result = new Uint8Array(4 + data.length)
  const view = new DataView(result.buffer)
  result[0] = record.type
  view.setUint16(1, record.ttl, false)
  result[3] = data.length
  result.set(data, 4)
  
  return result
}

function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split('.')
  return new Uint8Array(parts.map(p => parseInt(p, 10)))
}
```

## Decoding Example

```typescript
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) return null
  
  const operation = bytes[0] as DnsOperation
  const nameLen = bytes[1]
  
  if (bytes.length < 2 + nameLen) return null
  
  const decoder = new TextDecoder()
  const name = decoder.decode(bytes.slice(2, 2 + nameLen))
  
  // Parse records
  const records: DnsRecord[] = []
  let offset = 2 + nameLen
  
  while (offset < bytes.length) {
    const result = decodeRecord(bytes, offset)
    if (!result) break
    records.push(result.record)
    offset += result.bytesRead
  }
  
  return { operation, name, records }
}
```

## Full Transaction Example

### Register a Domain

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function registerDomain(
  wallet: AnchorWallet,
  name: string,
  ipAddress: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: `${name}.btc`,
    records: [
      { type: RecordType.A, ttl: 3600, value: ipAddress }
    ]
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}

// Register example.btc pointing to 192.168.1.1
const txid = await registerDomain(wallet, 'example', '192.168.1.1')
console.log('Domain registered:', txid)
```

### Update Records

```typescript
async function updateDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string,
  newRecords: DnsRecord[]
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.UPDATE,
    name,
    records: newRecords
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],  // Reference registration
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}
```

### Transfer Ownership

```typescript
// Transfer requires spending from the current owner's address
async function transferDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.TRANSFER,
    name,
    records: []  // No records needed for transfer
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  // The recipient becomes owner of the output
  const result = await wallet.broadcast(message, {
    changeAddress: newOwnerAddress
  })
  
  return result.txid
}
```

## Validation

```typescript
function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD (.btc, .sat, .anchor, .anc, .bit)
  const supportedTLDs = ['.btc', '.sat', '.anchor', '.anc', '.bit']
  if (!supportedTLDs.some(tld => name.endsWith(tld))) return false
  
  const namePart = name.slice(0, -4)
  if (namePart.length === 0) return false
  
  // Max 255 bytes
  if (new TextEncoder().encode(name).length > 255) return false
  
  // Alphanumeric, hyphens, dots only
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
  return pattern.test(namePart)
}

function validateDnsPayload(payload: DnsPayload): string[] {
  const errors: string[] = []
  
  if (!isValidDomainName(payload.name)) {
    errors.push('Invalid domain name format')
  }
  
  for (const record of payload.records) {
    if (record.type === RecordType.A) {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value)) {
        errors.push('Invalid IPv4 address')
      }
    }
    if (record.ttl < 0 || record.ttl > 65535) {
      errors.push('TTL must be 0-65535')
    }
  }
  
  return errors
}
```

## Size Calculations

```typescript
function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + encodeRecordData(record).length
  }, 0)
  return 2 + nameBytes + recordsSize
}

function fitsInOpReturn(name: string, records: DnsRecord[]): boolean {
  const payloadSize = calculatePayloadSize(name, records)
  return payloadSize + 6 <= 80  // 6 = protocol header
}
```

## Resolution

```typescript
class DnsResolver {
  constructor(private indexer: AnchorIndexer) {}
  
  async resolve(name: string): Promise<DnsRecord[] | null> {
    // Find latest update for domain
    const history = await this.indexer.getDomainHistory(name)
    if (history.length === 0) return null
    
    // Get most recent valid update
    const latest = history[history.length - 1]
    return latest.records
  }
  
  async getOwner(name: string): Promise<string | null> {
    const registration = await this.indexer.getDomainRegistration(name)
    if (!registration) return null
    
    // Trace through transfers
    let currentOwner = registration.ownerAddress
    const transfers = await this.indexer.getDomainTransfers(name)
    
    for (const transfer of transfers) {
      currentOwner = transfer.newOwnerAddress
    }
    
    return currentOwner
  }
}
```

## See Also

- [Anchoring System](/protocol/anchoring) - Domain update chains
- [Anchor DNS](https://dns.anchor.dev) - Live application
- [Text (Kind 1)](/kinds/text) - Store additional metadata



The **DNS** kind enables decentralized domain name registration and management on Bitcoin. It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domain names.

## Overview

- **Kind**: 10 (`0x0A`)
- **Name**: DNS
- **Status**: Extension
- **Max Payload**: 80 bytes for basic, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain |
| UPDATE | `0x02` | Update domain records |
| TRANSFER | `0x03` | Transfer domain ownership |

## Payload Format

### Base Structure

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | Operation type |
| 1 | name_len | u8 | Domain name length |
| 2+ | name | utf8 | Domain name (e.g., "example.btc") |
| ... | records | bytes | DNS record data |

### Record Format

Each record follows:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | type | u8 | Record type |
| 1-2 | ttl | u16 | Time-to-live (big-endian) |
| 3 | data_len | u8 | Record data length |
| 4+ | data | bytes | Type-specific data |

### Record Types

| Type | Value | Data Format |
|------|-------|-------------|
| A | 1 | 4 bytes (IPv4) |
| AAAA | 2 | 16 bytes (IPv6) |
| CNAME | 3 | UTF-8 string |
| TXT | 4 | UTF-8 string |
| MX | 5 | u16 priority + UTF-8 domain |
| NS | 6 | UTF-8 string |
| SRV | 7 | u16×3 (priority, weight, port) + UTF-8 target |

## TypeScript Interface

```typescript
enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

enum RecordType {
  A = 1,
  AAAA = 2,
  CNAME = 3,
  TXT = 4,
  MX = 5,
  NS = 6,
  SRV = 7,
}

interface DnsRecord {
  type: RecordType
  ttl: number
  value: string
  priority?: number  // For MX, SRV
  weight?: number    // For SRV
  port?: number      // For SRV
}

interface DnsPayload {
  operation: DnsOperation
  name: string
  records: DnsRecord[]
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_DNS = 10

function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(payload.name)
  
  if (nameBytes.length > 255) {
    throw new Error('Domain name too long')
  }
  
  // Encode all records
  const recordBuffers = payload.records.map(encodeRecord)
  const totalRecordBytes = recordBuffers.reduce(
    (sum, buf) => sum + buf.length, 0
  )
  
  const totalSize = 2 + nameBytes.length + totalRecordBytes
  const result = new Uint8Array(totalSize)
  
  let offset = 0
  result[offset++] = payload.operation
  result[offset++] = nameBytes.length
  result.set(nameBytes, offset)
  offset += nameBytes.length
  
  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset)
    offset += recordBuf.length
  }
  
  return result
}

function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder()
  let data: Uint8Array
  
  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value)
      break
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value)
      break
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value)
      break
    case RecordType.MX: {
      const priority = record.priority ?? 10
      const domain = encoder.encode(record.value)
      data = new Uint8Array(2 + domain.length)
      new DataView(data.buffer).setUint16(0, priority, false)
      data.set(domain, 2)
      break
    }
    // ... SRV handling
    default:
      throw new Error(`Unknown record type: ${record.type}`)
  }
  
  // Record: [type: u8][ttl: u16][data_len: u8][data]
  const result = new Uint8Array(4 + data.length)
  const view = new DataView(result.buffer)
  result[0] = record.type
  view.setUint16(1, record.ttl, false)
  result[3] = data.length
  result.set(data, 4)
  
  return result
}

function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split('.')
  return new Uint8Array(parts.map(p => parseInt(p, 10)))
}
```

## Decoding Example

```typescript
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) return null
  
  const operation = bytes[0] as DnsOperation
  const nameLen = bytes[1]
  
  if (bytes.length < 2 + nameLen) return null
  
  const decoder = new TextDecoder()
  const name = decoder.decode(bytes.slice(2, 2 + nameLen))
  
  // Parse records
  const records: DnsRecord[] = []
  let offset = 2 + nameLen
  
  while (offset < bytes.length) {
    const result = decodeRecord(bytes, offset)
    if (!result) break
    records.push(result.record)
    offset += result.bytesRead
  }
  
  return { operation, name, records }
}
```

## Full Transaction Example

### Register a Domain

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function registerDomain(
  wallet: AnchorWallet,
  name: string,
  ipAddress: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: `${name}.btc`,
    records: [
      { type: RecordType.A, ttl: 3600, value: ipAddress }
    ]
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}

// Register example.btc pointing to 192.168.1.1
const txid = await registerDomain(wallet, 'example', '192.168.1.1')
console.log('Domain registered:', txid)
```

### Update Records

```typescript
async function updateDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string,
  newRecords: DnsRecord[]
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.UPDATE,
    name,
    records: newRecords
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],  // Reference registration
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}
```

### Transfer Ownership

```typescript
// Transfer requires spending from the current owner's address
async function transferDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.TRANSFER,
    name,
    records: []  // No records needed for transfer
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  // The recipient becomes owner of the output
  const result = await wallet.broadcast(message, {
    changeAddress: newOwnerAddress
  })
  
  return result.txid
}
```

## Validation

```typescript
function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD (.btc, .sat, .anchor, .anc, .bit)
  const supportedTLDs = ['.btc', '.sat', '.anchor', '.anc', '.bit']
  if (!supportedTLDs.some(tld => name.endsWith(tld))) return false
  
  const namePart = name.slice(0, -4)
  if (namePart.length === 0) return false
  
  // Max 255 bytes
  if (new TextEncoder().encode(name).length > 255) return false
  
  // Alphanumeric, hyphens, dots only
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
  return pattern.test(namePart)
}

function validateDnsPayload(payload: DnsPayload): string[] {
  const errors: string[] = []
  
  if (!isValidDomainName(payload.name)) {
    errors.push('Invalid domain name format')
  }
  
  for (const record of payload.records) {
    if (record.type === RecordType.A) {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value)) {
        errors.push('Invalid IPv4 address')
      }
    }
    if (record.ttl < 0 || record.ttl > 65535) {
      errors.push('TTL must be 0-65535')
    }
  }
  
  return errors
}
```

## Size Calculations

```typescript
function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + encodeRecordData(record).length
  }, 0)
  return 2 + nameBytes + recordsSize
}

function fitsInOpReturn(name: string, records: DnsRecord[]): boolean {
  const payloadSize = calculatePayloadSize(name, records)
  return payloadSize + 6 <= 80  // 6 = protocol header
}
```

## Resolution

```typescript
class DnsResolver {
  constructor(private indexer: AnchorIndexer) {}
  
  async resolve(name: string): Promise<DnsRecord[] | null> {
    // Find latest update for domain
    const history = await this.indexer.getDomainHistory(name)
    if (history.length === 0) return null
    
    // Get most recent valid update
    const latest = history[history.length - 1]
    return latest.records
  }
  
  async getOwner(name: string): Promise<string | null> {
    const registration = await this.indexer.getDomainRegistration(name)
    if (!registration) return null
    
    // Trace through transfers
    let currentOwner = registration.ownerAddress
    const transfers = await this.indexer.getDomainTransfers(name)
    
    for (const transfer of transfers) {
      currentOwner = transfer.newOwnerAddress
    }
    
    return currentOwner
  }
}
```

## See Also

- [Anchoring System](/protocol/anchoring) - Domain update chains
- [Anchor DNS](https://dns.anchor.dev) - Live application
- [Text (Kind 1)](/kinds/text) - Store additional metadata



The **DNS** kind enables decentralized domain name registration and management on Bitcoin. It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domain names.

## Overview

- **Kind**: 10 (`0x0A`)
- **Name**: DNS
- **Status**: Extension
- **Max Payload**: 80 bytes for basic, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain |
| UPDATE | `0x02` | Update domain records |
| TRANSFER | `0x03` | Transfer domain ownership |

## Payload Format

### Base Structure

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | Operation type |
| 1 | name_len | u8 | Domain name length |
| 2+ | name | utf8 | Domain name (e.g., "example.btc") |
| ... | records | bytes | DNS record data |

### Record Format

Each record follows:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | type | u8 | Record type |
| 1-2 | ttl | u16 | Time-to-live (big-endian) |
| 3 | data_len | u8 | Record data length |
| 4+ | data | bytes | Type-specific data |

### Record Types

| Type | Value | Data Format |
|------|-------|-------------|
| A | 1 | 4 bytes (IPv4) |
| AAAA | 2 | 16 bytes (IPv6) |
| CNAME | 3 | UTF-8 string |
| TXT | 4 | UTF-8 string |
| MX | 5 | u16 priority + UTF-8 domain |
| NS | 6 | UTF-8 string |
| SRV | 7 | u16×3 (priority, weight, port) + UTF-8 target |

## TypeScript Interface

```typescript
enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

enum RecordType {
  A = 1,
  AAAA = 2,
  CNAME = 3,
  TXT = 4,
  MX = 5,
  NS = 6,
  SRV = 7,
}

interface DnsRecord {
  type: RecordType
  ttl: number
  value: string
  priority?: number  // For MX, SRV
  weight?: number    // For SRV
  port?: number      // For SRV
}

interface DnsPayload {
  operation: DnsOperation
  name: string
  records: DnsRecord[]
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_DNS = 10

function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(payload.name)
  
  if (nameBytes.length > 255) {
    throw new Error('Domain name too long')
  }
  
  // Encode all records
  const recordBuffers = payload.records.map(encodeRecord)
  const totalRecordBytes = recordBuffers.reduce(
    (sum, buf) => sum + buf.length, 0
  )
  
  const totalSize = 2 + nameBytes.length + totalRecordBytes
  const result = new Uint8Array(totalSize)
  
  let offset = 0
  result[offset++] = payload.operation
  result[offset++] = nameBytes.length
  result.set(nameBytes, offset)
  offset += nameBytes.length
  
  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset)
    offset += recordBuf.length
  }
  
  return result
}

function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder()
  let data: Uint8Array
  
  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value)
      break
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value)
      break
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value)
      break
    case RecordType.MX: {
      const priority = record.priority ?? 10
      const domain = encoder.encode(record.value)
      data = new Uint8Array(2 + domain.length)
      new DataView(data.buffer).setUint16(0, priority, false)
      data.set(domain, 2)
      break
    }
    // ... SRV handling
    default:
      throw new Error(`Unknown record type: ${record.type}`)
  }
  
  // Record: [type: u8][ttl: u16][data_len: u8][data]
  const result = new Uint8Array(4 + data.length)
  const view = new DataView(result.buffer)
  result[0] = record.type
  view.setUint16(1, record.ttl, false)
  result[3] = data.length
  result.set(data, 4)
  
  return result
}

function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split('.')
  return new Uint8Array(parts.map(p => parseInt(p, 10)))
}
```

## Decoding Example

```typescript
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) return null
  
  const operation = bytes[0] as DnsOperation
  const nameLen = bytes[1]
  
  if (bytes.length < 2 + nameLen) return null
  
  const decoder = new TextDecoder()
  const name = decoder.decode(bytes.slice(2, 2 + nameLen))
  
  // Parse records
  const records: DnsRecord[] = []
  let offset = 2 + nameLen
  
  while (offset < bytes.length) {
    const result = decodeRecord(bytes, offset)
    if (!result) break
    records.push(result.record)
    offset += result.bytesRead
  }
  
  return { operation, name, records }
}
```

## Full Transaction Example

### Register a Domain

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function registerDomain(
  wallet: AnchorWallet,
  name: string,
  ipAddress: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: `${name}.btc`,
    records: [
      { type: RecordType.A, ttl: 3600, value: ipAddress }
    ]
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}

// Register example.btc pointing to 192.168.1.1
const txid = await registerDomain(wallet, 'example', '192.168.1.1')
console.log('Domain registered:', txid)
```

### Update Records

```typescript
async function updateDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string,
  newRecords: DnsRecord[]
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.UPDATE,
    name,
    records: newRecords
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],  // Reference registration
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}
```

### Transfer Ownership

```typescript
// Transfer requires spending from the current owner's address
async function transferDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.TRANSFER,
    name,
    records: []  // No records needed for transfer
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  // The recipient becomes owner of the output
  const result = await wallet.broadcast(message, {
    changeAddress: newOwnerAddress
  })
  
  return result.txid
}
```

## Validation

```typescript
function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD (.btc, .sat, .anchor, .anc, .bit)
  const supportedTLDs = ['.btc', '.sat', '.anchor', '.anc', '.bit']
  if (!supportedTLDs.some(tld => name.endsWith(tld))) return false
  
  const namePart = name.slice(0, -4)
  if (namePart.length === 0) return false
  
  // Max 255 bytes
  if (new TextEncoder().encode(name).length > 255) return false
  
  // Alphanumeric, hyphens, dots only
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
  return pattern.test(namePart)
}

function validateDnsPayload(payload: DnsPayload): string[] {
  const errors: string[] = []
  
  if (!isValidDomainName(payload.name)) {
    errors.push('Invalid domain name format')
  }
  
  for (const record of payload.records) {
    if (record.type === RecordType.A) {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value)) {
        errors.push('Invalid IPv4 address')
      }
    }
    if (record.ttl < 0 || record.ttl > 65535) {
      errors.push('TTL must be 0-65535')
    }
  }
  
  return errors
}
```

## Size Calculations

```typescript
function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + encodeRecordData(record).length
  }, 0)
  return 2 + nameBytes + recordsSize
}

function fitsInOpReturn(name: string, records: DnsRecord[]): boolean {
  const payloadSize = calculatePayloadSize(name, records)
  return payloadSize + 6 <= 80  // 6 = protocol header
}
```

## Resolution

```typescript
class DnsResolver {
  constructor(private indexer: AnchorIndexer) {}
  
  async resolve(name: string): Promise<DnsRecord[] | null> {
    // Find latest update for domain
    const history = await this.indexer.getDomainHistory(name)
    if (history.length === 0) return null
    
    // Get most recent valid update
    const latest = history[history.length - 1]
    return latest.records
  }
  
  async getOwner(name: string): Promise<string | null> {
    const registration = await this.indexer.getDomainRegistration(name)
    if (!registration) return null
    
    // Trace through transfers
    let currentOwner = registration.ownerAddress
    const transfers = await this.indexer.getDomainTransfers(name)
    
    for (const transfer of transfers) {
      currentOwner = transfer.newOwnerAddress
    }
    
    return currentOwner
  }
}
```

## See Also

- [Anchoring System](/protocol/anchoring) - Domain update chains
- [Anchor DNS](https://dns.anchor.dev) - Live application
- [Text (Kind 1)](/kinds/text) - Store additional metadata



The **DNS** kind enables decentralized domain name registration and management on Bitcoin. It powers Anchor Domains with `.btc`, `.sat`, `.anchor`, `.anc`, and `.bit` domain names.

## Overview

- **Kind**: 10 (`0x0A`)
- **Name**: DNS
- **Status**: Extension
- **Max Payload**: 80 bytes for basic, larger for Witness

## Operations

| Operation | Value | Description |
|-----------|-------|-------------|
| REGISTER | `0x01` | Register a new domain |
| UPDATE | `0x02` | Update domain records |
| TRANSFER | `0x03` | Transfer domain ownership |

## Payload Format

### Base Structure

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | Operation type |
| 1 | name_len | u8 | Domain name length |
| 2+ | name | utf8 | Domain name (e.g., "example.btc") |
| ... | records | bytes | DNS record data |

### Record Format

Each record follows:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | type | u8 | Record type |
| 1-2 | ttl | u16 | Time-to-live (big-endian) |
| 3 | data_len | u8 | Record data length |
| 4+ | data | bytes | Type-specific data |

### Record Types

| Type | Value | Data Format |
|------|-------|-------------|
| A | 1 | 4 bytes (IPv4) |
| AAAA | 2 | 16 bytes (IPv6) |
| CNAME | 3 | UTF-8 string |
| TXT | 4 | UTF-8 string |
| MX | 5 | u16 priority + UTF-8 domain |
| NS | 6 | UTF-8 string |
| SRV | 7 | u16×3 (priority, weight, port) + UTF-8 target |

## TypeScript Interface

```typescript
enum DnsOperation {
  REGISTER = 0x01,
  UPDATE = 0x02,
  TRANSFER = 0x03,
}

enum RecordType {
  A = 1,
  AAAA = 2,
  CNAME = 3,
  TXT = 4,
  MX = 5,
  NS = 6,
  SRV = 7,
}

interface DnsRecord {
  type: RecordType
  ttl: number
  value: string
  priority?: number  // For MX, SRV
  weight?: number    // For SRV
  port?: number      // For SRV
}

interface DnsPayload {
  operation: DnsOperation
  name: string
  records: DnsRecord[]
}
```

## Encoding Example

```typescript
const ANCHOR_KIND_DNS = 10

function encodeDnsPayload(payload: DnsPayload): Uint8Array {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(payload.name)
  
  if (nameBytes.length > 255) {
    throw new Error('Domain name too long')
  }
  
  // Encode all records
  const recordBuffers = payload.records.map(encodeRecord)
  const totalRecordBytes = recordBuffers.reduce(
    (sum, buf) => sum + buf.length, 0
  )
  
  const totalSize = 2 + nameBytes.length + totalRecordBytes
  const result = new Uint8Array(totalSize)
  
  let offset = 0
  result[offset++] = payload.operation
  result[offset++] = nameBytes.length
  result.set(nameBytes, offset)
  offset += nameBytes.length
  
  for (const recordBuf of recordBuffers) {
    result.set(recordBuf, offset)
    offset += recordBuf.length
  }
  
  return result
}

function encodeRecord(record: DnsRecord): Uint8Array {
  const encoder = new TextEncoder()
  let data: Uint8Array
  
  switch (record.type) {
    case RecordType.A:
      data = ipv4ToBytes(record.value)
      break
    case RecordType.AAAA:
      data = ipv6ToBytes(record.value)
      break
    case RecordType.CNAME:
    case RecordType.NS:
    case RecordType.TXT:
      data = encoder.encode(record.value)
      break
    case RecordType.MX: {
      const priority = record.priority ?? 10
      const domain = encoder.encode(record.value)
      data = new Uint8Array(2 + domain.length)
      new DataView(data.buffer).setUint16(0, priority, false)
      data.set(domain, 2)
      break
    }
    // ... SRV handling
    default:
      throw new Error(`Unknown record type: ${record.type}`)
  }
  
  // Record: [type: u8][ttl: u16][data_len: u8][data]
  const result = new Uint8Array(4 + data.length)
  const view = new DataView(result.buffer)
  result[0] = record.type
  view.setUint16(1, record.ttl, false)
  result[3] = data.length
  result.set(data, 4)
  
  return result
}

function ipv4ToBytes(ip: string): Uint8Array {
  const parts = ip.split('.')
  return new Uint8Array(parts.map(p => parseInt(p, 10)))
}
```

## Decoding Example

```typescript
function decodeDnsPayload(bytes: Uint8Array): DnsPayload | null {
  if (bytes.length < 3) return null
  
  const operation = bytes[0] as DnsOperation
  const nameLen = bytes[1]
  
  if (bytes.length < 2 + nameLen) return null
  
  const decoder = new TextDecoder()
  const name = decoder.decode(bytes.slice(2, 2 + nameLen))
  
  // Parse records
  const records: DnsRecord[] = []
  let offset = 2 + nameLen
  
  while (offset < bytes.length) {
    const result = decodeRecord(bytes, offset)
    if (!result) break
    records.push(result.record)
    offset += result.bytesRead
  }
  
  return { operation, name, records }
}
```

## Full Transaction Example

### Register a Domain

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function registerDomain(
  wallet: AnchorWallet,
  name: string,
  ipAddress: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.REGISTER,
    name: `${name}.btc`,
    records: [
      { type: RecordType.A, ttl: 3600, value: ipAddress }
    ]
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}

// Register example.btc pointing to 192.168.1.1
const txid = await registerDomain(wallet, 'example', '192.168.1.1')
console.log('Domain registered:', txid)
```

### Update Records

```typescript
async function updateDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string,
  newRecords: DnsRecord[]
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.UPDATE,
    name,
    records: newRecords
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],  // Reference registration
    carrier: CarrierType.OpReturn
  })
  
  const result = await wallet.broadcast(message)
  return result.txid
}
```

### Transfer Ownership

```typescript
// Transfer requires spending from the current owner's address
async function transferDomain(
  wallet: AnchorWallet,
  name: string,
  registrationTxid: string
): Promise<string> {
  const payload = encodeDnsPayload({
    operation: DnsOperation.TRANSFER,
    name,
    records: []  // No records needed for transfer
  })
  
  const message = createAnchorMessage({
    kind: 10,
    bodyBytes: payload,
    anchors: [{ txid: registrationTxid, vout: 0 }],
    carrier: CarrierType.OpReturn
  })
  
  // The recipient becomes owner of the output
  const result = await wallet.broadcast(message, {
    changeAddress: newOwnerAddress
  })
  
  return result.txid
}
```

## Validation

```typescript
function isValidDomainName(name: string): boolean {
  // Must end with a supported TLD (.btc, .sat, .anchor, .anc, .bit)
  const supportedTLDs = ['.btc', '.sat', '.anchor', '.anc', '.bit']
  if (!supportedTLDs.some(tld => name.endsWith(tld))) return false
  
  const namePart = name.slice(0, -4)
  if (namePart.length === 0) return false
  
  // Max 255 bytes
  if (new TextEncoder().encode(name).length > 255) return false
  
  // Alphanumeric, hyphens, dots only
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
  return pattern.test(namePart)
}

function validateDnsPayload(payload: DnsPayload): string[] {
  const errors: string[] = []
  
  if (!isValidDomainName(payload.name)) {
    errors.push('Invalid domain name format')
  }
  
  for (const record of payload.records) {
    if (record.type === RecordType.A) {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(record.value)) {
        errors.push('Invalid IPv4 address')
      }
    }
    if (record.ttl < 0 || record.ttl > 65535) {
      errors.push('TTL must be 0-65535')
    }
  }
  
  return errors
}
```

## Size Calculations

```typescript
function calculatePayloadSize(name: string, records: DnsRecord[]): number {
  const nameBytes = new TextEncoder().encode(name).length
  const recordsSize = records.reduce((sum, record) => {
    return sum + 4 + encodeRecordData(record).length
  }, 0)
  return 2 + nameBytes + recordsSize
}

function fitsInOpReturn(name: string, records: DnsRecord[]): boolean {
  const payloadSize = calculatePayloadSize(name, records)
  return payloadSize + 6 <= 80  // 6 = protocol header
}
```

## Resolution

```typescript
class DnsResolver {
  constructor(private indexer: AnchorIndexer) {}
  
  async resolve(name: string): Promise<DnsRecord[] | null> {
    // Find latest update for domain
    const history = await this.indexer.getDomainHistory(name)
    if (history.length === 0) return null
    
    // Get most recent valid update
    const latest = history[history.length - 1]
    return latest.records
  }
  
  async getOwner(name: string): Promise<string | null> {
    const registration = await this.indexer.getDomainRegistration(name)
    if (!registration) return null
    
    // Trace through transfers
    let currentOwner = registration.ownerAddress
    const transfers = await this.indexer.getDomainTransfers(name)
    
    for (const transfer of transfers) {
      currentOwner = transfer.newOwnerAddress
    }
    
    return currentOwner
  }
}
```

## See Also

- [Anchoring System](/protocol/anchoring) - Domain update chains
- [Anchor DNS](https://dns.anchor.dev) - Live application
- [Text (Kind 1)](/kinds/text) - Store additional metadata


