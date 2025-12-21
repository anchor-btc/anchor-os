# BitDNS Chrome Extension

Resolve `.bit` domains from the Bitcoin blockchain directly in your browser.

## Features

- Automatic `.bit` domain resolution
- Local caching with TTL support
- Custom API endpoint configuration
- Statistics tracking
- Recent lookups history

## Installation

### From Source

1. Clone the repository
2. Navigate to the extension directory:
   ```bash
   cd apps/bitdns/extension
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open Chrome and navigate to `chrome://extensions`

5. Enable "Developer mode" (toggle in top-right corner)

6. Click "Load unpacked" and select the `dist` folder

### Manual Installation

1. Download or clone this folder
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this folder

## Usage

Once installed, the extension will automatically intercept requests to `.bit` domains and resolve them using the BitDNS API.

### Quick Resolve

1. Click the BitDNS icon in your browser toolbar
2. Enter a `.bit` domain name
3. Click "Resolve" to see the IP address

### Settings

- **API URL**: Configure the BitDNS API endpoint (default: `http://localhost:3006`)
- **Clear Cache**: Clear the local DNS cache

## How It Works

1. When you navigate to a `.bit` domain, the extension intercepts the request
2. It queries the BitDNS API to resolve the domain
3. If an A or AAAA record is found, the request is redirected to that IP
4. If a CNAME record is found, it redirects to the target domain
5. Results are cached locally for performance

## Configuration

The extension stores configuration in Chrome's local storage:

- `apiUrl`: The BitDNS API endpoint
- `stats`: Resolution statistics

## Development

### File Structure

```
extension/
├── manifest.json    # Chrome extension manifest
├── background.js    # Service worker for DNS resolution
├── popup.html       # Extension popup UI
├── popup.js         # Popup functionality
└── icons/           # Extension icons
```

### Building

```bash
npm run build
```

This copies all necessary files to the `dist` directory.

## Permissions

The extension requires the following permissions:

- `storage`: To store settings and cache
- `declarativeNetRequest`: To intercept and redirect requests
- `host_permissions`: To access `.bit` domains

## License

MIT
