/**
 * ThermalCanvas
 *
 * Renders the thermal grid as a semi-transparent colour ramp over the Leaflet map
 * using a custom Leaflet Layer backed by an HTML Canvas element.
 *
 * Colour scale: blue (cool) → yellow → red (hot), range 24–38 °C.
 * Placed interventions are rendered as emoji markers on a second canvas pass.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GRID_ROWS, GRID_COLS, INTERVENTIONS } from '../lib/constants';

// Colour stops for the temperature ramp (°C → RGB)
const STOPS = [
  { t: 24, r: 49,  g: 130, b: 189 },  // blue
  { t: 28, r: 116, g: 196, b: 118 },  // green
  { t: 32, r: 255, g: 255, b: 178 },  // yellow
  { t: 35, r: 253, g: 141, b: 60  },  // orange
  { t: 38, r: 189, g: 0,   b: 38  },  // red
];

function tempToRgb(temp) {
  const clamped = Math.max(STOPS[0].t, Math.min(STOPS[STOPS.length - 1].t, temp));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].t && clamped <= STOPS[i + 1].t) {
      lo = STOPS[i]; hi = STOPS[i + 1]; break;
    }
  }
  const frac = (clamped - lo.t) / (hi.t - lo.t);
  return [
    Math.round(lo.r + frac * (hi.r - lo.r)),
    Math.round(lo.g + frac * (hi.g - lo.g)),
    Math.round(lo.b + frac * (hi.b - lo.b)),
  ];
}

// Build a custom Leaflet layer class once
const ThermalLayer = L.Layer.extend({
  initialize(options) {
    L.setOptions(this, options);
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
  },

  onAdd(map) {
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('moveend zoomend resize', this._reset, this);
    this._reset();
  },

  onRemove(map) {
    map.getPanes().overlayPane.removeChild(this._canvas);
    map.off('moveend zoomend resize', this._reset, this);
  },

  _reset() {
    const map   = this._map;
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    const size = map.getSize();
    this._canvas.width  = size.x;
    this._canvas.height = size.y;
    this._draw();
  },

  setData(grid, placements, bounds) {
    this._grid       = grid;
    this._placements = placements;
    this._bounds     = bounds;
    if (this._map) this._draw();
  },

  _draw() {
    const { _grid: grid, _placements: placements, _bounds: bounds } = this;
    if (!grid || !bounds) return;

    const map    = this._map;
    const canvas = this._canvas;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    // Draw thermal cells
    const cellW = W / GRID_COLS;
    const cellH = H / GRID_ROWS;
    const imgData = ctx.createImageData(W, H);
    const d = imgData.data;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const temp = grid[row * GRID_COLS + col];
        const [r, g, b] = tempToRgb(temp);

        const px = Math.floor(col * cellW);
        const py = Math.floor(row * cellH);
        const pw = Math.ceil(cellW);
        const ph = Math.ceil(cellH);

        for (let dy = 0; dy < ph; dy++) {
          for (let dx = 0; dx < pw; dx++) {
            const idx = ((py + dy) * W + (px + dx)) * 4;
            if (idx + 3 < d.length) {
              d[idx]     = r;
              d[idx + 1] = g;
              d[idx + 2] = b;
              d[idx + 3] = 160; // alpha ~63%
            }
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw placement markers
    ctx.font = `${Math.max(12, Math.min(cellW, cellH) * 1.2)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const { row, col, type } of placements) {
      const cx = (col + 0.5) * cellW;
      const cy = (row + 0.5) * cellH;
      ctx.fillText(INTERVENTIONS[type].emoji, cx, cy);
    }
  },
});

export default function ThermalCanvas({ grid, bounds, placements }) {
  const map       = useMap();
  const layerRef  = useRef(null);

  useEffect(() => {
    const layer = new ThermalLayer();
    layer.addTo(map);
    layerRef.current = layer;
    return () => layer.remove();
  }, [map]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setData(grid, placements, bounds);
    }
  }, [grid, placements, bounds]);

  return null; // rendering happens inside the Leaflet layer
}
