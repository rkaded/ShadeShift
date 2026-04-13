/**
 * ShadeShift — Google Earth Engine Script
 * Export Landsat 8 Band 10 surface temperature for Singapore CBD
 *
 * Instructions:
 *   1. Open code.earthengine.google.com
 *   2. Paste this script into a new file
 *   3. Click Run — the export task will appear in the Tasks tab
 *   4. Click RUN next to the task to start the export to Google Drive
 *   5. Download the resulting GeoTIFF and place it at:
 *      public/thermal/singapore_cbd_lst.tif
 *
 * Output: single-band GeoTIFF, values in °C, EPSG:4326, ~30m resolution
 */

// ── 1. AOI: Singapore CBD bounding box ────────────────────────────────────────
var CBD_BOUNDS = ee.Geometry.Rectangle(
  [103.8198, 1.2728, 103.8648, 1.3048],  // [west, south, east, north]
  'EPSG:4326',
  false
);

// ── 2. Landsat 8 Collection 2 Level-2 (SR + ST) ───────────────────────────────
//    Band ST_B10 = Surface Temperature in Kelvin (scale 0.00341802 + offset 149)
var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(CBD_BOUNDS)
  .filterDate('2023-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 15));   // keep only clear scenes

print('Scenes after filtering:', L8.size());

// ── 3. Convert DN → Kelvin → Celsius ──────────────────────────────────────────
function tocelsius(image) {
  // Collection 2 L2 scale/offset per USGS handbook
  var st_kelvin = image.select('ST_B10')
    .multiply(0.00341802)
    .add(149.0);

  var st_celsius = st_kelvin.subtract(273.15).rename('LST_Celsius');

  return image.addBands(st_celsius)
    .copyProperties(image, image.propertyNames());
}

var L8_celsius = L8.map(tocelsius);

// ── 4. Reduce to mean composite ────────────────────────────────────────────────
var mean_lst = L8_celsius
  .select('LST_Celsius')
  .mean()
  .clip(CBD_BOUNDS);

// ── 5. Quick visual check ──────────────────────────────────────────────────────
var vizParams = {
  bands: ['LST_Celsius'],
  min: 24,
  max: 38,
  palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']
};

Map.centerObject(CBD_BOUNDS, 14);
Map.addLayer(mean_lst, vizParams, 'Mean LST (°C) 2023-2024');

// Print stats for sanity-check
var stats = mean_lst.reduceRegion({
  reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
  geometry: CBD_BOUNDS,
  scale: 30,
  maxPixels: 1e9
});
print('LST stats (°C):', stats);

// ── 6. Export to Google Drive ──────────────────────────────────────────────────
Export.image.toDrive({
  image: mean_lst,
  description: 'ShadeShift_Singapore_CBD_LST_2023_2024',
  folder: 'ShadeShift',           // Drive folder (created if absent)
  fileNamePrefix: 'singapore_cbd_lst',
  region: CBD_BOUNDS,
  scale: 30,                      // Landsat native resolution (metres)
  crs: 'EPSG:4326',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true          // COG — faster tile reads in the browser
  }
});

print('Export task queued. Go to Tasks tab → click RUN.');
