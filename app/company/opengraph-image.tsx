import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const alt         = 'DriverNord — Hitta kvalificerade chaufförer snabbare';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e3a8a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 90px',
        }}
      >
        {/* Brand */}
        <div
          style={{
            color: '#93c5fd',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          DriverNord — För transportföretag
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          Hitta kvalificerade chaufförer snabbare.
        </div>

        {/* Subtext */}
        <div
          style={{
            color: '#bfdbfe',
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: 760,
          }}
        >
          C/CE/D-körkort, YKB-status och tillgänglighet — strukturerat underlag redo för kontakt.
        </div>

        {/* Bottom rule */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 90,
            right: 90,
            height: 2,
            background: '#3b82f6',
            borderRadius: 1,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
