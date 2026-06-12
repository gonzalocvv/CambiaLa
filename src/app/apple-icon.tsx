import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: '#1E3A8A',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          color: '#ECF2FB',
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: '-1px',
          fontFamily: 'sans-serif',
        }}
      >
        Cambia
      </span>
      <span
        style={{
          color: '#F97316',
          fontSize: 60,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        La
      </span>
    </div>,
    { ...size },
  );
}
