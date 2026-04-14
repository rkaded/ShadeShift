import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import ThermalCanvas from './components/ThermalCanvas';
import InterventionToolbar from './components/InterventionToolbar';
import StatsSidebar from './components/StatsSidebar';
import { useHeatGrid } from './hooks/useHeatGrid';
import './styles/app.css';

export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.60);
  const { grid, bounds, placements, applyIntervention, removeIntervention, clearInterventions, stats } = useHeatGrid();

  const handleMapClick = useCallback(
    ({ row, col }) => {
      if (!activeTool) return;
      applyIntervention(row, col, activeTool);
    },
    [activeTool, applyIntervention]
  );

  return (
    <div className="app-shell">
      <InterventionToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        heatmapVisible={heatmapVisible}
        onToggleHeatmap={() => setHeatmapVisible((v) => !v)}
        heatmapOpacity={heatmapOpacity}
        onOpacityChange={setHeatmapOpacity}
        onClearAll={clearInterventions}
      />

      <div className="workspace">
        <div className="map-area">
          <MapView bounds={bounds} onCellClick={handleMapClick}>
            <ThermalCanvas grid={grid} bounds={bounds} placements={placements} visible={heatmapVisible} opacity={heatmapOpacity} />
          </MapView>
        </div>

        <StatsSidebar stats={stats} placements={placements} onRemove={removeIntervention} />
      </div>
    </div>
  );
}
