/**
 * useHeatGrid
 *
 * Central state hook for the simulation.
 * Owns: baseline grid, current grid, placements list, aggregate stats.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadThermalRaster } from '../lib/loadThermalRaster';
import { applyIntervention as diffuse, computeStats } from '../lib/heatDiffusion';
import { INTERVENTIONS, GRID_ROWS, GRID_COLS } from '../lib/constants';

const EMPTY_STATS = {
  avgReduction: 0,
  maxReduction: 0,
  cellsImproved: 0,
  pctImproved: '0.0',
  totalCost: 0,
  energySavingsKwh: 0,
  equityScore: 0,
};

export function useHeatGrid() {
  const baselineRef = useRef(null); // Float32Array — never mutated after load
  const [grid, setGrid]           = useState(null);            // Float32Array | null
  const [placements, setPlacements] = useState([]);            // [{row,col,type}]
  const [stats, setStats]           = useState(EMPTY_STATS);

  // Load raster on mount
  useEffect(() => {
    loadThermalRaster().then((data) => {
      baselineRef.current = data;
      setGrid(data.slice()); // clone so grid is a separate array
    });
  }, []);

  // Recompute stats whenever grid or placements change
  useEffect(() => {
    if (!grid || !baselineRef.current) return;

    const raw = computeStats(baselineRef.current, grid);
    const totalCost = placements.reduce((sum, p) => sum + INTERVENTIONS[p.type].cost, 0);

    // Rough energy proxy: 1 °C avg reduction × 10 kWh per cell improved
    const energySavingsKwh = Math.round(raw.avgReduction * raw.cellsImproved * 10);

    // Equity score: fraction of grid cells that improved (0–100)
    const equityScore = parseFloat(raw.pctImproved);

    setStats({ ...raw, totalCost, energySavingsKwh, equityScore });
  }, [grid, placements]);

  const applyIntervention = useCallback((row, col, type) => {
    setGrid((prev) => {
      if (!prev) return prev;
      return diffuse(prev, row, col, type);
    });
    setPlacements((prev) => [...prev, { row, col, type }]);
  }, []);

  return { grid, placements, applyIntervention, stats, gridRows: GRID_ROWS, gridCols: GRID_COLS };
}
