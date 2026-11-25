import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas:
// - nadie puede mostrar Colectia dentro de un marco (evita clics engañosos);
// - el navegador no adivina tipos de archivo;
// - otros sitios no reciben la dirección completa de la página;
// - sin acceso a cámara, micrófono ni ubicación.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
