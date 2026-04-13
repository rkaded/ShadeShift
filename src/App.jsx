import React, { useState, useCallback } from 'react';
import MapView from './components/MapView';
import ThermalCanvas from './components/ThermalCanvas';
import InterventionToolbar from './components/InterventionToolbar';
import StatsSidebar from './components/StatsSidebar';
import { useHeatGrid } from './hooks/useHeatGrid';
import { CBD_BOUNDS } from './lib/constants';
import './styles/app.css';

/**
 * Root layout:
 *
 *  ┌──────────────────────────────┬────────────────┐
 *  │  InterventionToolbar (top)   │                │
 *  ├──────────────────────────────┤  StatsSidebar  │
 *  │  MapView + ThermalCanvas     │                │
 *  │  (fills remaining height)    │                │
 *  └──────────────────────────────┴────────────────┘
 */
export default function App() {
  const [activeTool, setActiveTool] = useState(null); // 'tree' | 'shade' | 'greenRoof' | 'coolPavement' | 'water'
  const { grid, placements, applyIntervention, stats } = useHeatGrid();

  const handleMapClick = useCallback(
    ({ row, col }) => {
      if (!activeTool) return;
      applyIntervention(row, col, activeTool);
    },
    [activeTool, applyIntervention]
  );

  return (
    <div className="app-shell">
      <InterventionToolbar activeTool={activeTool} onSelectTool={setActiveTool} />

      <div className="workspace">
        <div className="map-area">
          <MapView bounds={CBD_BOUNDS} onCellClick={handleMapClick}>
            {/* ThermalCanvas renders as a Leaflet overlay inside MapView */}
            <ThermalCanvas grid={grid} bounds={CBD_BOUNDS} placements={placements} />
          </MapView>
        </div>

        <StatsSidebar stats={stats} placements={placements} />
      </div>
    </div>
  );
}
