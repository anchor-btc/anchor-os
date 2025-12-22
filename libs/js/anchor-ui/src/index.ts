/**
 * @AnchorProtocol/ui - Anchor Design System
 *
 * A collection of React components built with Tailwind CSS
 * for building consistent UIs across Anchor applications.
 *
 * @example
 * ```tsx
 * import { Button, Card, Input, cn } from "@AnchorProtocol/ui";
 *
 * // Or import individually for better tree-shaking:
 * import { Button } from "@AnchorProtocol/ui/button";
 * import { Card } from "@AnchorProtocol/ui/card";
 * ```
 */

// Components
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/card";
export { Input, type InputProps } from "./components/input";

// Utilities
export { cn } from "./utils/cn";

// Re-export Tailwind preset for convenience
export { anchorPreset } from "../tailwind.config";

