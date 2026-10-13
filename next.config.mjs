const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
export default {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "4mb" } }, // receipt uploads are capped at 3 MB in the app
  async headers() { return [{ source: "/:path*", headers }]; },
};
