/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";
/* eslint-disable */

import * as React from "react";
import {
  Icon,
  LogoMark,
  Logo,
  AppBar,
  Sidebar,
  Chip,
  Progress,
  Gauge,
  Sparkline,
  LineChart,
  BarChart,
  ForecastChart,
  Donut,
  SchemeMap,
  Frame,
} from "@/components/asi/ui";
import {
  farmerNav,
  officerNav,
  authorityNav,
  irrigationNav,
  optNav,
} from "@/components/asi/nav";
import { PublicTop } from "@/components/asi/public-top";
import { apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LocationPickerMap } from "@/components/asi/location-picker-map";

const SCHEME_OPTIONS = [
  {
    value: "H-04",
    label: "Mahaweli H-04 (Thalawa)",
    center: [8.3346, 80.5054],
  },
  {
    value: "H-05",
    label: "Mahaweli H-05 (Galnewa)",
    center: [8.1996, 80.3777],
  },
  {
    value: "H-07",
    label: "Mahaweli H-07 (Nochchiyagama)",
    center: [8.2671, 80.2209],
  },
];
const DEFAULT_SCHEME_ID = "H-04";

const getSchemeOption = (schemeId: string) =>
  SCHEME_OPTIONS.find((scheme) => scheme.value === schemeId) ||
  SCHEME_OPTIONS.find((scheme) => scheme.value === DEFAULT_SCHEME_ID) ||
  SCHEME_OPTIONS[0];

const getGeolocationErrorMessage = (error?: GeolocationPositionError) => {
  if (
    typeof window !== "undefined" &&
    !window.isSecureContext &&
    !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  ) {
    return "Current location needs HTTPS or localhost. The map is centered on your scheme zone, so tap your field location to continue.";
  }

  if (!error) {
    return "Unable to fetch current location. The map is centered on your scheme zone, so tap your field location to continue.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Enable browser location access, or tap your field location on the map.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location lookup timed out. The map is still ready, so tap your field location to continue.";
  }

  return "Unable to fetch current location. The map is centered on your scheme zone, so tap your field location to continue.";
};

