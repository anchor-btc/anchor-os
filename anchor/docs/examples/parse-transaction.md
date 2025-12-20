# Parse a Transaction

This example demonstrates how to parse and extract Anchor messages from Bitcoin transactions.

## Basic Parsing

### Parse from Raw Bytes

```typescript
import { 
  parseMessage, 
  isAnchorMessage,
  AnchorKind 
} from '@AnchorProtocol/anchor-sdk'

function parseRawMessage(hexData: string) {
  const bytes = hexToBytes(hexData)
  
  // Check if it's an Anchor message
  if (!isAnchorMessage(bytes)) {
    console.log('Not an Anchor message')
    return null
  }
  
  // Parse the message
  const message = parseMessage(bytes)
  
  if (!message) {
    console.log('Failed to parse message')
    return null
  }
  
  console.log('Kind:', message.kind)
  console.log('Anchors:', message.anchors.length)
  console.log('Body size:', message.body.length, 'bytes')
  
  // Decode based on kind
  switch (message.kind) {
    case AnchorKind.Text:
      const text = new TextDecoder().decode(message.body)
      console.log('Text:', text)
      break
    case AnchorKind.Generic:
      console.log('Binary data:', bytesToHex(message.body))
      break
    default:
      console.log('Custom kind:', message.kind)
  }
  
  return message
}

// Example
parseRawMessage('a11c000101004865c6c6f21')
```

## Extract from Transaction

### From OP_RETURN

```typescript
interface Transaction {
  txid: string
  vout: Array<{
    scriptPubKey: {
      type: string
      hex: string
    }
    value: number
  }>
}

function extractFromOpReturn(tx: Transaction) {
  for (let i = 0; i < tx.vout.length; i++) {
    const output = tx.vout[i]
    
    // Check for OP_RETURN
    if (output.scriptPubKey.type === 'nulldata') {
      // Skip OP_RETURN opcode (6a) and push length
      const hex = output.scriptPubKey.hex
      let dataStart = 2  // Skip 6a
      
      // Handle push opcodes
      const pushByte = parseInt(hex.slice(2, 4), 16)
      if (pushByte <= 0x4b) {
        dataStart = 4  // Single byte push
      } else if (pushByte === 0x4c) {
        dataStart = 6  // OP_PUSHDATA1
      } else if (pushByte === 0x4d) {
        dataStart = 8  // OP_PUSHDATA2
      }
      
      const data = hexToBytes(hex.slice(dataStart))
      const message = parseMessage(data)
      
      if (message) {
        return { message, vout: i }
      }
    }
  }
  
  return null
}
```

### From Witness Data

```typescript
function extractFromWitness(
  tx: Transaction & { vin: Array<{ txinwitness?: string[] }> }
) {
  for (const input of tx.vin) {
    if (!input.txinwitness) continue
    
    for (const witnessItem of input.txinwitness) {
      const bytes = hexToBytes(witnessItem)
      
      if (isAnchorMessage(bytes)) {
        const message = parseMessage(bytes)
        if (message) {
          return message
        }
      }
    }
  }
  
  return null
}
```

## Parse Kind-Specific Messages

### DNS Messages

```typescript
import { 
  decodeDnsPayload, 
  getRecordTypeName 
} from '@AnchorProtocol/anchor-sdk/dns'

function parseDnsMessage(bytes: Uint8Array) {
  const message = parseMessage(bytes)
  
  if (!message || message.kind !== 10) {
    return null
  }
  
  const dns = decodeDnsPayload(message.body)
  
  if (!dns) {
    console.log('Invalid DNS payload')
    return null
  }
  
  console.log('Domain:', dns.name)
  console.log('Operation:', dns.operation)
  console.log('Records:')
  
  for (const record of dns.records) {
    console.log(`  ${getRecordTypeName(record.type)}: ${record.value} (TTL: ${record.ttl})`)
  }
  
  return dns
}
```

### Token Messages

