import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#1E3A8A',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '36px',
      }}
    >
      <span
        style={{
          color: '#ECF2FB',
          fontSize: 64,
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
          fontSize: 64,
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
