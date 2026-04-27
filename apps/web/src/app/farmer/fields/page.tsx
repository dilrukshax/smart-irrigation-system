/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import {
  Icon,
  Chip,
  Frame,
} from '@/components/asi/ui';
import { farmerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const clampPct = (value: any) => Math.max(0, Math.min(100, Number(value) || 0));

const formatArea = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1).replace(/\.0$/, '') : '0';
};

const formatGps = (field: any) => {
  const lat = Number(field.latitude ?? field.lat);
  const lng = Number(field.longitude ?? field.lng ?? field.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return field.location_name || field.gps_label || '';
  }
  return `GPS ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
};

const formatRelativeTime = (value: any) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return 'Just now';
  if (absMs < hour) return `${Math.max(1, Math.round(absMs / minute))}m ago`;
  if (absMs < day) return `${Math.max(1, Math.round(absMs / hour))}h ago`;
  return `${Math.max(1, Math.round(absMs / day))}d ago`;
};

const getFieldId = (field: any, index: number) => field.field_id || field.id || field.slug || `field-${index}`;

const getMoisture = (field: any) => {
  const telemetry = field.latest_telemetry || field.telemetry || {};
  const value =
    telemetry.soil_moisture_pct ??
    telemetry.soil_moisture ??
    field.soil_moisture_pct ??
    field.soil_moisture;
  return Number.isFinite(Number(value)) ? clampPct(value) : null;
};

const getHealth = (field: any, moisture: number | null) => {
  const explicit = String(field.health_status || field.health || '').toLowerCase();
  if (explicit.includes('critical')) return { label: 'Critical', kind: 'crit', color: 'var(--danger)' };
  if (explicit.includes('stress')) return { label: 'Stressed', kind: 'warn', color: 'var(--accent)' };
  if (explicit.includes('healthy')) return { label: 'Healthy', kind: 'live', color: 'var(--primary)' };
  if (moisture === null) return { label: 'Waiting', kind: 'off', color: 'var(--muted)' };
  if (moisture < 35) return { label: 'Critical', kind: 'crit', color: 'var(--danger)' };
  if (moisture < 50) return { label: 'Stressed', kind: 'warn', color: 'var(--accent)' };
  return { label: 'Healthy', kind: 'live', color: 'var(--primary)' };
};

const getLastUpdate = (field: any) => {
  const telemetry = field.latest_telemetry || field.telemetry || {};
  return telemetry.timestamp || telemetry.observed_at || field.updated_at || field.created_at;
};

const fieldMatchesSearch = (field: any, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return [
    field.field_name,
    field.name,
    field.crop_type,
    field.crop,
    field.scheme_id,
    field.location_name,
    field.health_status,
  ].some((value) => String(value || '').toLowerCase().includes(q));
};

const FieldList = () => {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const loadFields = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/farm/fields');
      const fieldList = Array.isArray(res) ? res : res?.fields || res?.data || [];
      setFields(fieldList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

  const filteredFields = fields.filter((field: any) => fieldMatchesSearch(field, searchTerm));
  const filteredIds = filteredFields.map(getFieldId);
  const selectedFilteredCount = filteredIds.filter((id) => selectedIds.includes(id)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;
  const totalArea = fields.reduce((sum: number, field: any) => sum + (Number(field.area_hectares ?? field.area) || 0), 0);
  const schemeId = user?.scheme_ids?.[0] || fields.find((field) => field.scheme_id)?.scheme_id || 'H';
  const schemeLabel = String(schemeId).startsWith('Mahaweli') ? schemeId : `Mahaweli ${schemeId}`;
  const displayName = user?.username || 'Farmer';

  const toggleSelected = (fieldId: string) => {
    setSelectedIds((current) =>
      current.includes(fieldId)
        ? current.filter((id) => id !== fieldId)
        : [...current, fieldId]
    );
  };

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }
      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const renderFieldActions = (fieldId: string) => (
    <div className="farmer-fields-actions-cell">
      <Link href={`/farmer/field/${fieldId}`} className="btn btn-ghost btn-sm">Workspace</Link>
      <Link href={`/farmer/field/${fieldId}`} className="btn btn-primary btn-sm">Request</Link>
    </div>
  );

  const renderMoisture = (moisture: number | null, health: any) => (
    <div className="farmer-fields-moisture">
      {moisture === null ? (
        <span className="tiny muted">No telemetry</span>
      ) : (
        <>
          <div className="farmer-fields-moisture-track">
            <div
              className="farmer-fields-moisture-fill"
              style={{ width: `${moisture}%`, background: health.color }}
            />
          </div>
          <span className="tabular small">{Math.round(moisture)}%</span>
        </>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="farmer-fields-table-card">
      <div className="farmer-fields-table-scroll">
        <table className="farmer-fields-table">
          <thead>
            <tr>
              <th className="farmer-fields-check-col">
                <input
                  type="checkbox"
                  aria-label="Select all fields"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                />
              </th>
              <th>Field</th>
              <th>Crop</th>
              <th>Area</th>
              <th>Soil moisture</th>
              <th>Health</th>
              <th>Last update</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {filteredFields.map((field: any, index: number) => {
              const fieldId = getFieldId(field, index);
              const fieldName = field.field_name || field.name || fieldId;
              const cropType = field.crop_type || field.crop || field.variety || 'Not assigned';
              const area = field.area_hectares ?? field.area ?? 0;
              const moisture = getMoisture(field);
              const health = getHealth(field, moisture);
              const gps = formatGps(field);

              return (
                <tr key={fieldId}>
                  <td className="farmer-fields-check-col">
                    <input
                      type="checkbox"
                      aria-label={`Select ${fieldName}`}
                      checked={selectedIds.includes(fieldId)}
                      onChange={() => toggleSelected(fieldId)}
                    />
                  </td>
                  <td>
                    <div className="farmer-fields-name">{fieldName}</div>
                    {gps && <div className="farmer-fields-gps">{gps}</div>}
                  </td>
                  <td>{cropType}</td>
                  <td className="tabular">{formatArea(area)} ha</td>
                  <td>{renderMoisture(moisture, health)}</td>
                  <td><Chip kind={health.kind}>{health.label}</Chip></td>
                  <td className="muted small">{formatRelativeTime(getLastUpdate(field))}</td>
                  <td>{renderFieldActions(fieldId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="farmer-fields-grid">
      {filteredFields.map((field: any, index: number) => {
        const fieldId = getFieldId(field, index);
        const fieldName = field.field_name || field.name || fieldId;
        const cropType = field.crop_type || field.crop || field.variety || 'Not assigned';
        const area = field.area_hectares ?? field.area ?? 0;
        const moisture = getMoisture(field);
        const health = getHealth(field, moisture);
        const gps = formatGps(field);

        return (
          <div className="card farmer-fields-card" key={fieldId}>
            <div className="farmer-fields-card-head">
              <div>
                <div className="farmer-fields-name">{fieldName}</div>
                {gps && <div className="farmer-fields-gps">{gps}</div>}
              </div>
              <Chip kind={health.kind}>{health.label}</Chip>
            </div>
            <div className="farmer-fields-card-meta">
              <span>{cropType}</span>
              <span className="tabular">{formatArea(area)} ha</span>
            </div>
            {renderMoisture(moisture, health)}
            <div className="farmer-fields-card-foot">
              <span className="muted small">{formatRelativeTime(getLastUpdate(field))}</span>
              {renderFieldActions(fieldId)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Frame
      sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))}
      breadcrumb={['Farmer', 'My Fields']}
      user={displayName}
      role="Farmer"
    >
      <div className="farmer-fields-page">
        <div className="farmer-fields-head">
          <div>
            <h1>My fields</h1>
            <div className="page-sub">{fields.length} fields · {formatArea(totalArea)} ha total · {schemeLabel}</div>
          </div>
          <div className="farmer-fields-toolbar">
            <label className="farmer-fields-search">
              <Icon name="search" size={15} color="var(--muted)"/>
              <input
                placeholder="Search fields, crops, zones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <div className="farmer-fields-view-toggle" aria-label="View mode">
              <button
                type="button"
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                aria-label="List view"
                title="List view"
              >
                <Icon name="list" size={15}/>
              </button>
              <button
                type="button"
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                title="Grid view"
              >
                <Icon name="grid" size={15}/>
              </button>
            </div>
            <Link href="/farmer/onboarding" className="btn btn-primary farmer-fields-add">
              <Icon name="plus" size={14}/> Add field
            </Link>
          </div>
        </div>

        <ApiState loading={loading && fields.length === 0} error={error} onRetry={loadFields}>
          {fields.length === 0 ? (
            <div className="card farmer-fields-empty">
              <Icon name="leaf" size={40} color="var(--muted)"/>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>No fields yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 16 }}>
                Register your first field to start tracking soil moisture and water requests.
              </div>
              <Link href="/farmer/onboarding" className="btn btn-primary">
                <Icon name="plus" size={13}/> Create first field
              </Link>
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="card farmer-fields-empty">
              <Icon name="search" size={34} color="var(--muted)"/>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 12 }}>No matching fields</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Try another field, crop, or zone name.</div>
            </div>
          ) : viewMode === 'list' ? (
            renderTable()
          ) : (
            renderGrid()
          )}
        </ApiState>
      </div>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldList />
    </div>
  );
}
