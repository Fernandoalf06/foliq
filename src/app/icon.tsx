import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "112px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "240px",
            height: "280px",
            gap: "36px",
          }}
        >
          <div
            style={{
              width: "240px",
              height: "52px",
              borderRadius: "26px",
              background: "#FFFFFF",
            }}
          />
          <div
            style={{
              width: "172px",
              height: "52px",
              borderRadius: "26px",
              background: "rgba(255,255,255,0.88)",
            }}
          />
          <div
            style={{
              width: "56px",
              height: "92px",
              borderRadius: "28px",
              background: "rgba(255,255,255,0.72)",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
