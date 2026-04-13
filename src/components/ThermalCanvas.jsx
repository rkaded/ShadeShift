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
// Range tuned to the real Singapore LST data: ~31–49 °C
const STOPS = [
  { t: 31, r: 49,  g: 130, b: 189 },  // blue   (coolest)
  { t: 36, r: 116, g: 196, b: 118 },  // green
  { t: 40, r: 255, g: 255, b: 178 },  // yellow
  { t: 44, r: 253, g: 141, b: 60  },  // orange
  { t: 49, r: 189, g: 0,   b: 38  },  // red    (hottest)
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
    this._visible = true;
  },

  onAdd(map) {
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('moveend zoomend resize move', this._reset, this);
    this._reset();
  },

  onRemove(map) {
    map.getPanes().overlayPane.removeChild(this._canvas);
    map.off('moveend zoomend resize move', this._reset, this);
  },

  _reset() {
    const map     = this._map;
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

  setVisible(visible) {
    this._visible = visible;
    if (this._map) this._draw();
  },

  /**
   * Project a grid cell's geographic center to a canvas pixel using Leaflet's
   * coordinate transform. This means the overlay stays locked to the map at
   * every zoom level and pan position.
   */
  _latLngToCanvas(lat, lng) {
    const pt = this._map.latLngToContainerPoint(L.latLng(lat, lng));
    // containerPoint is relative to the map div; the canvas is offset by topLeft
    // (the layer pane transform), so we subtract that offset to get canvas coords.
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    return { x: pt.x - topLeft.x, y: pt.y - topLeft.y };
  },

  _draw() {
    const { _grid: grid, _placements: placements, _bounds: bounds } = this;
    if (!grid || !bounds) return;

    const canvas = this._canvas;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this._visible) return;

    const { north, south, east, west } = bounds;
    const latStep = (north - south) / GRID_ROWS;
    const lngStep = (east  - west)  / GRID_COLS;

    // Pre-compute pixel positions of every column/row edge so adjacent cells
    // share exact boundaries (no sub-pixel gaps between cells).
    const xEdge = new Float64Array(GRID_COLS + 1);
    const yEdge = new Float64Array(GRID_ROWS + 1);

    for (let c = 0; c <= GRID_COLS; c++) {
      const lng = west + c * lngStep;
      xEdge[c] = this._latLngToCanvas(south, lng).x;
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      const lat = north - r * latStep;
      yEdge[r] = this._latLngToCanvas(lat, west).y;
    }

    // Draw thermal cells via fillRect so each cell is geo-projected correctly
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const temp = grid[row * GRID_COLS + col];
        const [r, g, b] = tempToRgb(temp);

        const x = xEdge[col];
        const y = yEdge[row];
        const w = xEdge[col + 1] - x;
        const h = yEdge[row + 1] - y;

        ctx.fillStyle = `rgba(${r},${g},${b},0.63)`;
        ctx.fillRect(x, y, w, h);
      }
    }

    // Draw placement markers, geo-projected to their cell centers
    for (const { row, col, type } of placements) {
      const lat = north - (row + 0.5) * latStep;
      const lng = west  + (col + 0.5) * lngStep;
      const { x, y } = this._latLngToCanvas(lat, lng);

      const cellPx = Math.abs(xEdge[col + 1] - xEdge[col]);
      ctx.font = `${Math.max(10, cellPx * 1.2)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(INTERVENTIONS[type].emoji, x, y);
    }
  },
});

export default function ThermalCanvas({ grid, bounds, placements, visible }) {
  const map      = useMap();
  const layerRef = useRef(null);

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

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
    }
  }, [visible]);

  return null;
}
