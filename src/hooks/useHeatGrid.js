/**
 * useHeatGrid
 *
 * Central state hook for the simulation.
 * Owns: baseline grid, current grid, placements list, aggregate stats, and
 * the authoritative bounds read directly from the GeoTIFF.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadThermalRaster } from '../lib/loadThermalRaster';
import { applyIntervention as diffuse, computeStats } from '../lib/heatDiffusion';
import { INTERVENTIONS, GRID_ROWS, GRID_COLS, CBD_BOUNDS } from '../lib/constants';

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
  const baselineRef = useRef(null);
  const [grid, setGrid]         = useState(null);
  const [bounds, setBounds]     = useState(CBD_BOUNDS); // updated from GeoTIFF on load
  const [placements, setPlacements] = useState([]);
  const [stats, setStats]       = useState(EMPTY_STATS);

  useEffect(() => {
    loadThermalRaster().then(({ grid: data, bounds: tiffBounds }) => {
      baselineRef.current = data;
      setBounds(tiffBounds);
      setGrid(data.slice());
    });
  }, []);

  useEffect(() => {
    if (!grid || !baselineRef.current) return;
    const raw = computeStats(baselineRef.current, grid);
    const totalCost = placements.reduce((sum, p) => sum + INTERVENTIONS[p.type].cost, 0);
    const energySavingsKwh = Math.round(raw.avgReduction * raw.cellsImproved * 10);
    const equityScore = parseFloat(raw.pctImproved);
    setStats({ ...raw, totalCost, energySavingsKwh, equityScore });
  }, [grid, placements]);

  const applyIntervention = useCallback((row, col, type, lat, lng) => {
    setGrid((prev) => {
      if (!prev) return prev;
      return diffuse(prev, row, col, type);
    });
    setPlacements((prev) => [...prev, { row, col, type, lat, lng }]);
  }, []);

  const removeIntervention = useCallback((index) => {
    setPlacements((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (baselineRef.current) {
        let g = baselineRef.current.slice();
        for (const { row, col, type } of next) g = diffuse(g, row, col, type);
        setGrid(g);
      }
      return next;
    });
  }, []);

  const clearInterventions = useCallback(() => {
    if (!baselineRef.current) return;
    setGrid(baselineRef.current.slice());
    setPlacements([]);
  }, []);

  return { grid, bounds, placements, applyIntervention, removeIntervention, clearInterventions, stats };
}
