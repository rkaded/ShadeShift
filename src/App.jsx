import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ThermalCanvas from './components/ThermalCanvas';
import ToolRail from './components/ToolRail';
import StatsBar from './components/StatsBar';
import { useHeatGrid } from './hooks/useHeatGrid';
import { GRID_ROWS, GRID_COLS } from './lib/constants';
import './styles/app.css';

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

const TOOL_LABELS = {
  tree: 'Tree', shade: 'Shelter', greenRoof: 'Roof',
  coolPavement: 'Pavement', water: 'Fountain',
};

export default function App() {
  const [activeTool,    setActiveTool]    = useState(null);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.60);

  const {
    grid, bounds, placements,
    applyIntervention, removeIntervention, clearInterventions, stats,
  } = useHeatGrid();

  // Derive map center and maxBounds from the live tiff bounds
  const center = bounds
    ? [(bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2]
    : [1.3521, 103.8198];

  const maxBounds = bounds
    ? [[bounds.south - 0.01, bounds.west - 0.01], [bounds.north + 0.01, bounds.east + 0.01]]
    : undefined;

  const handleCellClick = useCallback(
    ({ row, col, lat, lng }) => {
      if (!activeTool) return;
      applyIntervention(row, col, activeTool, lat, lng);
    },
    [activeTool, applyIntervention]
  );

  return (
    <div className="app-shell">
      {/* App header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="app-header"
      >
        <h1 className="app-header__title">ShadeShift</h1>
        <span className="app-header__sub">Singapore Heat Island Simulator</span>
      </motion.header>

      {/* Active tool hint */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="tool-hint"
          >
            Placing: <strong>{TOOL_LABELS[activeTool]}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map fills the entire shell */}
      <div className="map-area">
        <MapContainer
          center={center}
          zoom={12}
          minZoom={10}
          maxZoom={18}
          maxBounds={maxBounds}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          className={activeTool ? 'cursor-crosshair' : ''}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} subdomains="abcd" maxZoom={20} />
          <ClickHandler bounds={bounds} onCellClick={handleCellClick} />
          <ThermalCanvas
            grid={grid}
            bounds={bounds}
            placements={placements}
            visible={heatmapVisible}
            opacity={heatmapOpacity}
          />
        </MapContainer>
      </div>

      {/* Tool rail — left */}
      <ToolRail
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        heatmapVisible={heatmapVisible}
        onToggleHeatmap={() => setHeatmapVisible((v) => !v)}
        heatmapOpacity={heatmapOpacity}
        onOpacityChange={setHeatmapOpacity}
        onClearAll={clearInterventions}
      />

      {/* Stats bar — bottom */}
      <StatsBar
        stats={stats}
        placements={placements}
        onRemove={removeIntervention}
        heatmapOpacity={heatmapOpacity}
        onOpacityChange={setHeatmapOpacity}
        heatmapVisible={heatmapVisible}
      />
    </div>
  );
}

// ── Click handler lives inside MapContainer so it has map context ─────────────
import { useMapEvents } from 'react-leaflet';

function ClickHandler({ bounds, onCellClick }) {
  useMapEvents({
    click(e) {
      if (!bounds) return;
      const { lat, lng } = e.latlng;
      if (lat < bounds.south || lat > bounds.north ||
          lng < bounds.west  || lng > bounds.east) return;

      const row = Math.min(
        Math.floor(((bounds.north - lat) / (bounds.north - bounds.south)) * GRID_ROWS),
        GRID_ROWS - 1
      );
      const col = Math.min(
        Math.floor(((lng - bounds.west) / (bounds.east - bounds.west)) * GRID_COLS),
        GRID_COLS - 1
      );
      onCellClick({ row, col, lat, lng });
    },
  });
  return null;
}
