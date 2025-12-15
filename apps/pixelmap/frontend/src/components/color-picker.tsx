"use client";

import { useState } from "react";
import { rgbToHex, hexToRgb } from "@/lib/api";

interface ColorPickerProps {
  color: { r: number; g: number; b: number };
  onChange: (color: { r: number; g: number; b: number }) => void;
}

// Retro palette inspired by classic 8-bit games
const PALETTE = [
  // Row 1: Grayscale
  "#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#e6e6e6", "#ffffff",
  // Row 2: Reds
  "#330000", "#660000", "#990000", "#cc0000", "#ff0000", "#ff3333", "#ff6666", "#ff9999", "#ffcccc",
  // Row 3: Oranges
  "#331a00", "#663300", "#994d00", "#cc6600", "#ff8000", "#ff9933", "#ffb366", "#ffcc99", "#ffe6cc",
  // Row 4: Yellows
  "#333300", "#666600", "#999900", "#cccc00", "#ffff00", "#ffff33", "#ffff66", "#ffff99", "#ffffcc",
  // Row 5: Greens
  "#003300", "#006600", "#009900", "#00cc00", "#00ff00", "#33ff33", "#66ff66", "#99ff99", "#ccffcc",
  // Row 6: Cyans
  "#003333", "#006666", "#009999", "#00cccc", "#00ffff", "#33ffff", "#66ffff", "#99ffff", "#ccffff",
  // Row 7: Blues
  "#000033", "#000066", "#000099", "#0000cc", "#0000ff", "#3333ff", "#6666ff", "#9999ff", "#ccccff",
  // Row 8: Purples
  "#330033", "#660066", "#990099", "#cc00cc", "#ff00ff", "#ff33ff", "#ff66ff", "#ff99ff", "#ffccff",
  // Row 9: Bitcoin colors
  "#f7931a", "#ff6b35", "#00d9ff", "#4a90d9", "#2d5016",
];

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const hexColor = rgbToHex(color.r, color.g, color.b);

  const handleHexChange = (hex: string) => {
    const rgb = hexToRgb(hex);
    onChange(rgb);
  };

  return (
    <div className="space-y-4">
      {/* Current color preview */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-700 shadow-lg"
          style={{ backgroundColor: hexColor }}
        />
        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-1">Selected Color</div>
          <input
            type="text"
            value={hexColor.toUpperCase()}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                       font-mono text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* RGB sliders */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-8 text-sm text-red-400 font-mono">R</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.r}
            onChange={(e) => onChange({ ...color, r: parseInt(e.target.value) })}
            className="flex-1 accent-red-500"
          />
          <span className="w-10 text-sm text-gray-400 font-mono text-right">{color.r}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 text-sm text-green-400 font-mono">G</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.g}
            onChange={(e) => onChange({ ...color, g: parseInt(e.target.value) })}
            className="flex-1 accent-green-500"
          />
          <span className="w-10 text-sm text-gray-400 font-mono text-right">{color.g}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 text-sm text-blue-400 font-mono">B</span>
          <input
            type="range"
            min="0"
            max="255"
            value={color.b}
            onChange={(e) => onChange({ ...color, b: parseInt(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <span className="w-10 text-sm text-gray-400 font-mono text-right">{color.b}</span>
        </div>
      </div>

      {/* Palette */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          <span>{showCustom ? "▼" : "▶"}</span>
          <span>Color Palette</span>
        </button>

        {showCustom && (
          <div className="grid grid-cols-11 gap-1 p-2 bg-gray-900 rounded-lg">
            {PALETTE.map((hex) => {
              const isSelected = hex.toLowerCase() === hexColor.toLowerCase();
              return (
                <button
                  key={hex}
                  onClick={() => handleHexChange(hex)}
                  className={`color-swatch ${isSelected ? "selected" : ""}`}
                  style={{ backgroundColor: hex }}
                  title={hex.toUpperCase()}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Native color picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Custom:</label>
        <input
          type="color"
          value={hexColor}
          onChange={(e) => handleHexChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
    </div>
  );
}


