# Kind 4: Image

The **Image** kind is used for embedding image data directly on-chain. It supports various image formats with automatic MIME type detection.

## Overview

- **Kind**: 4 (`0x04`)
- **Name**: Image
- **Status**: Core
- **Max Payload**: ~4 MB (Inscription/Witness carriers)

::: tip Large Payloads
Images typically exceed OP_RETURN's 80-byte limit. Use Inscription or Witness Data carriers for image messages.
:::

## Payload Format

The image body is raw image bytes. The format is detected from magic bytes:

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| 0..n | image_data | bytes | Raw image file bytes |

### Supported Formats

| Format | Magic Bytes | MIME Type |
|--------|-------------|-----------|
| JPEG | `FF D8 FF` | image/jpeg |
| PNG | `89 50 4E 47` | image/png |
| GIF | `47 49 46 38` | image/gif |
| WebP | `52 49 46 46` + `57 45 42 50` | image/webp |
| BMP | `42 4D` | image/bmp |
| SVG | `3C 73 76 67` or `3C 3F 78 6D 6C` | image/svg+xml |

## TypeScript Interface

```typescript
interface ImageMessage extends AnchorMessage {
  kind: AnchorKind.Image  // 4
  body: Uint8Array
  mimeType?: string  // Detected from magic bytes
  width?: number     // If metadata available
  height?: number
}
```

## Encoding Example

```typescript
import { createMessage, CarrierType } from '@AnchorProtocol/anchor-sdk'

// Read image file
const imageFile = await fetch('/path/to/image.png')
const imageBytes = new Uint8Array(await imageFile.arrayBuffer())

// Create image message
const message = createMessage({
  kind: 4,  // Image
  bodyBytes: imageBytes,
  carrier: CarrierType.Inscription  // Required for large payloads
})
```

## Decoding Example

```typescript
function detectImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null
  
  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }
  
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && 
      bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png'
  }
  
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && 
      bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  
  // WebP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && 
      bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && 
      bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  
  return null
}

function decodeImageMessage(message: AnchorMessage): ImageMessage {
  const mimeType = detectImageMimeType(message.body)
  return {
    ...message,
    mimeType
  }
}
```

## Full Transaction Example

```typescript
import { AnchorWallet, CarrierType } from '@AnchorProtocol/anchor-sdk'

async function uploadImage(
  wallet: AnchorWallet,
  file: File
): Promise<string> {
  // Read file as bytes
  const arrayBuffer = await file.arrayBuffer()
  const imageBytes = new Uint8Array(arrayBuffer)
  
  // Validate size
  const maxSize = 400_000  // 400KB recommended max
  if (imageBytes.length > maxSize) {
    throw new Error(`Image too large: ${imageBytes.length} bytes`)
  }
  
  // Create message
  const message = createMessage({
    kind: 4,
    bodyBytes: imageBytes,
    carrier: CarrierType.Inscription
  })
  
  // Broadcast
  const result = await wallet.broadcast(message)
  console.log('Image inscribed at:', result.txid)
  
  return result.txid
}
```

## Displaying Images

```typescript
function createImageUrl(message: ImageMessage): string {
  const mimeType = message.mimeType || 'application/octet-stream'
  const blob = new Blob([message.body], { type: mimeType })
  return URL.createObjectURL(blob)
}

// In React
function OnChainImage({ txid }: { txid: string }) {
  const [imageUrl, setImageUrl] = useState<string>()
  
  useEffect(() => {
    async function load() {
      const message = await indexer.getMessage(txid)
      if (message.kind === 4) {
        const url = createImageUrl(message as ImageMessage)
        setImageUrl(url)
      }
    }
    load()
    
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [txid])
  
  return imageUrl ? <img src={imageUrl} alt="On-chain image" /> : null
}
```

## Size and Fee Considerations

### Inscription Costs

| Image Size | vBytes (~) | Fee @ 10 sat/vB |
|------------|------------|-----------------|
| 10 KB | 2,500 | 25,000 sats |
| 50 KB | 12,500 | 125,000 sats |
| 100 KB | 25,000 | 250,000 sats |
| 400 KB | 100,000 | 1,000,000 sats |

### Optimization Tips

1. **Compress images** before embedding
2. **Use WebP** for best compression ratio
3. **Resize** to reasonable dimensions
4. **Consider thumbnails** with off-chain full images

```typescript
async function optimizeImage(
  file: File,
  maxWidth = 800,
  quality = 0.8
): Promise<Uint8Array> {
  // Create canvas
  const img = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / img.width)
  
  const canvas = document.createElement('canvas')
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  // Export as WebP
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })
  
  return new Uint8Array(await blob.arrayBuffer())
}
```

## Validation

```typescript
function isValidImageMessage(message: AnchorMessage): boolean {
  if (message.kind !== 4) return false
  if (message.body.length < 4) return false
  
  // Must have recognizable magic bytes
  const mimeType = detectImageMimeType(message.body)
  return mimeType !== null
}

function validateImageSize(
  bytes: Uint8Array,
  maxSize = 400_000
): { valid: boolean; error?: string } {
  if (bytes.length > maxSize) {
    return {
      valid: false,
      error: `Image exceeds ${maxSize} bytes (${bytes.length})`
    }
  }
  return { valid: true }
}
```

## Use Cases

### Profile Pictures

```typescript
// Upload avatar
const avatarTxid = await uploadImage(wallet, avatarFile)

// Reference in profile (Kind 1 text with JSON)
const profile = createMessage({
  kind: 1,
  body: JSON.stringify({
    name: 'Satoshi',
    avatar: avatarTxid
  })
})
```

### NFT-style Collectibles

```typescript
// Inscribe unique artwork
const artworkTxid = await uploadImage(wallet, artworkFile)

// The inscription itself serves as proof of ownership
// First-seen rule establishes provenance
```

### Documentation Attachments

```typescript
// Attach image to a text post
const imageTxid = await uploadImage(wallet, diagramFile)

const post = createMessage({
  kind: 1,
  body: `Here's the architecture diagram: ${imageTxid}`,
  anchors: [{ txid: imageTxid, vout: 0 }]  // Reference the image
})
```

## See Also

- [Carrier Types](/protocol/carriers) - Inscription details
- [Proof (Kind 11)](/kinds/proof) - Hash images instead of embedding
- [Ordinals Compatibility](/sdk/encoding#ordinals) - Cross-protocol support



