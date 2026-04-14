/**
 * ThermalCanvas
 *
 * HeatLayer   – uses L.ImageOverlay so Leaflet owns all zoom/pan projection.
 *               The grid is baked into a data-URL once per grid change; Leaflet
 *               CSS-transforms the <img> during animation and reprojects on
 *               zoomend — zero per-frame JS work on our side.
 *               CSS blur + multiply blend gives the smooth meteoblue look.
 *
 * MarkerLayer – plain canvas overlay for emoji markers (separate from heat).
 *
 * Colour scale: blue → green → yellow → orange → red, 31–49 °C.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GRID_ROWS, GRID_COLS, INTERVENTIONS } from '../lib/constants';

// ── Colour ramp ────────────────────────────────────────────────────────────────
const STOPS = [
  { t: 20, r: 49,  g: 130, b: 189 },
  { t: 28, r: 116, g: 196, b: 118 },
  { t: 34, r: 255, g: 255, b: 178 },
  { t: 42, r: 253, g: 141, b: 60  },
  { t: 52, r: 189, g: 0,   b: 38  },
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

/**
 * Render the grid into a small offscreen canvas and return it as a PNG data URL.
 * The canvas is only GRID_COLS × GRID_ROWS px — Leaflet will stretch it.
 * We scale it up 4× before encoding so bilinear interpolation has more pixels
 * to work with, giving smoother gradients when Leaflet stretches the image.
 */
function gridToDataURL(grid) {
  const SCALE = 4;
  const W = GRID_COLS * SCALE;
  const H = GRID_ROWS * SCALE;

  const offscreen = document.createElement('canvas');
  offscreen.width  = W;
  offscreen.height = H;
  const ctx = offscreen.getContext('2d');
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const temp = grid[row * GRID_COLS + col];
      const isOcean = isNaN(temp);
      const [r, g, b] = isOcean ? [0, 0, 0] : tempToRgb(temp);
      const alpha = isOcean ? 0 : 200;

      // Fill the SCALE×SCALE block for this cell
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const px = col * SCALE + dx;
          const py = row * SCALE + dy;
          const idx = (py * W + px) * 4;
          d[idx]     = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = alpha;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return offscreen.toDataURL('image/png');
}

// ── HeatLayer — thin wrapper that manages an L.ImageOverlay ───────────────────

class HeatLayer {
  constructor() {
    this._overlay  = null;
    this._visible  = true;
    this._opacity  = 0.60;
    this._bounds   = null;
    this._map      = null;
  }

  addTo(map) {
    this._map = map;
    return this;
  }

  remove() {
    this._overlay?.remove();
    this._overlay = null;
    this._map = null;
  }

  setData(grid, bounds) {
    this._bounds = bounds;
    if (!grid || !this._map) return;

    const url = gridToDataURL(grid);
    const leafletBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    );

    if (this._overlay) {
      // Update existing overlay — avoids re-adding to the map
      this._overlay.setUrl(url);
      this._overlay.setBounds(leafletBounds);
    } else {
      this._overlay = L.imageOverlay(url, leafletBounds, {
        opacity: this._opacity,
        interactive: false,
        className: 'heat-overlay',
      }).addTo(this._map);

      // Style the <img> element directly after Leaflet creates it
      this._overlay.on('add', () => this._styleImg());
      this._styleImg();
    }

    this._applyVisibility();
  }

  _styleImg() {
    const img = this._overlay?.getElement();
    if (!img) return;
    img.style.filter         = 'blur(6px)';
    img.style.imageRendering = 'auto';
  }

  setVisible(visible) {
    this._visible = visible;
    this._applyVisibility();
  }

  setOpacity(opacity) {
    this._opacity = opacity;
    this._overlay?.setOpacity(opacity);
  }

  _applyVisibility() {
    const img = this._overlay?.getElement();
    if (!img) return;
    img.style.display = this._visible ? '' : 'none';
  }
}

// ── MarkerLayer — native L.Marker instances with DivIcon ─────────────────────
//
// Using L.Marker is the only correct solution for pixel-accurate placement.
// Leaflet positions each marker through its own projection pipeline in
// markerPane — no canvas offset math, no pane-transform fighting.

class MarkerLayer {
  constructor() {
    this._markers = [];
    this._map     = null;
  }

  addTo(map) {
    this._map = map;
    return this;
  }

  remove() {
    this._clearMarkers();
    this._map = null;
  }

  setData(placements, bounds) {
    this._clearMarkers();
    if (!placements?.length || !bounds || !this._map) return;

    const { north, south, east, west } = bounds;
    const latStep = (north - south) / GRID_ROWS;
    const lngStep = (east  - west)  / GRID_COLS;

    for (const { row, col, type, lat: storedLat, lng: storedLng } of placements) {
      // Use exact click coordinates if stored, otherwise fall back to cell centre
      const lat = storedLat ?? (north - (row + 0.5) * latStep);
      const lng = storedLng ?? (west  + (col + 0.5) * lngStep);

      const icon = L.divIcon({
        html: `<span class="marker-emoji">${INTERVENTIONS[type].emoji}</span>`,
        className: '',   // clear Leaflet's default white box class
        iconSize:   [32, 32],
        iconAnchor: [16, 16],  // centre of the icon sits on the lat/lng point
      });

      const marker = L.marker([lat, lng], { icon, interactive: false })
        .addTo(this._map);
      this._markers.push(marker);
    }
  }

  _clearMarkers() {
    for (const m of this._markers) m.remove();
    this._markers = [];
  }
}

// ── React component ────────────────────────────────────────────────────────────

export default function ThermalCanvas({ grid, bounds, placements, visible, opacity }) {
  const map       = useMap();
  const heatRef   = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const heat   = new HeatLayer();
    const marker = new MarkerLayer();
    heat.addTo(map);
    marker.addTo(map);
    heatRef.current   = heat;
    markerRef.current = marker;
    return () => { heat.remove(); marker.remove(); };
  }, [map]);

  useEffect(() => {
    heatRef.current?.setData(grid, bounds);
  }, [grid, bounds]);

  useEffect(() => {
    markerRef.current?.setData(placements, bounds);
  }, [placements, bounds]);

  useEffect(() => {
    heatRef.current?.setVisible(visible);
  }, [visible]);

  useEffect(() => {
    heatRef.current?.setOpacity(opacity);
  }, [opacity]);

  return null;
}
