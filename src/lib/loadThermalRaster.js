/**
 * Load the exported GeoTIFF and resample it to the simulation grid.
 *
 * The GeoTIFF lives at /public/thermal/singapore_cbd_lst.tif.
 * We use the `geotiff` npm package to parse it in the browser, then
 * bilinearly resample to GRID_ROWS × GRID_COLS.
 *
 * Returns a Float32Array of length GRID_ROWS * GRID_COLS (°C values).
 * Falls back to a synthetic baseline if the file is absent (dev mode).
 */

import { fromUrl } from 'geotiff';
import { GRID_ROWS, GRID_COLS, CBD_BOUNDS } from './constants';

const TIFF_URL = '/thermal/singapore_cbd_lst.tif';

export async function loadThermalRaster() {
  try {
    const tiff = await fromUrl(TIFF_URL);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const rawData = rasters[0];

    const srcWidth  = image.getWidth();
    const srcHeight = image.getHeight();

    // Bilinear resample rawData (srcHeight × srcWidth) → (GRID_ROWS × GRID_COLS)
    const out = new Float32Array(GRID_ROWS * GRID_COLS);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // Normalised position in source raster
        const sx = (col / (GRID_COLS - 1)) * (srcWidth  - 1);
        const sy = (row / (GRID_ROWS - 1)) * (srcHeight - 1);

        const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, srcWidth  - 1);
        const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, srcHeight - 1);
        const tx = sx - x0, ty = sy - y0;

        const v00 = rawData[y0 * srcWidth + x0];
        const v10 = rawData[y0 * srcWidth + x1];
        const v01 = rawData[y1 * srcWidth + x0];
        const v11 = rawData[y1 * srcWidth + x1];

        // Replace NaN (nodata) pixels with a neutral fallback so they don't
        // propagate through the bilinear interpolation.
        const safe = (v) => (isNaN(v) || !isFinite(v)) ? 35 : v;
        out[row * GRID_COLS + col] =
          safe(v00) * (1 - tx) * (1 - ty) +
          safe(v10) * tx       * (1 - ty) +
          safe(v01) * (1 - tx) * ty       +
          safe(v11) * tx       * ty;
      }
    }

    return out;
  } catch {
    console.warn('GeoTIFF not found — using synthetic thermal baseline (dev mode).');
    return syntheticBaseline();
  }
}

/**
 * Procedural baseline for development (no GeoTIFF required).
 * Mimics Singapore CBD: hotter core, slightly cooler edges, random hotspots.
 */
function syntheticBaseline() {
  const grid = new Float32Array(GRID_ROWS * GRID_COLS);
  const centerR = GRID_ROWS / 2;
  const centerC = GRID_COLS / 2;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const distNorm = Math.hypot((r - centerR) / GRID_ROWS, (c - centerC) / GRID_COLS);
      // Base: 28 °C at edge, 36 °C at core (urban heat island gradient)
      const base = 36 - distNorm * 16;
      // Add slight noise
      const noise = (Math.random() - 0.5) * 1.2;
      grid[r * GRID_COLS + c] = base + noise;
    }
  }
  return grid;
}
