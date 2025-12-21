"use client";

import { 
  Eraser, Grid3X3, MousePointer2, Move, Pencil, Trash2, Minus, Plus,
  Undo2, Redo2, PaintBucket, Slash, Square, Circle, Pipette, 
  ZoomIn, ZoomOut, Maximize2
} from "lucide-react";

export type Tool = 
  | "select" 
  | "paint" 
  | "erase" 
  | "pan" 
  | "line" 
  | "rectangle" 
  | "circle" 
  | "fill" 
  | "eyedropper";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  // New props
  selectedColor: { r: number; g: number; b: number };
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoomLevel: number;
  cursorPosition: { x: number; y: number } | null;
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
  selectedColor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoomLevel,
  cursorPosition,
}: ToolbarProps) {
  
  // Group 1: Selection & Navigation
  const navTools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: "select", icon: <MousePointer2 size={18} />, label: "Select", shortcut: "V" },
    { id: "pan", icon: <Move size={18} />, label: "Pan", shortcut: "H" },
  ];

  // Group 2: Drawing Tools
  const drawTools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: "paint", icon: <Pencil size={18} />, label: "Brush", shortcut: "B" },
    { id: "line", icon: <Slash size={18} />, label: "Line", shortcut: "L" },
    { id: "rectangle", icon: <Square size={18} />, label: "Rectangle", shortcut: "R" },
    { id: "circle", icon: <Circle size={18} />, label: "Circle", shortcut: "C" },
    { id: "fill", icon: <PaintBucket size={18} />, label: "Fill", shortcut: "F" },
    { id: "erase", icon: <Eraser size={18} />, label: "Erase", shortcut: "E" },
  ];

  // Group 3: Color Tools
  const colorTools: Array<{ id: Tool; icon: React.ReactNode; label: string; shortcut: string }> = [
    { id: "eyedropper", icon: <Pipette size={18} />, label: "Eyedropper", shortcut: "I" },
  ];

  const showBrushControls = ["paint", "erase", "line", "rectangle", "circle"].includes(activeTool);

  const ToolButton = ({ tool, isActive }: { tool: typeof navTools[0]; isActive: boolean }) => (
    <button
      onClick={() => onToolChange(tool.id)}
      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all
        ${isActive
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          : "text-white/50 hover:text-white hover:bg-white/[0.08]"
        }`}
      title={`${tool.label} (${tool.shortcut})`}
    >
      {tool.icon}
    </button>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Undo/Redo */}
      <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all
            ${canUndo 
              ? "text-white/60 hover:text-white hover:bg-white/[0.08]" 
              : "text-white/20 cursor-not-allowed"
            }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all
            ${canRedo 
              ? "text-white/60 hover:text-white hover:bg-white/[0.08]" 
              : "text-white/20 cursor-not-allowed"
            }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-white/10" />

      {/* Navigation Tools */}
      <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
        {navTools.map((tool) => (
          <ToolButton key={tool.id} tool={tool} isActive={activeTool === tool.id} />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-white/10" />

      {/* Drawing Tools */}
      <div className="flex gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
        {drawTools.map((tool) => (
          <ToolButton key={tool.id} tool={tool} isActive={activeTool === tool.id} />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-white/10" />

      {/* Color Preview + Eyedropper */}
      <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
        {/* Current Color Preview */}
        <div 
          className="w-8 h-8 rounded-md border-2 border-white/20 shadow-inner"
          style={{ backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})` }}
          title={`Current Color: RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`}
        />
        {colorTools.map((tool) => (
          <ToolButton key={tool.id} tool={tool} isActive={activeTool === tool.id} />
        ))}
      </div>

      {/* Brush Size Controls */}
      {showBrushControls && (
        <>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2 py-1 border border-white/[0.06]">
            <span className="text-[11px] text-white/40 uppercase tracking-wide">Size</span>
            <button
              onClick={() => onBrushSizeChange(Math.max(1, brushSize - 1))}
              className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Decrease size ([)"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-mono text-orange-500 w-5 text-center">{brushSize}</span>
            <button
              onClick={() => onBrushSizeChange(Math.min(50, brushSize + 1))}
              className="w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Increase size (])"
            >
              <Plus size={12} />
            </button>
            <input
              type="range"
              min={1}
              max={50}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="w-16 h-1"
            />
          </div>
        </>
      )}

      {/* Divider */}
      <div className="w-px h-7 bg-white/10" />

      {/* Grid Toggle */}
      <button
        onClick={onToggleGrid}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all border
          ${showGrid
            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
            : "text-white/40 hover:text-white hover:bg-white/[0.06] border-transparent"
          }`}
        title="Toggle Grid (G)"
      >
        <Grid3X3 size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-7 bg-white/10" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
        <button
          onClick={onZoomOut}
          className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut size={15} />
        </button>
        <span className="text-xs font-mono text-white/60 w-12 text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={onZoomReset}
          className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Fit to Screen (0)"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Coordinates Display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
        <span className="text-[10px] text-white/40 uppercase tracking-wide">XY</span>
        <span className="text-sm font-mono text-white font-medium tabular-nums min-w-[90px] text-right">
          {cursorPosition 
            ? `${cursorPosition.x.toLocaleString()}, ${cursorPosition.y.toLocaleString()}`
            : "—, —"
          }
        </span>
      </div>

      {/* Selection Info */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        selectedCount > 0 
          ? "bg-orange-500/10 border-orange-500/30" 
          : "bg-white/[0.04] border-white/[0.06]"
      }`}>
        <span className={`text-[10px] uppercase tracking-wide ${
          selectedCount > 0 ? "text-orange-400" : "text-white/40"
        }`}>Selected</span>
        <span className={`text-sm font-mono font-semibold tabular-nums min-w-[50px] text-right ${
          selectedCount > 0 ? "text-orange-500" : "text-white/50"
        }`}>
          {selectedCount.toLocaleString()}
        </span>
        {selectedCount > 0 && (
          <button
            onClick={onClearSelection}
            className="flex items-center justify-center w-6 h-6 rounded-md 
                       text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
            title="Clear Selection (Esc)"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
