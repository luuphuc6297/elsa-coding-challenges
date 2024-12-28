/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    webpack: (config) => {
        // Always enable source maps
        config.devtool = 'source-map'

        config.ignoreWarnings = [{ module: /node_modules/ }]

        return config
    },
    // Add page extensions
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = nextConfig
