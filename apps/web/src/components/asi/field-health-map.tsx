/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";
/* eslint-disable */

import * as React from "react";

export type ObservationKind =
  | "disease"
  | "pest"
  | "water_stress"
  | "healthy"
  | "note";

export type ObservationMarker = {
  id: string;
  lat: number;
  lon: number;
  kind: ObservationKind;
  title: string;
  severity?: string | null;
};

export type DeviceMarker = {
  id: string;
  lat: number;
  lon: number;
  online: boolean;
};

type Props = {
  center: { lat: number; lon: number };
  zonesGeoJson?: any | null;
  deviceMarkers?: DeviceMarker[];
  observations?: ObservationMarker[];
  addMode?: boolean;
  onAdd?: (lat: number, lon: number) => void;
  onMarkerClick?: (id: string) => void;
  mapLayer?: "terrain" | "satellite";
  onMapLayerChange?: (layer: "terrain" | "satellite") => void;
  height?: number;
  focusedObservationId?: string | null;
  showLegend?: boolean;
  showCenterMarker?: boolean;
  hint?: React.ReactNode;
};

const KIND_COLORS: Record<ObservationKind, string> = {
  disease: "#DC2626",
  pest: "#EA580C",
  water_stress: "#2563EB",
  healthy: "#16A34A",
  note: "#6B7280",
};

const KIND_LABELS: Record<ObservationKind, string> = {
  disease: "Disease",
  pest: "Pest",
  water_stress: "Water stress",
  healthy: "Healthy",
  note: "Note",
};

const FALLBACK_CENTER = [7.8731, 80.7718] as const;
const DETAIL_ZOOM = 16;
const FALLBACK_ZOOM = 8;

const isValid = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  lat >= -90 &&
  lat <= 90 &&
  lon >= -180 &&
  lon <= 180;

function divIconHtml(color: string, glyph: string): string {
  return `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 50% 50% 50% 0;
      background: ${color};
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 13px;
      font-weight: 700;
      border: 2px solid white;
    ">
      <span style="transform: rotate(45deg);">${glyph}</span>
    </div>
  `;
}

function deviceIconHtml(online: boolean): string {
  const color = online ? "#2E7D32" : "#9CA3AF";
  return `
    <div style="
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>
  `;
}

function kindGlyph(kind: ObservationKind): string {
  switch (kind) {
    case "disease":
      return "!";
    case "pest":
      return "P";
    case "water_stress":
      return "~";
    case "healthy":
      return "✓";
    default:
      return "•";
  }
}

