/**
 * Shared constants — single source of truth.
 * All lat/lng values are WGS-84.
 */

// Singapore CBD bounding box
export const CBD_BOUNDS = {
  north: 1.3048,
  south: 1.2728,
  east:  103.8648,
  west:  103.8198,
};

// Grid dimensions (cells). Each cell ≈ 30 m (Landsat resolution).
// Δlat ≈ 0.032°, Δlng ≈ 0.045° → roughly 119 × 150 cells at 0.00027°/cell
export const GRID_ROWS = 120;
export const GRID_COLS = 150;

/**
 * Intervention catalogue
 * cooling  : delta-°C applied to the clicked cell
 * radius   : diffusion radius in cells (Manhattan distance)
 * decay    : multiplier per cell of distance (0–1)
 * cost     : SGD
 */
export const INTERVENTIONS = {
  tree: {
    label: 'Tree',
    emoji: '🌳',
    cooling: 1.8,
    radius: 3,
    decay: 0.55,
    cost: 800,
    color: '#2d6a4f',
  },
  shade: {
    label: 'Shade Structure',
    emoji: '⛱️',
    cooling: 1.2,
    radius: 1,
    decay: 0.6,
    cost: 2000,
    color: '#457b9d',
  },
  greenRoof: {
    label: 'Green Roof',
    emoji: '🏢',
    cooling: 0.8,
    radius: 0,    // no diffusion — rooftop only
    decay: 0,
    cost: 15000,
    color: '#52b788',
  },
  coolPavement: {
    label: 'Cool Pavement',
    emoji: '🛤️',
    cooling: 0.5,
    radius: 1,
    decay: 0.5,
    cost: 50,     // per m² — applied per cell (~900 m²)
    cost_label: '$50/m²',
    color: '#a8dadc',
  },
  water: {
    label: 'Water Feature',
    emoji: '⛲',
    cooling: 2.1,
    radius: 4,
    decay: 0.6,
    cost: 50000,
    color: '#023e8a',
  },
};
