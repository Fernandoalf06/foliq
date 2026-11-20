import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "88px",
            height: "102px",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "20px",
              borderRadius: "10px",
              background: "#FFFFFF",
            }}
          />
          <div
            style={{
              width: "64px",
              height: "20px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.88)",
            }}
          />
          <div
            style={{
              width: "22px",
              height: "34px",
              borderRadius: "11px",
              background: "rgba(255,255,255,0.72)",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
