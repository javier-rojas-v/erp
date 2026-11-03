"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
          <h1>Ocurrió un error inesperado</h1>
          <p>No fue posible cargar esta vista.</p>
          <button type="button" onClick={() => reset()}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