```typescript
import { 
  decodeTokenPayload, 
  TokenOperation,
  formatTokenAmount 
} from '@AnchorProtocol/anchor-sdk/token'

function parseTokenMessage(bytes: Uint8Array) {
  const message = parseMessage(bytes)
  
  if (!message || message.kind !== 20) {
    return null
  }
  
  const token = decodeTokenPayload(message.body)
  
  if (!token) {
    console.log('Invalid token payload')
    return null
  }
  
  switch (token.operation) {
    case TokenOperation.DEPLOY:
      console.log('Token Deployment:')
      console.log('  Ticker:', token.data.ticker)
      console.log('  Decimals:', token.data.decimals)
      console.log('  Max Supply:', formatTokenAmount(token.data.maxSupply, token.data.decimals))
      break
      
    case TokenOperation.MINT:
      console.log('Token Mint:')
      console.log('  Token ID:', token.data.tokenId)
      console.log('  Amount:', token.data.amount)
      break
      
    case TokenOperation.TRANSFER:
      console.log('Token Transfer:')
      console.log('  Token ID:', token.data.tokenId)
      console.log('  Allocations:', token.data.allocations.length)
      break
      
    case TokenOperation.BURN:
      console.log('Token Burn:')
      console.log('  Token ID:', token.data.tokenId)
      console.log('  Amount:', token.data.amount)
      break
  }
  
  return token
}
```

### Proof Messages

```typescript
import { 
  decodeProofPayload, 
  HashAlgorithm,
  formatFileSize 
} from '@AnchorProtocol/anchor-sdk/proof'

function parseProofMessage(bytes: Uint8Array) {
  const message = parseMessage(bytes)
  
  if (!message || message.kind !== 11) {
    return null
  }
  
  const proof = decodeProofPayload(message.body)
  
  if (!proof) {
    console.log('Invalid proof payload')
    return null
  }
  
  console.log('Proof of Existence:')
  console.log('  Operation:', proof.operation)
  console.log('  Algorithm:', proof.algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512')
  console.log('  Hash:', bytesToHex(proof.hash))
  
  if (proof.metadata) {
    if (proof.metadata.filename) {
      console.log('  Filename:', proof.metadata.filename)
    }
    if (proof.metadata.mimeType) {
      console.log('  MIME Type:', proof.metadata.mimeType)
    }
    if (proof.metadata.fileSize) {
      console.log('  Size:', formatFileSize(proof.metadata.fileSize))
    }
  }
  
  return proof
}
```

## Resolve Anchors

Find parent messages:

```typescript
interface AnchorIndexer {
  findByPrefix(prefix: string): Promise<string[]>
  getMessage(txid: string): Promise<AnchorMessage>
}

async function resolveAnchors(
  message: AnchorMessage,
  indexer: AnchorIndexer
) {
  const resolutions = []
  
  for (const anchor of message.anchors) {
    const prefixHex = bytesToHex(anchor.txidPrefix)
    
    // Find matching transactions
    const matches = await indexer.findByPrefix(prefixHex)
    
    if (matches.length === 0) {
      resolutions.push({
        status: 'orphan',
        prefix: prefixHex,
        vout: anchor.vout
      })
    } else if (matches.length === 1) {
      resolutions.push({
        status: 'resolved',
        txid: matches[0],
        vout: anchor.vout
      })
    } else {
      resolutions.push({
        status: 'ambiguous',
        candidates: matches,
        vout: anchor.vout
      })
    }
  }
  
  return resolutions
}
```

## Batch Processing

Parse multiple transactions:

```typescript
async function parseBlock(
  blockHeight: number,
  indexer: AnchorIndexer
) {
  const txids = await indexer.getBlockTransactions(blockHeight)
  const messages: Array<{
    txid: string
    vout: number
    message: AnchorMessage
    kind: number
  }> = []
  
  for (const txid of txids) {
    const tx = await indexer.getRawTransaction(txid)
    const result = extractFromOpReturn(tx) || extractFromWitness(tx)
    
    if (result) {
      messages.push({
        txid,
        vout: result.vout || 0,
        message: result.message || result,
        kind: (result.message || result).kind
      })
    }
  }
  
  // Group by kind
  const byKind = messages.reduce((acc, m) => {
    const kind = m.kind
    if (!acc[kind]) acc[kind] = []
    acc[kind].push(m)
    return acc
  }, {} as Record<number, typeof messages>)
  
  console.log(`Block ${blockHeight} - ${messages.length} Anchor messages:`)
  for (const [kind, msgs] of Object.entries(byKind)) {
    console.log(`  Kind ${kind}: ${msgs.length} messages`)
  }
  
  return messages
}
```

