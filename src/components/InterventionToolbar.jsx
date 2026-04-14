/**
 * InterventionToolbar
 *
 * Horizontal strip of intervention buttons at the top of the screen.
 * Active tool is highlighted; clicking again deselects it.
 */

import React from 'react';
import { INTERVENTIONS } from '../lib/constants';

export default function InterventionToolbar({ activeTool, onSelectTool, heatmapVisible, onToggleHeatmap, heatmapOpacity, onOpacityChange, onClearAll }) {
  return (
    <header className="toolbar">
      <span className="toolbar-brand">ShadeShift</span>

      <nav className="toolbar-tools">
        {Object.entries(INTERVENTIONS).map(([key, cfg]) => (
          <button
            key={key}
            className={`tool-btn ${activeTool === key ? 'tool-btn--active' : ''}`}
            onClick={() => onSelectTool(activeTool === key ? null : key)}
            title={`${cfg.label} — cools ${cfg.cooling}°C, costs $${cfg.cost.toLocaleString()}`}
          >
            <span className="tool-emoji">{cfg.emoji}</span>
            <span className="tool-label">{cfg.label}</span>
            <span className="tool-cost">${cfg.cost.toLocaleString()}</span>
          </button>
        ))}
      </nav>

      <div className="toolbar-actions">
        <button
          className={`action-btn ${heatmapVisible ? 'action-btn--active' : ''}`}
          onClick={onToggleHeatmap}
          title="Toggle heat map overlay"
        >
          {heatmapVisible ? '🌡️ Hide' : '🌡️ Show'}
        </button>

        <label className="opacity-control" title="Heat map transparency">
          <span className="opacity-label">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={heatmapOpacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="opacity-slider"
            disabled={!heatmapVisible}
          />
          <span className="opacity-value">{Math.round(heatmapOpacity * 100)}%</span>
        </label>

        <button
          className="action-btn action-btn--danger"
          onClick={onClearAll}
          title="Remove all placed interventions"
        >
          🗑️ Clear All
        </button>
      </div>

      <span className="toolbar-hint">
        {activeTool
          ? `Click the map to place a ${INTERVENTIONS[activeTool].label}`
          : 'Select a tool above, then click the map'}
      </span>
    </header>
  );
}
