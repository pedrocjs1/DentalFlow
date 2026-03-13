export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "640px" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 800, color: "#0f766e", marginBottom: "1rem" }}>
          DentalFlow
        </h1>
        <p style={{ fontSize: "1.25rem", color: "#374151", marginBottom: "2rem" }}>
          El SaaS todo-en-uno para clínicas dentales en Latinoamérica.
          <br />
          Chatbot IA, agenda, CRM y campañas automáticas — en una sola plataforma.
        </p>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            background: "#0d9488",
            color: "white",
            padding: "0.875rem 2rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Empezar prueba gratis →
        </a>
      </div>
    </main>
  );
}
