/**
 * MapView
 *
 * Renders a Leaflet map locked to the CBD bounding box.
 * Translates click events from lat/lng → grid (row, col) and calls onCellClick.
 * Children are rendered inside the Leaflet map container (for overlays).
 */

import React, { useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GRID_ROWS, GRID_COLS } from '../lib/constants';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

function ClickHandler({ bounds, onCellClick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (
        lat < bounds.south || lat > bounds.north ||
        lng < bounds.west  || lng > bounds.east
      ) return;

      // Convert lat/lng to grid indices
      const row = Math.floor(
        ((bounds.north - lat) / (bounds.north - bounds.south)) * GRID_ROWS
      );
      const col = Math.floor(
        ((lng - bounds.west)  / (bounds.east  - bounds.west))  * GRID_COLS
      );

      onCellClick({ row: Math.min(row, GRID_ROWS - 1), col: Math.min(col, GRID_COLS - 1) });
    },
  });
  return null;
}

export default function MapView({ bounds, onCellClick, children }) {
  const center = [
    (bounds.north + bounds.south) / 2,
    (bounds.east  + bounds.west)  / 2,
  ];

  const maxBounds = [
    [bounds.south - 0.01, bounds.west - 0.01],
    [bounds.north + 0.01, bounds.east + 0.01],
  ];

  return (
    <MapContainer
      center={center}
      zoom={11}
      minZoom={10}
      maxZoom={18}
      maxBounds={maxBounds}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} subdomains="abcd" maxZoom={20} />
      <ClickHandler bounds={bounds} onCellClick={onCellClick} />
      {children}
    </MapContainer>
  );
}
