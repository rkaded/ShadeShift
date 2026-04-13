/**
 * InterventionToolbar
 *
 * Horizontal strip of intervention buttons at the top of the screen.
 * Active tool is highlighted; clicking again deselects it.
 */

import React from 'react';
import { INTERVENTIONS } from '../lib/constants';

export default function InterventionToolbar({ activeTool, onSelectTool, heatmapVisible, onToggleHeatmap, onClearAll }) {
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
          {heatmapVisible ? '🌡️ Hide Heat Map' : '🌡️ Show Heat Map'}
        </button>
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
