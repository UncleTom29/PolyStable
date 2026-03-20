/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    config.resolve.alias["pino-pretty"] = false;
    return config;
  },
};

module.exports = nextConfig;
