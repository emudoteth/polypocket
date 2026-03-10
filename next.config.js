// Build: 1773157493
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['polymarket-upload.s3.us-east-2.amazonaws.com', 'polymarket.com'] },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @polymarket/clob-client uses Node.js built-ins — stub them for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        os: false,
        fs: false,
        path: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    return config;
  },
};
module.exports = nextConfig;