export function FieldHealthMap({
  center,
  zonesGeoJson,
  deviceMarkers = [],
  observations = [],
  addMode = false,
  onAdd,
  onMarkerClick,
  mapLayer = "satellite",
  onMapLayerChange,
  height = 380,
  focusedObservationId = null,
  showLegend = true,
  showCenterMarker = true,
  hint,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const centerMarkerRef = React.useRef<any>(null);
  const terrainLayerRef = React.useRef<any>(null);
  const satelliteLayerRef = React.useRef<any>(null);
  const zonesLayerRef = React.useRef<any>(null);
  const observationsLayerRef = React.useRef<any>(null);
  const devicesLayerRef = React.useRef<any>(null);
  const observationMarkerById = React.useRef<Record<string, any>>({});
  const fittedRef = React.useRef(false);

  const addModeRef = React.useRef(addMode);
  const onAddRef = React.useRef(onAdd);
  const onMarkerClickRef = React.useRef(onMarkerClick);

  React.useEffect(() => {
    addModeRef.current = addMode;
    if (mapRef.current) {
      const el = containerRef.current;
      if (el) el.style.cursor = addMode ? "crosshair" : "";
    }
  }, [addMode]);
  React.useEffect(() => {
    onAddRef.current = onAdd;
  }, [onAdd]);
  React.useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // ---- Initialise map once ----
  React.useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) return;

      const hasStartCoordinates = isValid(center.lat, center.lon);
      const startLat = hasStartCoordinates ? center.lat : FALLBACK_CENTER[0];
      const startLon = hasStartCoordinates ? center.lon : FALLBACK_CENTER[1];
      const startZoom = hasStartCoordinates ? DETAIL_ZOOM : FALLBACK_ZOOM;

      const map = L.map(containerRef.current, { zoomControl: true });
      mapRef.current = map;
      map.setView([startLat, startLon], startZoom);

      terrainLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
      );
      satelliteLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri" },
      );

      if (mapLayer === "terrain") {
        terrainLayerRef.current.addTo(map);
      } else {
        satelliteLayerRef.current.addTo(map);
      }

      observationsLayerRef.current = L.layerGroup().addTo(map);
      devicesLayerRef.current = L.layerGroup().addTo(map);

      // field centre marker (small green circle so the user always sees the field anchor)
      if (showCenterMarker && hasStartCoordinates) {
        centerMarkerRef.current = L.circleMarker([startLat, startLon], {
          radius: 6,
          color: "#2E7D32",
          weight: 2,
          fillColor: "#2E7D32",
          fillOpacity: 0.85,
        }).addTo(map);
      }

      map.on("click", (event: any) => {
        if (!addModeRef.current || !onAddRef.current) return;
        const { lat, lng } = event.latlng;
        onAddRef.current(lat, lng);
      });
    };

    void init();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      centerMarkerRef.current = null;
      terrainLayerRef.current = null;
      satelliteLayerRef.current = null;
      zonesLayerRef.current = null;
      observationsLayerRef.current = null;
      devicesLayerRef.current = null;
      observationMarkerById.current = {};
      fittedRef.current = false;
    };
  }, []);

  // ---- Layer toggle ----
  React.useEffect(() => {
    const map = mapRef.current;
    const terrain = terrainLayerRef.current;
    const satellite = satelliteLayerRef.current;
    if (!map || !terrain || !satellite) return;

    if (mapLayer === "terrain") {
      if (!map.hasLayer(terrain)) terrain.addTo(map);
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
    } else {
      if (!map.hasLayer(satellite)) satellite.addTo(map);
      if (map.hasLayer(terrain)) map.removeLayer(terrain);
    }
  }, [mapLayer]);

  // ---- Re-center when field center changes ----
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!showCenterMarker) {
      centerMarkerRef.current?.remove();
      centerMarkerRef.current = null;
      return;
    }
    if (!isValid(center.lat, center.lon)) return;
    if (map.getZoom() < DETAIL_ZOOM) {
      map.setView([center.lat, center.lon], DETAIL_ZOOM);
    } else {
      map.panTo([center.lat, center.lon]);
    }

    let cancelled = false;
    const syncMarker = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLatLng([center.lat, center.lon]);
        return;
      }
      centerMarkerRef.current = L.circleMarker([center.lat, center.lon], {
        radius: 6,
        color: "#2E7D32",
        weight: 2,
        fillColor: "#2E7D32",
        fillOpacity: 0.85,
      }).addTo(mapRef.current);
    };
    void syncMarker();
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lon, showCenterMarker]);

  // ---- Render zones overlay ----
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const apply = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      if (zonesLayerRef.current) {
        zonesLayerRef.current.remove();
        zonesLayerRef.current = null;
      }

      if (!zonesGeoJson || !zonesGeoJson.features?.length) return;

      zonesLayerRef.current = L.geoJSON(zonesGeoJson, {
        style: (feature: any) => ({
          fillColor: feature?.properties?.color || "#9CA3AF",
          color: feature?.properties?.color || "#9CA3AF",
          weight: 1,
          fillOpacity: 0.35,
        }),
        onEachFeature: (feature: any, layer: any) => {
          const p = feature?.properties || {};
          const ndvi = typeof p.ndvi === "number" ? p.ndvi.toFixed(2) : "—";
          const ndwi = typeof p.ndwi === "number" ? p.ndwi.toFixed(2) : "—";
          const area = typeof p.area_hectares === "number" ? p.area_hectares.toFixed(2) : "—";
          layer.bindPopup(
            `<div style="font-family: sans-serif; font-size: 12.5px;">
              <div style="font-weight: 700; margin-bottom: 4px;">${p.name || p.zone_id || "Zone"}</div>
              <div style="color: #555;">Status: <b>${p.health_status || "—"}</b></div>
              <div style="color: #555;">NDVI: ${ndvi} · NDWI: ${ndwi}</div>
              <div style="color: #555;">Area: ${area} ha</div>
              ${p.recommendation ? `<div style="margin-top: 4px;">${p.recommendation}</div>` : ""}
            </div>`,
          );
        },
      }).addTo(mapRef.current);

      // Auto-fit once if we don't have observations yet
      if (!fittedRef.current && (!observations || observations.length === 0)) {
        try {
          const bounds = zonesLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
            fittedRef.current = true;
          }
        } catch {
          // ignore; some FeatureCollections may not produce valid bounds
        }
      }
    };

    void apply();
    return () => {
      cancelled = true;
    };
  }, [zonesGeoJson, observations]);

  // ---- Render observation markers ----
  React.useEffect(() => {
    const map = mapRef.current;
    const layer = observationsLayerRef.current;
    if (!map || !layer) return;
    let cancelled = false;

    const apply = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      layer.clearLayers();
      observationMarkerById.current = {};

      observations.forEach((obs) => {
        if (!isValid(obs.lat, obs.lon)) return;
        const color = KIND_COLORS[obs.kind] || KIND_COLORS.note;
        const icon = L.divIcon({
          html: divIconHtml(color, kindGlyph(obs.kind)),
          className: "field-observation-pin",
          iconSize: [26, 26],
          iconAnchor: [13, 24],
          popupAnchor: [0, -22],
        });
        const marker = L.marker([obs.lat, obs.lon], { icon }).addTo(layer);
        marker.bindPopup(
          `<div style="font-family: sans-serif; font-size: 12.5px; min-width: 160px;">
            <div style="font-weight: 700;">${obs.title}</div>
            <div style="color: #555; margin-top: 2px;">
              <span style="color: ${color}; font-weight: 600;">${KIND_LABELS[obs.kind] || obs.kind}</span>
              ${obs.severity ? ` · ${obs.severity}` : ""}
            </div>
          </div>`,
        );
        marker.on("click", () => {
          onMarkerClickRef.current?.(obs.id);
        });
        observationMarkerById.current[obs.id] = marker;
      });
    };

    void apply();
    return () => {
      cancelled = true;
    };
  }, [observations]);

  // ---- Render device markers ----
  React.useEffect(() => {
    const map = mapRef.current;
    const layer = devicesLayerRef.current;
    if (!map || !layer) return;
    let cancelled = false;

    const apply = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;

      layer.clearLayers();
      deviceMarkers.forEach((d) => {
        if (!isValid(d.lat, d.lon)) return;
        const icon = L.divIcon({
          html: deviceIconHtml(d.online),
          className: "field-device-pin",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -8],
        });
        const marker = L.marker([d.lat, d.lon], { icon }).addTo(layer);
        marker.bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px;">
            <div style="font-weight: 700;">${d.id}</div>
            <div style="color: ${d.online ? "#2E7D32" : "#9CA3AF"};">
              ${d.online ? "Online" : "Offline"}
            </div>
          </div>`,
        );
      });
    };

    void apply();
    return () => {
      cancelled = true;
    };
  }, [deviceMarkers]);

  // ---- Open popup for focused observation (sync from list click) ----
  React.useEffect(() => {
    if (!focusedObservationId) return;
    const marker = observationMarkerById.current[focusedObservationId];
    const map = mapRef.current;
    if (!marker || !map) return;
    map.panTo(marker.getLatLng());
    if (map.getZoom() < DETAIL_ZOOM) {
      map.setZoom(DETAIL_ZOOM);
    }
    marker.openPopup();
  }, [focusedObservationId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={
              mapLayer === "satellite"
                ? "btn btn-primary btn-sm"
                : "btn btn-ghost btn-sm"
            }
            onClick={() => onMapLayerChange?.("satellite")}
          >
            Satellite
          </button>
          <button
            type="button"
            className={
              mapLayer === "terrain"
                ? "btn btn-primary btn-sm"
                : "btn btn-ghost btn-sm"
            }
            onClick={() => onMapLayerChange?.("terrain")}
          >
            Terrain
          </button>
        </div>
        <div className="tiny muted">
          {hint ?? (addMode ? "Click anywhere on the map to drop a pin" : "Tap a pin to inspect")}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height,
          borderRadius: 12,
          border: "1px solid var(--border)",
          overflow: "hidden",
          background: "#EAF1E8",
          cursor: addMode ? "crosshair" : "",
        }}
      />

      {showLegend && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 11.5,
            color: "var(--muted)",
            alignItems: "center",
          }}
        >
          {(Object.keys(KIND_COLORS) as ObservationKind[]).map((k) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <i
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: KIND_COLORS[k],
                }}
              />
              {KIND_LABELS[k]}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <i
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#2E7D32",
              }}
            />
            Device online
          </span>
        </div>
      )}
    </div>
  );
}
