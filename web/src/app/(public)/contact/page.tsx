/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const InfoBox = ({ children }: any) => (
  <div
    style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '28px 32px',
    }}
  >
    {children}
  </div>
);

const InfoTitle = ({ children, mt = 0 }: any) => (
  <h3
    className="font-serif"
    style={{ fontSize: 20, fontWeight: 500, color: 'var(--primary-700)', marginTop: mt, marginBottom: 14 }}
  >
    {children}
  </h3>
);

const InfoRow = ({ label, value, link }: any) => (
  <div style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
    <strong style={{ color: 'var(--text)', minWidth: 110 }}>{label}</strong>
    {link ? (
      <a href={`mailto:${value}`} style={{ color: 'var(--secondary)' }}>{value}</a>
    ) : (
      <span style={{ color: 'var(--ink-soft)' }}>{value}</span>
    )}
  </div>
);

export default function ContactPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    const subj = encodeURIComponent(`[25-26J-520] ${subject}`);
    window.location.href = `mailto:IT22561770@my.sliit.lk?subject=${subj}&body=${body}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="contact" />
      <PageHeader
        eyebrow="Contact"
        title="Contact Us"
        lead="Reach out to the project team with questions, collaboration ideas, or feedback."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 22 }}>

          {/* Project + team contacts */}
          <InfoBox>
            <InfoTitle>Project Information</InfoTitle>
            <InfoRow label="Group ID" value="25-26J-520" />
            <InfoRow label="Project" value="Integrated Smart Water-Focused Irrigation System Using IoT and AI/ML" />
            <InfoRow label="Institution" value="Sri Lanka Institute of Information Technology (SLIIT)" />
            <InfoRow label="Faculty" value="Faculty of Computing" />
            <InfoRow label="Programme" value="BSc (Hons) in IT — Software Engineering" />

            <InfoTitle mt={28}>Team Email Contacts</InfoTitle>
            <InfoRow label="Dilruksha" value="IT22561770@my.sliit.lk" link />
            <InfoRow label="Hesara" value="IT22561398@my.sliit.lk" link />
            <InfoRow label="Trishni" value="IT22076366@my.sliit.lk" link />
            <InfoRow label="Abishek" value="IT22076547@my.sliit.lk" link />
          </InfoBox>

          {/* Contact form */}
          <InfoBox>
            <InfoTitle>Send a Message</InfoTitle>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.55 }}>
              Use the form below to send a message. Your default email client will open with the
              message ready to send.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label htmlFor="cf-name" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Your Name
                </label>
                <input
                  id="cf-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    background: 'white',
                  }}
                />
              </div>

              <div>
                <label htmlFor="cf-email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Your Email
                </label>
                <input
                  id="cf-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    background: 'white',
                  }}
                />
              </div>

              <div>
                <label htmlFor="cf-subject" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Subject
                </label>
                <select
                  id="cf-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    background: 'white',
                  }}
                >
                  <option value="">— Select a topic —</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Research Collaboration">Research Collaboration</option>
                  <option value="Technical Question">Technical Question</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="cf-message" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Message
                </label>
                <textarea
                  id="cf-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    background: 'white',
                    minHeight: 130,
                    resize: 'vertical',
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: 42, fontSize: 13.5 }}>
                Send Message
              </button>
            </form>
          </InfoBox>
        </div>

        {/* Email template */}
        <section
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '28px 32px',
            marginTop: 22,
          }}
        >
          <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--primary-700)', marginBottom: 12 }}>
            General Email Template
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
            If you wish to email us directly, please use the following template:
          </p>
          <pre
            style={{
              background: 'var(--bg)',
              padding: '18px 20px',
              borderRadius: 10,
              borderLeft: '4px solid var(--primary)',
              fontSize: 12.5,
              lineHeight: 1.7,
              color: 'var(--text)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'pre-wrap',
              margin: 0,
              overflow: 'auto',
            }}
          >
{`To: IT22561770@my.sliit.lk
Subject: [25-26J-520] <Your Subject>

Dear Project Group 25-26J-520 Team,

<Your message here>

Best regards,
<Your name>
<Your affiliation>`}
          </pre>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
