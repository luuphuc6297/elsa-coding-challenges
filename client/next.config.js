/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    webpack: (config, { dev }) => {
        if (dev) {
            config.devtool = 'eval-source-map'
        }
        return config
    },
}

module.exports = nextConfig
