import { motion } from 'framer-motion';
import { INTERVENTIONS } from '../lib/constants';

// Group placements by type → { count, totalCost }
function groupPlacements(placements) {
  const groups = {};
  for (const { type } of placements) {
    if (!groups[type]) groups[type] = { count: 0, totalCost: 0 };
    groups[type].count += 1;
    groups[type].totalCost += INTERVENTIONS[type].cost;
  }
  return groups;
}

export default function StatsBar({ stats, placements, onRemove, heatmapOpacity, onOpacityChange, heatmapVisible }) {
  const {
    avgReduction,
    maxReduction,
    pctImproved,
    energySavingsKwh,
    totalCost,
  } = stats;

  const statItems = [
    { label: 'Avg ΔT',  value: `−${avgReduction.toFixed(1)}`,         unit: '°C'  },
    { label: 'Max ΔT',  value: `−${maxReduction.toFixed(1)}`,          unit: '°C'  },
    { label: 'Area',    value: pctImproved,                             unit: '%'   },
    { label: 'Energy',  value: energySavingsKwh.toLocaleString(),       unit: 'kWh' },
    { label: 'Budget',  value: `$${totalCost.toLocaleString()}`,        unit: 'SGD' },
    { label: 'Placed',  value: placements.length.toString(),            unit: ''    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="stats-bar"
    >
      <div className="stats-bar__inner">
        <div className="stats-bar__group">
          {statItems.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-item__label">{s.label}</span>
              <span className="stat-item__value">{s.value}</span>
              {s.unit && <span className="stat-item__unit">{s.unit}</span>}
            </div>
          ))}
        </div>

        <div className="heat-scale">
          <div className="heat-scale__opacity">
            <span className="heat-scale__opacity-label">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              disabled={!heatmapVisible}
              className="heat-scale__slider"
              title={`Heatmap opacity: ${Math.round(heatmapOpacity * 100)}%`}
            />
            <span className="heat-scale__pct">{Math.round(heatmapOpacity * 100)}%</span>
          </div>
          <div className="heat-scale__sep" />
          <span className="heat-scale__label">20°</span>
          <div className="heat-scale__bar" />
          <span className="heat-scale__label">52°</span>
        </div>
      </div>

      {placements.length > 0 && (
        <div className="placement-section">
          {Object.entries(groupPlacements(placements)).map(([type, { count, totalCost }]) => (
            <div key={type} className="placement-chip">
              <span className="placement-chip__emoji">{INTERVENTIONS[type].emoji}</span>
              <span className="placement-chip__label">{INTERVENTIONS[type].label}</span>
              <span className="placement-chip__count">×{count}</span>
              <span className="placement-chip__cost">${totalCost.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
