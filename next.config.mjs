const transportHeaders = process.env.NODE_ENV === "production"
  ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
  : []

const applicationHeaders = [
  ...transportHeaders,
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/", headers: applicationHeaders },
      { source: "/project/:path*", headers: applicationHeaders },
      { source: "/api/:path*", headers: applicationHeaders },
    ]
  }
}

export default nextConfig
