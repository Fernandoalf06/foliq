import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D4ED8",
          borderRadius: "42px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "92px",
            height: "106px",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "92px",
              height: "20px",
              borderRadius: "10px",
              background: "#FFFFFF",
            }}
          />
          <div
            style={{
              width: "66px",
              height: "20px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.88)",
            }}
          />
          <div
            style={{
              width: "22px",
              height: "36px",
              borderRadius: "11px",
              background: "rgba(255,255,255,0.72)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 192,
      height: 192,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
