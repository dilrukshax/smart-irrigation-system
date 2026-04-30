/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";
/* eslint-disable */

import * as React from "react";

const SRI_LANKA_CENTER = [7.8731, 80.7718] as const;
const INITIAL_ZOOM = 8;
const DETAIL_ZOOM = 15;

type MapLayer = "terrain" | "satellite";

type Props = {
  latitude: string;
  longitude: string;
  mapLayer: MapLayer;
  onMapLayerChange: (layer: MapLayer) => void;
  onLocationPick: (lat: number, lng: number) => void;
  disabled?: boolean;
};

const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const hasValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export function LocationPickerMap({
  latitude,
  longitude,
  mapLayer,
  onMapLayerChange,
  onLocationPick,
  disabled = false,
}: Props) {
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const terrainLayerRef = React.useRef<any>(null);
  const satelliteLayerRef = React.useRef<any>(null);
  const disabledRef = React.useRef(disabled);
  const onLocationPickRef = React.useRef(onLocationPick);

  const parsedLatitude = toNumber(latitude);
  const parsedLongitude = toNumber(longitude);

  React.useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  React.useEffect(() => {
    onLocationPickRef.current = onLocationPick;
  }, [onLocationPick]);

  React.useEffect(() => {
    let disposed = false;

    const initialize = async () => {
      if (
        typeof window === "undefined" ||
        !mapContainerRef.current ||
        mapRef.current
      ) {
        return;
      }

      const L = await import("leaflet");
      if (disposed || !mapContainerRef.current || mapRef.current) {
        return;
      }

      const hasCoordinates = hasValidCoordinates(
        parsedLatitude,
        parsedLongitude,
      );
      const initialCenter = hasCoordinates
        ? [parsedLatitude, parsedLongitude]
        : [SRI_LANKA_CENTER[0], SRI_LANKA_CENTER[1]];

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      });

      mapRef.current = map;
      map.setView(initialCenter, hasCoordinates ? DETAIL_ZOOM : INITIAL_ZOOM);

      terrainLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        },
      );
      satelliteLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri",
        },
      );

      if (mapLayer === "satellite") {
        satelliteLayerRef.current.addTo(map);
      } else {
        terrainLayerRef.current.addTo(map);
      }

      markerRef.current = L.circleMarker(initialCenter, {
        radius: 7,
        color: "#2E7D32",
        weight: 2,
        fillColor: "#2E7D32",
        fillOpacity: 0.85,
      }).addTo(map);

      map.on("click", (event: any) => {
        if (disabledRef.current) {
          return;
        }
        const { lat, lng } = event.latlng;
        markerRef.current?.setLatLng([lat, lng]);
        onLocationPickRef.current(lat, lng);
      });
    };

    void initialize();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      terrainLayerRef.current = null;
      satelliteLayerRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const terrainLayer = terrainLayerRef.current;
    const satelliteLayer = satelliteLayerRef.current;
    if (!map || !terrainLayer || !satelliteLayer) {
      return;
    }

    if (mapLayer === "satellite") {
      if (!map.hasLayer(satelliteLayer)) {
        satelliteLayer.addTo(map);
      }
      if (map.hasLayer(terrainLayer)) {
        map.removeLayer(terrainLayer);
      }
      return;
    }

    if (!map.hasLayer(terrainLayer)) {
      terrainLayer.addTo(map);
    }
    if (map.hasLayer(satelliteLayer)) {
      map.removeLayer(satelliteLayer);
    }
  }, [mapLayer]);

  React.useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      return;
    }

    if (!hasValidCoordinates(parsedLatitude, parsedLongitude)) {
      return;
    }

    const next = [parsedLatitude, parsedLongitude];
    marker.setLatLng(next);
    if (map.getZoom() < DETAIL_ZOOM) {
      map.setView(next, DETAIL_ZOOM);
    } else {
      map.panTo(next);
    }
  }, [parsedLatitude, parsedLongitude]);

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={
              mapLayer === "satellite"
                ? "btn btn-primary btn-sm"
                : "btn btn-ghost btn-sm"
            }
            onClick={() => onMapLayerChange("satellite")}
            disabled={disabled}
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
            onClick={() => onMapLayerChange("terrain")}
            disabled={disabled}
          >
            Terrain
          </button>
        </div>
        <span className="tiny muted">Tap map to pick precise coordinates</span>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: 300,
          borderRadius: 12,
          border: "1px solid var(--border)",
          overflow: "hidden",
          background: "#EAF1E8",
        }}
      />

      <div className="tiny muted" style={{ marginTop: 6 }}>
        Base layers from Esri World Imagery and OpenStreetMap.
      </div>
    </div>
  );
}