## Stream Processing

Process messages as they arrive:

```typescript
async function* streamMessages(
  startBlock: number,
  indexer: AnchorIndexer
): AsyncGenerator<{
  block: number
  txid: string
  message: AnchorMessage
}> {
  let currentBlock = startBlock
  
  while (true) {
    const chainTip = await indexer.getBlockCount()
    
    while (currentBlock <= chainTip) {
      const messages = await parseBlock(currentBlock, indexer)
      
      for (const msg of messages) {
        yield {
          block: currentBlock,
          txid: msg.txid,
          message: msg.message
        }
      }
      
      currentBlock++
    }
    
    // Wait for new blocks
    await sleep(10000)
  }
}

// Usage
for await (const { block, txid, message } of streamMessages(800000, indexer)) {
  console.log(`Block ${block}: ${txid} - Kind ${message.kind}`)
  
  // Process each message type
  if (message.kind === AnchorKind.Text) {
    const text = new TextDecoder().decode(message.body)
    console.log('  Text:', text.slice(0, 50))
  }
}
```

## Verification

Validate a proof:

```typescript
async function verifyProof(
  file: File,
  proofTxid: string,
  indexer: AnchorIndexer
): Promise<{
  verified: boolean
  timestamp?: Date
  error?: string
}> {
  // 1. Get the proof from chain
  const tx = await indexer.getRawTransaction(proofTxid)
  const result = extractFromOpReturn(tx)
  
  if (!result || result.message.kind !== 11) {
    return { verified: false, error: 'Not a proof transaction' }
  }
  
  const proof = decodeProofPayload(result.message.body)
  if (!proof) {
    return { verified: false, error: 'Invalid proof payload' }
  }
  
  // 2. Hash the file
  const arrayBuffer = await file.arrayBuffer()
  const algo = proof.algorithm === HashAlgorithm.SHA256 ? 'SHA-256' : 'SHA-512'
  const hashBuffer = await crypto.subtle.digest(algo, arrayBuffer)
  const fileHash = new Uint8Array(hashBuffer)
  
  // 3. Compare hashes
  if (fileHash.length !== proof.hash.length) {
    return { verified: false, error: 'Hash size mismatch' }
  }
  
  for (let i = 0; i < fileHash.length; i++) {
    if (fileHash[i] !== proof.hash[i]) {
      return { verified: false, error: 'Hash does not match' }
    }
  }
  
  // 4. Get block timestamp
  const blockHash = tx.blockhash
  const block = await indexer.getBlock(blockHash)
  const timestamp = new Date(block.time * 1000)
  
  return {
    verified: true,
    timestamp
  }
}

// Usage
const result = await verifyProof(documentFile, 'abc123...', indexer)

if (result.verified) {
  console.log('Document verified!')
  console.log('Timestamped:', result.timestamp)
} else {
  console.log('Verification failed:', result.error)
}
```

## Error Handling

```typescript
function safeParseMessage(bytes: Uint8Array) {
  try {
    // Validate minimum size
    if (bytes.length < 6) {
      return { success: false, error: 'Payload too short' }
    }
    
    // Validate magic bytes
    if (!isAnchorMessage(bytes)) {
      return { success: false, error: 'Invalid magic bytes' }
    }
    
    // Parse message
    const message = parseMessage(bytes)
    
    if (!message) {
      return { success: false, error: 'Parse failed' }
    }
    
    // Validate anchor count
    const anchorCount = bytes[5]
    const minSize = 6 + anchorCount * 9
    if (bytes.length < minSize) {
      return { success: false, error: 'Truncated anchors' }
    }
    
    return { success: true, message }
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
```

## Next Steps

- [Create a Message](/examples/create-message) - Create new messages
- [Reply to a Message](/examples/reply-to-message) - Threading
- [SDK API Reference](/sdk/api-reference) - Complete API docs

