import { Config } from 'tailwindcss';

/**
 * Anchor Design System - Tailwind CSS Preset
 *
 * This preset provides consistent design tokens across all Anchor apps.
 * Apps can extend this preset and override the --app-accent variable
 * to customize their primary color.
 *
 * Usage in apps:
 * ```ts
 * import { anchorPreset } from "@AnchorProtocol/ui/tailwind.config";
 *
 * export default {
 *   presets: [anchorPreset],
 *   content: [
 *     "./src/**\/*.{ts,tsx}",
 *     "./node_modules/@AnchorProtocol/ui/dist/**\/*.js"
 *   ]
 * } satisfies Config;
 * ```
 */
declare const anchorPreset: Partial<Config>;
declare const config: Config;

export { anchorPreset, config as default };
