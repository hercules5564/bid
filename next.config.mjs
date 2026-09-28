import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project (a stray lockfile sits on the Desktop).
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  // The bidding logic + socket layer live in the custom server (server.mjs);
  // nothing here should try to bundle the socket server into the client.
  serverExternalPackages: ["socket.io", "bcryptjs"],
  // Lint is run separately; don't let it block a production build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
