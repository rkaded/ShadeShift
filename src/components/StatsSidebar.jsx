/**
 * StatsSidebar
 *
 * Live stats panel shown to the right of the map.
 * Updates on every grid recalculation.
 */

import React from 'react';
import { INTERVENTIONS } from '../lib/constants';

function StatRow({ label, value, unit }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}<small> {unit}</small></span>
    </div>
  );
}

export default function StatsSidebar({ stats, placements, onRemove }) {
  const {
    avgReduction,
    maxReduction,
    pctImproved,
    totalCost,
    energySavingsKwh,
    equityScore,
  } = stats;

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Impact Summary</h2>

      <section className="stat-group">
        <StatRow label="Avg. temp reduction"  value={avgReduction.toFixed(2)} unit="°C" />
        <StatRow label="Max. temp reduction"  value={maxReduction.toFixed(2)} unit="°C" />
        <StatRow label="Area improved"        value={pctImproved}             unit="%" />
        <StatRow label="Est. energy savings"  value={energySavingsKwh.toLocaleString()} unit="kWh" />
        <StatRow label="Equity score"         value={equityScore.toFixed(1)} unit="/ 100" />
      </section>

      <section className="stat-group">
        <h3 className="stat-group-title">Budget</h3>
        <StatRow label="Total cost" value={`$${totalCost.toLocaleString()}`} unit="SGD" />
        <StatRow label="Interventions placed" value={placements.length} unit="" />
      </section>

      {placements.length > 0 && (
        <section className="stat-group">
          <h3 className="stat-group-title">Placed</h3>
          {placements.map(({ type }, index) => (
            <div key={index} className="stat-row placement-row">
              <span className="stat-label">
                {INTERVENTIONS[type].emoji} {INTERVENTIONS[type].label}
              </span>
              <button
                className="remove-btn"
                onClick={() => onRemove(index)}
                title="Remove this intervention"
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="stat-group sidebar-legend">
        <h3 className="stat-group-title">Temperature Scale</h3>
        <div className="legend-bar" />
        <div className="legend-labels">
          <span>31°C</span><span>40°C</span><span>49°C</span>
        </div>
      </section>
    </aside>
  );
}
