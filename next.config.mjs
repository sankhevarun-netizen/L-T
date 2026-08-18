import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The floating dev badge sits over the sidebar and shows up in demo screenshots.
  devIndicators: false,
  // Pin the workspace root — a stray lockfile in the parent directory
  // otherwise makes Next infer C:\Users\anous as the root.
  outputFileTracingRoot: __dirname,
}

export default nextConfig
