import { motion } from 'framer-motion';
import { TreePine, Umbrella, Home, Square, Droplets, Flame, RotateCcw } from 'lucide-react';

const TOOLS = [
  { id: 'tree',         label: 'Tree',   cost: '$800',  icon: <TreePine size={20} />, color: 'var(--tool-tree)' },
  { id: 'shade',        label: 'Shelter', cost: '$2k',  icon: <Umbrella size={20} />, color: 'var(--tool-shade)' },
  { id: 'greenRoof',    label: 'Roof',   cost: '$15k',  icon: <Home size={20} />,     color: 'var(--tool-roof)' },
  { id: 'coolPavement', label: 'Pave',   cost: '$50',   icon: <Square size={20} />,   color: 'var(--tool-pavement)' },
  { id: 'water',        label: 'Fountain', cost: '$50k', icon: <Droplets size={20} />, color: 'var(--tool-water)' },
];

export default function ToolRail({
  activeTool,
  onSelectTool,
  heatmapVisible,
  onToggleHeatmap,
  onClearAll,
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="tool-rail"
    >
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <div key={tool.id} className="tool-btn">
            <button
              className={`tool-btn__inner ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTool(isActive ? null : tool.id)}
              title={tool.label}
            >
              <span
                className="tool-btn__icon"
                style={isActive ? { color: tool.color } : {}}
              >
                {tool.icon}
              </span>
              <span className="tool-btn__cost">{tool.cost}</span>
            </button>
            <div className="tool-btn__tooltip">{tool.label}</div>
          </div>
        );
      })}

      <div className="rail-sep" />

      <button
        className={`rail-icon-btn ${heatmapVisible ? 'active' : ''}`}
        onClick={onToggleHeatmap}
        title={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
      >
        <Flame size={18} />
      </button>

      <button
        className="rail-icon-btn"
        onClick={onClearAll}
        title="Clear all"
      >
        <RotateCcw size={16} />
      </button>
    </motion.aside>
  );
}
