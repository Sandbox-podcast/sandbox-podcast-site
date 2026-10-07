import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: 38,
        background: '#05090d',
      }}
    >
      <svg width="130" height="130" viewBox="0 0 64 64" aria-label="Sandbox">
        <path
          d="M32 10 55 52H9L32 10Zm0 14L21.8 43h20.4L32 24Z"
          fill="#1cb5ed"
          fillRule="evenodd"
        />
      </svg>
    </div>,
    size,
  );
}