const FarmerOnboarding = () => {
  const { user } = useAuth();

  // Field details state
  const [fieldName, setFieldName] = React.useState("");
  const [areaHa, setAreaHa] = React.useState("");
  const [soilType, setSoilType] = React.useState("");
  const [schemeId, setSchemeId] = React.useState(DEFAULT_SCHEME_ID);
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [mapLayer, setMapLayer] = React.useState<"satellite" | "terrain">(
    "satellite",
  );
  const [locationScreenshot, setLocationScreenshot] =
    React.useState<File | null>(null);
  const [locationScreenshotPreview, setLocationScreenshotPreview] =
    React.useState<string | null>(null);
  const [locating, setLocating] = React.useState(false);

  // Shared state
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: string;
    text: string;
  } | null>(null);
  const [createdFieldId, setCreatedFieldId] = React.useState<string | null>(
    null,
  );

  const parsedArea = Number.parseFloat(areaHa);
  const isValidArea = Number.isFinite(parsedArea) && parsedArea > 0;
  const canCreateField = Boolean(fieldName.trim()) && isValidArea;
  const selectedScheme = getSchemeOption(schemeId);

  const handleSchemeChange = (nextSchemeId: string) => {
    const resolvedSchemeId = nextSchemeId || DEFAULT_SCHEME_ID;
    setSchemeId(resolvedSchemeId);
    const selected = SCHEME_OPTIONS.find(
      (scheme) => scheme.value === resolvedSchemeId,
    );
    if (!selected) {
      return;
    }
    if (!latitude && !longitude) {
      setLatitude(selected.center[0].toFixed(6));
      setLongitude(selected.center[1].toFixed(6));
    }
  };

  React.useEffect(() => {
    const assignedSchemeId = user?.scheme_ids?.[0];
    if (!assignedSchemeId || schemeId !== DEFAULT_SCHEME_ID) {
      return;
    }
    handleSchemeChange(assignedSchemeId);
  }, [user?.scheme_ids, schemeId]);

  const handleMapLocationPick = React.useCallback(
    (lat: number, lng: number) => {
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    },
    [],
  );

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage({
        type: "error",
        text: "Geolocation is not available on this browser.",
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (error) => {
        setMessage({
          type: "error",
          text: getGeolocationErrorMessage(error),
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 },
    );
  };

  const handleLocationScreenshotChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage({
        type: "error",
        text: "Please upload an image file (PNG, JPG, WEBP).",
      });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "Screenshot must be smaller than 6MB.",
      });
      return;
    }
    if (locationScreenshotPreview) {
      URL.revokeObjectURL(locationScreenshotPreview);
    }
    setLocationScreenshot(file);
    setLocationScreenshotPreview(URL.createObjectURL(file));
  };

  const clearLocationScreenshot = () => {
    if (locationScreenshotPreview) {
      URL.revokeObjectURL(locationScreenshotPreview);
    }
    setLocationScreenshot(null);
    setLocationScreenshotPreview(null);
  };

  React.useEffect(() => {
    return () => {
      if (locationScreenshotPreview) {
        URL.revokeObjectURL(locationScreenshotPreview);
      }
    };
  }, [locationScreenshotPreview]);

  const handleFieldCreate = async () => {
    if (!fieldName.trim()) {
      setMessage({ type: "error", text: "Field name is required" });
      return;
    }
    if (!schemeId) {
      handleSchemeChange(DEFAULT_SCHEME_ID);
    }
    if (!canCreateField) {
      setMessage({
        type: "error",
        text: "Please enter a field name and a valid area.",
      });
      return;
    }
    if (!isValidArea) {
      setMessage({ type: "error", text: "Please enter a valid field area." });
      return;
    }

    const parsedLatitude = Number.parseFloat(latitude);
    const parsedLongitude = Number.parseFloat(longitude);

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiPost<any>("/farm/fields", {
        field_name: fieldName,
        soil_type: soilType || null,
        area_hectares: parsedArea,
        scheme_id: schemeId || DEFAULT_SCHEME_ID,
        latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : null,
        longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : null,
        location_name: locationName.trim() || null,
      });
      setCreatedFieldId(res.field_id || res.id);
      setMessage({ type: "success", text: "Field created successfully!" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Failed to create field",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFieldName("");
    setAreaHa("");
    setSoilType("");
    setSchemeId(user?.scheme_ids?.[0] || DEFAULT_SCHEME_ID);
    setLatitude("");
    setLongitude("");
    setLocationName("");
    clearLocationScreenshot();
    setCreatedFieldId(null);
    setMessage(null);
  };

  const displayName = user?.username || "Farmer";

  return (
    <div
      className="asi-root"
      style={{
        width: "100%",
        minHeight: 820,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar breadcrumb={["Onboarding"]} user={displayName} role="Setup" />
      <div style={{ padding: "28px 56px", flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {message && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: message.type === "success" ? "#DCFCE7" : "#FEE2E2",
                border: `1px solid ${message.type === "success" ? "#86EFAC" : "#FECACA"}`,
                borderRadius: 8,
                color: message.type === "success" ? "#166534" : "#DC2626",
                fontSize: 13,
              }}
            >
              {message.text}
            </div>
          )}

          {createdFieldId ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <Icon name="check" size={60} color="var(--primary)" />
              <h2 style={{ fontSize: 24, marginTop: 16 }}>
                Field created, {displayName}
              </h2>
              <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
                This field is now registered to this farmer account. You can
                view it from the field workspace or add another field.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 24,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={`/farmer/field/${createdFieldId}`}
                  className="btn btn-primary"
                >
                  View field →
                </a>
                <a href="/farmer/fields" className="btn btn-ghost">
                  My fields
                </a>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetForm}
                >
                  Add another field
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 28 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  letterSpacing: "0.08em",
                }}
              >
                NEW FIELD
              </div>
              <h2 style={{ fontSize: 22, marginTop: 4 }}>
                Enter your field details
              </h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Tell us about your farmland
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 14,
                  marginTop: 22,
                }}
              >
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Field name</label>
                  <input
                    className="input"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="e.g. Home paddy"
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label>Scheme zone</label>
                  <select
                    className="select"
                    value={schemeId}
                    onChange={(e) => handleSchemeChange(e.target.value)}
                    disabled={submitting}
                  >
                    {SCHEME_OPTIONS.map((scheme) => (
                      <option key={scheme.value} value={scheme.value}>
                        {scheme.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Area (hectares)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={areaHa}
                    onChange={(e) => setAreaHa(e.target.value)}
                    placeholder="e.g. 2.4"
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label>Soil type (optional)</label>
                  <select
                    className="select"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Select soil type</option>
                    <option>Reddish-Brown Earth</option>
                    <option>Low-Humic Gley</option>
                    <option>Alluvial</option>
                  </select>
                </div>
                <div className="field">
                  <label>Latitude</label>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Tap map or use current location"
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label>Longitude</label>
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Tap map or use current location"
                    disabled={submitting}
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Location label (optional)</label>
                  <input
                    className="input"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Near turnout 3, east canal"
                    disabled={submitting}
                  />
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Location selection map</label>
                  <LocationPickerMap
                    latitude={latitude}
                    longitude={longitude}
                    fallbackCenter={selectedScheme.center}
                    mapLayer={mapLayer}
                    onMapLayerChange={setMapLayer}
                    onLocationPick={handleMapLocationPick}
                    disabled={submitting}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleUseCurrentLocation}
                      disabled={submitting || locating}
                    >
                      {locating ? "Finding location…" : "Use current location"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setLatitude("");
                        setLongitude("");
                      }}
                      disabled={submitting}
                    >
                      Clear coordinates
                    </button>
                  </div>
                </div>

                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Field screenshot / reference image (optional)</label>
                  <div
                    style={{
                      border: "1px dashed var(--border)",
                      borderRadius: 10,
                      background: "var(--surface)",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        className="btn btn-ghost btn-sm"
                        style={{
                          cursor: submitting ? "not-allowed" : "pointer",
                        }}
                      >
                        Choose image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLocationScreenshotChange}
                          disabled={submitting}
                          style={{ display: "none" }}
                        />
                      </label>
                      {locationScreenshot && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={clearLocationScreenshot}
                          disabled={submitting}
                        >
                          Remove image
                        </button>
                      )}
                      <span className="tiny muted">
                        {locationScreenshot
                          ? `Attached: ${locationScreenshot.name}`
                          : "Add a screenshot to document plot boundaries or landmarks."}
                      </span>
                    </div>

                    {locationScreenshotPreview && (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={locationScreenshotPreview}
                          alt="Field screenshot preview"
                          style={{
                            width: "100%",
                            maxHeight: 220,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 24,
                  justifyContent: "space-between",
                }}
              >
                <a
                  href="/farmer/fields"
                  className="btn btn-ghost"
                  aria-disabled={submitting}
                >
                  ← Back
                </a>
                <button
                  className="btn btn-primary"
                  onClick={handleFieldCreate}
                  disabled={!canCreateField || submitting}
                >
                  {submitting ? "Creating..." : "Create field →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerOnboarding />
    </div>
  );
}
