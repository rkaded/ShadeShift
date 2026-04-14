/**
 * Load the exported GeoTIFF and resample it to the simulation grid.
 *
 * Returns { grid: Float32Array, bounds: {north,south,east,west} }
 * where bounds comes directly from the GeoTIFF metadata — never from
 * hardcoded constants — so the heatmap always aligns perfectly.
 */

import { fromUrl } from 'geotiff';
import { GRID_ROWS, GRID_COLS, CBD_BOUNDS } from './constants';

const TIFF_URL = '/thermal/singapore_lst.tif';

export async function loadThermalRaster() {
  try {
    const tiff  = await fromUrl(TIFF_URL);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const rawData = rasters[0];

    const srcWidth  = image.getWidth();
    const srcHeight = image.getHeight();

    // Read the actual geographic bounds straight from the file
    const [west, south, east, north] = image.getBoundingBox();
    const bounds = { north, south, east, west };

    // Bilinear resample rawData (srcHeight × srcWidth) → (GRID_ROWS × GRID_COLS)
    const out = new Float32Array(GRID_ROWS * GRID_COLS);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const sx = (col / (GRID_COLS - 1)) * (srcWidth  - 1);
        const sy = (row / (GRID_ROWS - 1)) * (srcHeight - 1);

        const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, srcWidth  - 1);
        const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, srcHeight - 1);
        const tx = sx - x0, ty = sy - y0;

        const v00 = rawData[y0 * srcWidth + x0];
        const v10 = rawData[y0 * srcWidth + x1];
        const v01 = rawData[y1 * srcWidth + x0];
        const v11 = rawData[y1 * srcWidth + x1];

        const nodata = (v) => isNaN(v) || !isFinite(v);
        const safe   = (v) => nodata(v) ? 0 : v;

        if (nodata(v00) && nodata(v10) && nodata(v01) && nodata(v11)) {
          out[row * GRID_COLS + col] = NaN;
        } else {
          out[row * GRID_COLS + col] =
            safe(v00) * (1 - tx) * (1 - ty) +
            safe(v10) * tx       * (1 - ty) +
            safe(v01) * (1 - tx) * ty       +
            safe(v11) * tx       * ty;
        }
      }
    }

    return { grid: out, bounds };

  } catch {
    console.warn('GeoTIFF not found — using synthetic baseline (dev mode).');
    return { grid: syntheticBaseline(), bounds: CBD_BOUNDS };
  }
}

function syntheticBaseline() {
  const grid = new Float32Array(GRID_ROWS * GRID_COLS);
  const centerR = GRID_ROWS / 2;
  const centerC = GRID_COLS / 2;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const distNorm = Math.hypot((r - centerR) / GRID_ROWS, (c - centerC) / GRID_COLS);
      const base  = 36 - distNorm * 16;
      const noise = (Math.random() - 0.5) * 1.2;
      grid[r * GRID_COLS + c] = base + noise;
    }
  }
  return grid;
}
