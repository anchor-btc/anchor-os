"use client";

import { Eraser, Grid3X3, MousePointer2, Move, Pencil, Trash2, Minus, Plus } from "lucide-react";

export type Tool = "select" | "paint" | "erase" | "pan";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

export function Toolbar({
  activeTool,
  onToolChange,
  showGrid,
  onToggleGrid,
  selectedCount,
  onClearSelection,
  brushSize,
  onBrushSizeChange,
}: ToolbarProps) {
  const tools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: "select", icon: <MousePointer2 size={20} />, label: "Select", shortcut: "V" },
    { id: "paint", icon: <Pencil size={20} />, label: "Paint", shortcut: "P" },
    { id: "erase", icon: <Eraser size={20} />, label: "Erase", shortcut: "E" },
    { id: "pan", icon: <Move size={20} />, label: "Pan", shortcut: "H" },
  ];

  const showBrushControls = activeTool === "paint" || activeTool === "erase";

  return (
    <div className="toolbar">
      {/* Tool buttons */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all
              ${
                activeTool === tool.id
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Brush size controls */}
      {showBrushControls && (
        <>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-2 py-1">
            <span className="text-xs text-gray-400">Brush:</span>
            <button
              onClick={() => onBrushSizeChange(Math.max(1, brushSize - 2))}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Decrease brush size"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-mono text-primary w-6 text-center">{brushSize}</span>
            <button
              onClick={() => onBrushSizeChange(Math.min(21, brushSize + 2))}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Increase brush size"
            >
              <Plus size={14} />
            </button>
            <input
              type="range"
              min={1}
              max={21}
              step={2}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="w-20 h-1 accent-primary"
            />
          </div>
        </>
      )}

      <div className="w-px h-8 bg-gray-700" />

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all
          ${
            showGrid
              ? "bg-accent/20 text-accent"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        title="Toggle Grid (G)"
      >
        <Grid3X3 size={20} />
      </button>

      <div className="w-px h-8 bg-gray-700" />

      {/* Selection info */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">
          Selected: <span className="text-primary font-mono">{selectedCount}</span>
        </span>
        {selectedCount > 0 && (
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 
                       hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-all"
            title="Clear Selection"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
