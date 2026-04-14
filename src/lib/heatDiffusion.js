/**
 * Heat diffusion model
 *
 * When an intervention is placed at (row, col):
 *   1. The cell itself is cooled by `cooling` °C.
 *   2. Each neighbour within `radius` cells (Chebyshev distance) is cooled by
 *      cooling × decay^distance  (exponential radial decay).
 *
 * The grid is a flat Float32Array of length ROWS × COLS.
 * Returns a *new* array so React state updates remain pure.
 */

import { GRID_ROWS, GRID_COLS, INTERVENTIONS } from './constants';

/**
 * Apply a single intervention to the grid.
 * @param {Float32Array} grid  Current temperature grid (°C)
 * @param {number}       row
 * @param {number}       col
 * @param {string}       type  Key of INTERVENTIONS
 * @returns {Float32Array}     New grid with cooling applied
 */
export function applyIntervention(grid, row, col, type) {
  const { cooling, radius, decay } = INTERVENTIONS[type];
  const next = grid.slice(); // shallow copy — keeps the update pure

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;

      if (isNaN(next[r * GRID_COLS + c])) continue; // skip ocean/nodata cells
      const dist = Math.max(Math.abs(dr), Math.abs(dc)); // Chebyshev distance
      const delta = cooling * Math.pow(decay, dist);
      next[r * GRID_COLS + c] -= delta;
    }
  }

  return next;
}

/**
 * Compute aggregate statistics from the current vs. baseline grids.
 * @param {Float32Array} baseline  Original grid before any interventions
 * @param {Float32Array} current   Grid after interventions
 * @returns {{ avgReduction: number, maxReduction: number, cellsImproved: number }}
 */
export function computeStats(baseline, current) {
  let sumReduction = 0;
  let maxReduction = 0;
  let cellsImproved = 0;
  const total = GRID_ROWS * GRID_COLS;

  for (let i = 0; i < total; i++) {
    const delta = baseline[i] - current[i]; // positive = cooler
    if (delta > 0.01) {
      sumReduction += delta;
      cellsImproved++;
      if (delta > maxReduction) maxReduction = delta;
    }
  }

  return {
    avgReduction: cellsImproved > 0 ? sumReduction / cellsImproved : 0,
    maxReduction,
    cellsImproved,
    pctImproved: ((cellsImproved / total) * 100).toFixed(1),
  };
}
