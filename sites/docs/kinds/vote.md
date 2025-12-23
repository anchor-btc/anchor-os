# Kind 3: Vote

The **Vote** kind is reserved for governance and voting operations. It enables on-chain polls, proposals, and community decision-making.

## Overview

- **Kind**: 3 (`0x03`)
- **Name**: Vote
- **Status**: Core (Reserved)
- **Max Payload**: Carrier-dependent

::: info Reserved Kind
The Vote kind is part of the core protocol but implementation details are still being finalized. The format below is a proposed specification.
:::

## Proposed Payload Format

### Vote Submission

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | 0x01 = VOTE |
| 1-8 | proposal_prefix | bytes | Proposal txid prefix |
| 9 | proposal_vout | u8 | Proposal output index |
| 10 | choice | u8 | Vote choice (0-255) |
| 11+ | weight | varint | Optional vote weight |

### Proposal Creation

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0 | operation | u8 | 0x02 = PROPOSE |
| 1 | num_choices | u8 | Number of options |
| 2 | end_block | u32 | Voting deadline (block height) |
| 6+ | description | utf8 | Proposal text |

## TypeScript Interface

```typescript
enum VoteOperation {
  VOTE = 0x01,
  PROPOSE = 0x02,
  DELEGATE = 0x03,
}

interface VotePayload {
  operation: VoteOperation.VOTE
  proposalPrefix: Uint8Array  // 8 bytes
  proposalVout: number
  choice: number
  weight?: bigint
}

interface ProposalPayload {
  operation: VoteOperation.PROPOSE
  numChoices: number
  endBlock: number
  description: string
}

type VoteMessage = VotePayload | ProposalPayload
```

## Proposed Encoding Example

```typescript
const ANCHOR_KIND_VOTE = 3

function encodeVote(vote: VotePayload): Uint8Array {
  const hasWeight = vote.weight !== undefined
  const weightBytes = hasWeight ? encodeVarint(vote.weight!) : new Uint8Array(0)
  
  const size = 1 + 8 + 1 + 1 + weightBytes.length
  const result = new Uint8Array(size)
  
  let offset = 0
  result[offset++] = VoteOperation.VOTE
  result.set(vote.proposalPrefix, offset)
  offset += 8
  result[offset++] = vote.proposalVout
  result[offset++] = vote.choice
  if (hasWeight) {
    result.set(weightBytes, offset)
  }
  
  return result
}

function encodeProposal(proposal: ProposalPayload): Uint8Array {
  const encoder = new TextEncoder()
  const descBytes = encoder.encode(proposal.description)
  
  const size = 1 + 1 + 4 + descBytes.length
  const result = new Uint8Array(size)
  const view = new DataView(result.buffer)
  
  let offset = 0
  result[offset++] = VoteOperation.PROPOSE
  result[offset++] = proposal.numChoices
  view.setUint32(offset, proposal.endBlock, false)
  offset += 4
  result.set(descBytes, offset)
  
  return result
}
```

## Proposed Decoding Example

```typescript
function decodeVotePayload(bytes: Uint8Array): VoteMessage | null {
  if (bytes.length < 1) return null
  
  const operation = bytes[0] as VoteOperation
  
  switch (operation) {
    case VoteOperation.VOTE: {
      if (bytes.length < 11) return null
      const proposalPrefix = bytes.slice(1, 9)
      const proposalVout = bytes[9]
      const choice = bytes[10]
      
      let weight: bigint | undefined
      if (bytes.length > 11) {
        [weight] = decodeVarint(bytes, 11)
      }
      
      return { operation, proposalPrefix, proposalVout, choice, weight }
    }
    
    case VoteOperation.PROPOSE: {
      if (bytes.length < 6) return null
      const numChoices = bytes[1]
      const view = new DataView(bytes.buffer, bytes.byteOffset)
      const endBlock = view.getUint32(2, false)
      const description = new TextDecoder().decode(bytes.slice(6))
      
      return { operation, numChoices, endBlock, description }
    }
    
    default:
      return null
  }
}
```

## Use Cases

### Simple Poll

```typescript
// Create a yes/no proposal
const proposal = createMessage({
  kind: 3,  // Vote
  bodyBytes: encodeProposal({
    operation: VoteOperation.PROPOSE,
    numChoices: 2,  // 0=No, 1=Yes
    endBlock: currentBlock + 1000,
    description: 'Should we implement feature X?'
  })
})

const result = await wallet.broadcast(proposal)

// Vote on the proposal
const vote = createMessage({
  kind: 3,
  bodyBytes: encodeVote({
    operation: VoteOperation.VOTE,
    proposalPrefix: getTxidPrefix(result.txid),
    proposalVout: 0,
    choice: 1  // Yes
  }),
  anchors: [{ txid: result.txid, vout: 0 }]
})
```

### Weighted Voting

```typescript
// Vote with token-weighted power
const vote = createMessage({
  kind: 3,
  bodyBytes: encodeVote({
    operation: VoteOperation.VOTE,
    proposalPrefix: proposalPrefix,
    proposalVout: 0,
    choice: 2,
    weight: 1000000n  // 1M token weight
  })
})
```

### Vote Delegation

```typescript
// Delegate voting power to another address
const delegate = createMessage({
  kind: 3,
  bodyBytes: encodeDelegation({
    operation: VoteOperation.DELEGATE,
    delegateTo: recipientPubkeyHash,
    duration: 52560  // ~1 year in blocks
  })
})
```

## Vote Counting

```typescript
interface VoteTally {
  proposal: string  // txid
  choices: Map<number, bigint>  // choice -> total weight
  voters: Set<string>  // voter pubkeys (to prevent double voting)
}

async function countVotes(
  proposalTxid: string,
  indexer: AnchorIndexer
): Promise<VoteTally> {
  const votes = await indexer.getVotesForProposal(proposalTxid)
  
  const tally: VoteTally = {
    proposal: proposalTxid,
    choices: new Map(),
    voters: new Set()
  }
  
  for (const vote of votes) {
    // Skip duplicate votes from same voter
    if (tally.voters.has(vote.voterPubkey)) continue
    
    const weight = vote.weight ?? 1n
    const current = tally.choices.get(vote.choice) ?? 0n
    tally.choices.set(vote.choice, current + weight)
    tally.voters.add(vote.voterPubkey)
  }
  
  return tally
}
```

## Validation Rules

1. **Proposal must exist**: Vote anchors must reference valid proposal
2. **Within deadline**: Vote block height ≤ proposal end_block
3. **Valid choice**: 0 ≤ choice < num_choices
4. **One vote per address**: Later votes from same address are ignored

## Security Considerations

- Votes are public and transparent
- Vote weight verification may require additional indexing
- Sybil resistance depends on chosen weighting mechanism
- Consider time-locking proposals for finality

## See Also

- [State (Kind 2)](/kinds/state) - For state updates
- [Token (Kind 20)](/kinds/token) - For token-weighted voting
- [Threading](/concepts/threading) - Reference proposals



