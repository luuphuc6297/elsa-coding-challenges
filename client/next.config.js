/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
    webpack: (config) => {
        config.devtool = 'source-map'

        config.ignoreWarnings = [{ module: /node_modules/ }]

        return config
    },
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = nextConfig
