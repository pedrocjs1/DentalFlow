import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dentiqa - Software para Clínicas Dentales con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "36px", fontWeight: 800, color: "#2563EB" }}>DQ</span>
          </div>
          <span style={{ fontSize: "56px", fontWeight: 800, color: "white" }}>Dentiqa</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.95)",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.3,
          }}
        >
          Software para Clínicas Dentales con IA y WhatsApp
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255,255,255,0.7)",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          Agenda · Historia Clínica · Odontograma · Chatbot IA · CRM · Estadísticas
        </div>

        {/* Bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          dentiqa.app — Probá gratis 14 días
        </div>
      </div>
    ),
    { ...size }
  );
}
