/**
 * ShadeShift — Google Earth Engine Script
 * Export Landsat 8 Band 10 surface temperature for all of Singapore
 *
 * Instructions:
 *   1. Open code.earthengine.google.com
 *   2. Paste this script into a new file
 *   3. Click Run — the export task will appear in the Tasks tab
 *   4. Click RUN next to the task to start the export to Google Drive
 *   5. Download the resulting GeoTIFF and place it at:
 *      public/thermal/singapore_lst.tif
 *
 * Output: single-band GeoTIFF, values in °C, EPSG:4326, ~100m resolution
 * Approximate output size: ~1100 × 1350 px, ~5–10 MB
 */

// ── 1. AOI: Singapore mainland + Sentosa ──────────────────────────────────────
//
// FAO GAUL 2015 level-1 has per-province polygons for Singapore at reasonable
// resolution. We take all features for Singapore, explode to individual polygons,
// keep only those >= 4 km² (mainland + Sentosa), and dissolve.

var SG_BBOX = ee.Geometry.Rectangle(
  [103.6050, 1.1496, 104.0120, 1.4784],
  'EPSG:4326', false
);

var gaul = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Singapore'));

// Flatten any multipolygons into individual polygon features
var sgPolygons = gaul.map(function(f) {
  var geom = f.geometry();
  // Force each feature to be a simple polygon by iterating coordinates
  return ee.FeatureCollection(
    geom.geometries().map(function(g) {
      return ee.Feature(ee.Geometry(g));
    })
  );
}).flatten();

// Keep mainland (~720 km²) and Sentosa (~5 km²), drop tiny islets
var AOI = sgPolygons
  .map(function(f) {
    return f.set('area_km2', f.geometry().area(1).divide(1e6));
  })
  .filter(ee.Filter.gte('area_km2', 4))
  .geometry()
  .dissolve(1);

// ── 2. Landsat 8 Collection 2 Level-2 (SR + ST) ───────────────────────────────
//    Band ST_B10 = Surface Temperature in Kelvin (scale 0.00341802 + offset 149)
var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(AOI)
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
  .clip(AOI);

// ── 5. Quick visual check ──────────────────────────────────────────────────────
var vizParams = {
  bands: ['LST_Celsius'],
  min: 24,
  max: 38,
  palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']
};

Map.centerObject(AOI, 11);
Map.addLayer(AOI, {color: 'white', fillColor: '00000000'}, 'AOI outline');
Map.addLayer(mean_lst, vizParams, 'Mean LST (°C) 2023-2024');

// Print stats for sanity-check
var stats = mean_lst.reduceRegion({
  reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
  geometry: AOI,
  scale: 100,
  maxPixels: 1e9
});
print('LST stats (°C):', stats);

// ── 6. Export to Google Drive ──────────────────────────────────────────────────
Export.image.toDrive({
  image: mean_lst,
  description: 'ShadeShift_Singapore_LST_2023_2024',
  folder: 'ShadeShift',           // Drive folder (created if absent)
  fileNamePrefix: 'singapore_lst',
  region: AOI,
  scale: 100,                     // 100m — full island at ~1100×1350px (~5-10MB)
  crs: 'EPSG:4326',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true          // COG — faster tile reads in the browser
  }
});

print('Export task queued. Go to Tasks tab → click RUN.');
