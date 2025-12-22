# @AnchorProtocol/ui

Anchor Design System - A collection of React components built with Tailwind CSS for building consistent UIs across Anchor applications.

## Installation

```bash
npm install @AnchorProtocol/ui
```

## Usage

### Import Components

```tsx
// Import from main entry (tree-shaking may vary)
import { Button, Card, Input, cn } from "@AnchorProtocol/ui";

// Or import individually for better tree-shaking
import { Button } from "@AnchorProtocol/ui/button";
import { Card, CardHeader, CardContent } from "@AnchorProtocol/ui/card";
import { Input } from "@AnchorProtocol/ui/input";
import { cn } from "@AnchorProtocol/ui/utils/cn";
```

### Setup Tailwind CSS

In your `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";
import { anchorPreset } from "@AnchorProtocol/ui/tailwind.config";

export default {
  presets: [anchorPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    // Include UI library for Tailwind to scan
    "./node_modules/@AnchorProtocol/ui/dist/**/*.js",
  ],
} satisfies Config;
```

### Import Styles

In your global CSS or layout:

```css
/* Base styles with design tokens */
@import "@AnchorProtocol/ui/styles/globals.css";

/* Optional: App-specific theme */
@import "@AnchorProtocol/ui/styles/themes/threads.css";
```

Or in your layout component:

```tsx
import "@AnchorProtocol/ui/styles/globals.css";
import "@AnchorProtocol/ui/styles/themes/threads.css";
```

## Available Themes

| Theme | Color | App |
|-------|-------|-----|
| `threads.css` | Orange | Anchor Threads |
| `canvas.css` | Purple | Anchor Canvas |
| `domains.css` | Cyan | Anchor Domains |
| `places.css` | Blue | Anchor Places |
| `proofs.css` | Emerald | Anchor Proofs |
| `tokens.css` | Amber | Anchor Tokens |
| `oracles.css` | Violet | Anchor Oracles |
| `predictions.css` | Amber | Anchor Predictions |
| `dashboard.css` | Bitcoin Orange | Dashboard |

## Components

### Button

```tsx
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="accent">App Accent Color</Button>
<Button variant="destructive">Destructive</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button loading>Loading...</Button>
```

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input

```tsx
<Input placeholder="Email" type="email" />
<Input error placeholder="Invalid input" />
<Input leftElement={<SearchIcon />} placeholder="Search..." />
```

## Dark Mode

The design system supports dark mode via the `.dark` class on the HTML element:

```tsx
// Toggle dark mode
document.documentElement.classList.toggle("dark");
```

## Development

```bash
# Build the package
npm run build

# Watch for changes
npm run dev

# Type check
npm run typecheck
```

## License

MIT

