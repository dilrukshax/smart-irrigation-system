/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const Section = ({ title, children }: any) => (
  <section
    style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '28px 32px',
      marginBottom: 22,
    }}
  >
    <h2
      className="font-serif"
      style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--primary-700)', marginBottom: 14 }}
    >
      {title}
    </h2>
    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{children}</div>
  </section>
);

const Pill = ({ children }: any) => (
  <span
    style={{
      display: 'inline-block',
      background: 'var(--primary-50)',
      color: 'var(--primary-600)',
      padding: '5px 12px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      marginRight: 6,
      marginBottom: 6,
      border: '1px solid #DDEAD8',
    }}
  >
    {children}
  </span>
);

export default function DomainPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="domain" />
      <PageHeader
        eyebrow="Domain"
        title="Domain & Research"
        lead="The research foundation of the project — literature, problem statement, objectives, methodology, and the technologies powering the integrated platform."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>
        <Section title="Literature Survey">
          <p>
            Sri Lankan irrigation schemes traditionally rely on quota-based water release governed by
            the Mahaweli Authority and Department of Agrarian Development. Existing literature highlights
            persistent inefficiency in water distribution due to manual gate operation, limited real-time
            visibility into reservoir state, and poor crop planning under variable rainfall conditions.
          </p>
          <p style={{ marginTop: 12 }}>
            Recent work demonstrates the value of IoT-based soil moisture and water level sensors
            integrated with classical machine learning to drive valve automation. Studies on satellite
            NDVI/NDWI imagery have shown reliable early detection of crop water stress in cultivated
            zones. Time-series forecasting research using ARIMA, SARIMA, and ensemble approaches has been
            applied successfully to rainfall and reservoir water-level prediction. Crop allocation
            optimization with linear and mixed-integer programming, supported by multi-criteria decision
            analysis methods like Fuzzy-TOPSIS, has been explored for resource-constrained farming.
          </p>
          <p style={{ marginTop: 12 }}>
            However, very few systems integrate <strong>all four pillars</strong> (IoT control, crop
            health, forecasting, and crop optimization) into a single operational platform tailored to
            a quota-driven scheme.
          </p>
        </Section>

        <Section title="Research Gap">
          <p>
            Existing work on smart irrigation tends to focus on isolated components — either sensor-based
            valve control, or NDVI-based stress detection, or rainfall forecasting in isolation. There
            is a lack of an <strong>integrated decision-support platform</strong> that:
          </p>
          <ul style={{ margin: '12px 0 0 22px', display: 'grid', gap: 8 }}>
            <li>Combines real-time IoT telemetry with cross-service data (forecasts, stress, optimization).</li>
            <li>Adapts irrigation decisions to forecast rainfall and crop-level stress.</li>
            <li>Allocates crop areas under explicit water quota constraints with fallback (Plan B) plans.</li>
            <li>Serves multiple stakeholders (farmers, officers, authorities) with role-aware interfaces.</li>
          </ul>
        </Section>

        <Section title="Research Problem">
          <p style={{ fontStyle: 'italic', color: 'var(--text)' }}>
            How can we design and deliver an integrated, water-focused smart irrigation platform that
            combines IoT-driven valve control, crop health monitoring, weather forecasting, and crop
            area optimization to maximize yield and minimize water waste under a fixed quota in
            Sri Lankan irrigation schemes?
          </p>
        </Section>

        <Section title="Research Objectives">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '6px 0 8px' }}>
            Main Objective
          </h3>
          <p>
            To design, implement, and validate an integrated smart irrigation and crop optimization
            platform combining IoT, AI/ML, time-series forecasting, and mathematical optimization for
            quota-based irrigation schemes.
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '18px 0 8px' }}>
            Sub-objectives
          </h3>
          <ul style={{ margin: '0 0 0 22px', display: 'grid', gap: 8 }}>
            <li><strong>F1 — Smart Irrigation Control:</strong> IoT-driven Random Forest model for automated valve control with manual override and approval workflow.</li>
            <li><strong>F2 — Crop Health Detection:</strong> Satellite zone health analyzer and 38-class crop disease classifier (MobileNetV2).</li>
            <li><strong>F3 — Forecasting:</strong> Multi-horizon (1–14 day) rainfall and water-level forecasts with risk bands and alerts.</li>
            <li><strong>F4 — Crop Area Optimization:</strong> Fuzzy-TOPSIS suitability scoring and PuLP-based optimization for crop allocation under water quota constraints.</li>
            <li><strong>Integration:</strong> Unified API gateway and a role-aware web dashboard for farmers, officers, and authorities.</li>
          </ul>
        </Section>

        <Section title="Methodology">
          <p>The project follows an iterative, parallel-stream research methodology:</p>
          <ol style={{ margin: '12px 0 0 22px', display: 'grid', gap: 8 }}>
            <li><strong>Literature Review</strong> — Survey existing IoT, ML, and optimization approaches.</li>
            <li><strong>Requirement Analysis</strong> — Capture stakeholder needs from farmers, officers, and authorities.</li>
            <li><strong>System Design</strong> — Microservice architecture with shared API gateway, PostgreSQL, Redis, and MQTT.</li>
            <li><strong>Data Collection</strong> — Synthetic data, PlantVillage dataset, historical rainfall/water-level records, ESP32 sensor data.</li>
            <li><strong>Model Development</strong> — Random Forest, MobileNetV2, ARIMA + LinearRegression, Fuzzy-TOPSIS + PuLP.</li>
            <li><strong>Service Implementation</strong> — FastAPI services with consistent contract fields.</li>
            <li><strong>Cross-Service Integration</strong> — F1 consumes F3 forecasts and F2 stress; F4 reads from F1, F2, F3.</li>
            <li><strong>Frontend Implementation</strong> — Next.js + TypeScript role-aware dashboard.</li>
            <li><strong>Testing</strong> — Per-service unit tests, gateway contract tests, integration validation.</li>
            <li><strong>Evaluation</strong> — Compare model accuracy, system response, water savings, and yield outcomes against baseline.</li>
          </ol>
        </Section>

        <Section title="Technologies Used">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 10px' }}>Backend &amp; Services</h3>
          <div><Pill>Python 3.11+</Pill><Pill>FastAPI</Pill><Pill>Uvicorn</Pill><Pill>SQLAlchemy 2.0</Pill><Pill>Pydantic 2.0</Pill></div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>Data &amp; Storage</h3>
          <div><Pill>PostgreSQL</Pill><Pill>Redis</Pill><Pill>Mosquitto MQTT</Pill></div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>Machine Learning</h3>
          <div>
            <Pill>scikit-learn</Pill><Pill>TensorFlow / Keras</Pill><Pill>statsmodels</Pill>
            <Pill>pmdarima</Pill><Pill>PuLP</Pill><Pill>NumPy / pandas</Pill>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>Frontend</h3>
          <div><Pill>Next.js 16</Pill><Pill>React 19</Pill><Pill>TypeScript 5.2</Pill></div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>Hardware &amp; IoT</h3>
          <div><Pill>ESP32</Pill><Pill>Soil Moisture Sensor</Pill><Pill>Water Level Sensor</Pill><Pill>MQTT over Wi-Fi</Pill></div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>DevOps &amp; Infrastructure</h3>
          <div>
            <Pill>Docker</Pill><Pill>Kubernetes</Pill><Pill>Skaffold</Pill>
            <Pill>Terraform</Pill><Pill>Azure (AKS, ACR)</Pill>
            <Pill>GitHub Actions</Pill><Pill>Prometheus</Pill><Pill>Grafana</Pill>
          </div>
        </Section>
      </main>

      <PublicFooter />
    </div>
  );
}
