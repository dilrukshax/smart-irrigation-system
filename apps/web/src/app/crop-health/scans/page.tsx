/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { Chip, Icon, Progress } from '@/components/asi/ui';
import { apiGet, uploadFile } from '@/lib/api';
import {
  CropHealthFrame,
  MetricCard,
  ModelStatusPanel,
  formatNumber,
  formatPct,
  gridAuto,
  statusKind,
} from '../_components/crop-health-shared';

const DiseaseScans = () => {
  const [modelStatus, setModelStatus] = React.useState<any>(null);
  const [classes, setClasses] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [predictionResult, setPredictionResult] = React.useState<any>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>('/crop-health/model/status'),
        apiGet<any>('/crop-health/model/classes'),
      ]);
      const [statusRes, classesRes] = results;
      if (statusRes.status === 'fulfilled') setModelStatus(statusRes.value);
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load disease model status');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load disease model status');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!uploadedFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  const handleImageUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    setPredictionResult(null);
    try {
      const res = await uploadFile<any>('/crop-health/predict', uploadedFile);
      setPredictionResult(res);
    } catch (err: any) {
      setPredictionResult({ error: err?.message || 'Prediction failed' });
    } finally {
      setUploading(false);
    }
  };

  const classRows = Array.isArray(classes?.classes) ? classes.classes : [];
  const confidence = Number(predictionResult?.confidence);

  return (
    <CropHealthFrame
      active="Disease Scans"
      title="Disease scans"
      subtitle="Leaf-image diagnosis and F2 MobileNet model readiness"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !modelStatus} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="Model status"
            value={modelStatus?.model_loaded ? 'Ready' : 'Pending'}
            sub={modelStatus?.message || 'Model status unavailable'}
            icon="shield_check"
            chip={modelStatus?.status || 'model'}
            kind={statusKind(modelStatus?.status)}
            color={modelStatus?.model_loaded ? 'var(--primary)' : 'var(--accent)'}
          />
          <MetricCard
            title="Disease classes"
            value={formatNumber(modelStatus?.num_classes ?? classes?.num_classes, 0)}
            sub="Supported classifier labels"
            icon="list"
            chip="classes"
            kind="sim"
            color="var(--secondary)"
          />
          <MetricCard
            title="Last result"
            value={predictionResult?.error ? 'Failed' : predictionResult?.health_status || '-'}
            sub={predictionResult?.predicted_class || predictionResult?.error || 'No scan run in this session'}
            icon="leaf"
            chip={predictionResult?.source || 'scan'}
            kind={predictionResult?.error ? 'crit' : statusKind(predictionResult?.risk_level || predictionResult?.status)}
            color={predictionResult?.error ? 'var(--danger)' : 'var(--primary)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.75fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">New scan</div>
                <div className="tiny muted">Image prediction endpoint</div>
              </div>
              <Chip kind={modelStatus?.model_loaded ? 'live' : 'warn'}>{modelStatus?.source || 'F2'}</Chip>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="field">
                <label>Leaf image</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(event) => setUploadedFile(event.target.files?.[0] || null)}
                  className="input"
                  disabled={uploading}
                />
              </div>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '16 / 10', border: '1px dashed var(--border)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
                  Select an image
                </div>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={handleImageUpload}
                disabled={!uploadedFile || uploading}
              >
                <Icon name="upload" size={13} color="white"/> {uploading ? 'Analyzing...' : 'Run detection'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Prediction result</div>
                <div className="tiny muted">{predictionResult?.observed_at ? `Observed ${new Date(predictionResult.observed_at).toLocaleString()}` : 'Current session'}</div>
              </div>
              {predictionResult && !predictionResult.error && <Chip kind={statusKind(predictionResult.risk_level)}>{predictionResult.risk_level || predictionResult.status}</Chip>}
            </div>
            {predictionResult ? (
              predictionResult.error ? (
                <div style={{ padding: 12, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>
                  {predictionResult.error}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div className="tiny muted">Class</div>
                    <div style={{ fontSize: 24, fontWeight: 750, lineHeight: 1.2 }}>{predictionResult.predicted_class || 'Unknown'}</div>
                  </div>
                  <div style={gridAuto(140)}>
                    <div>
                      <div className="tiny muted">Health</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{predictionResult.health_status || '-'}</div>
                    </div>
                    <div>
                      <div className="tiny muted">Severity</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{predictionResult.severity || '-'}</div>
                    </div>
                  </div>
                  {Number.isFinite(confidence) && (
                    <Progress value={confidence * 100} color="var(--primary)" label={`Confidence ${formatPct(confidence)}`}/>
                  )}
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>{predictionResult.recommendation || 'No recommendation returned.'}</div>
                  <div className="tiny muted">
                    Source: {predictionResult.source || '-'} · Model used: {predictionResult.model_used ? 'yes' : 'no'}
                  </div>
                </div>
              )
            ) : (
              <div className="tiny muted" style={{ lineHeight: 1.55 }}>No prediction result yet.</div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.6fr) minmax(0, 1fr)', gap: 14 }}>
          <ModelStatusPanel status={modelStatus} classes={classes}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Classifier labels</div>
                <div className="tiny muted">{classRows.length} labels returned by F2</div>
              </div>
              <Chip kind="sim">classes</Chip>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxHeight: 220, overflowY: 'auto' }}>
              {classRows.slice(0, 80).map((name: string) => (
                <span key={name} className="chip sim" style={{ fontSize: 10.5 }}>{name.replaceAll('___', ' · ').replaceAll('_', ' ')}</span>
              ))}
              {!classRows.length && <div className="tiny muted">No class list returned.</div>}
            </div>
          </div>
        </div>
      </ApiState>
    </CropHealthFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <DiseaseScans />
    </div>
  );
}
