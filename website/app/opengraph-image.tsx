import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "r3call - Intelligent Memory for AI";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          r3call
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 300,
            opacity: 0.9,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Intelligent Memory Layer for AI Applications
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            marginTop: 40,
            opacity: 0.8,
            display: "flex",
            gap: 30,
          }}
        >
          <span>Sub-5ms response</span>
          <span>•</span>
          <span>Automatic failover</span>
          <span>•</span>
          <span>Built for scale</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
