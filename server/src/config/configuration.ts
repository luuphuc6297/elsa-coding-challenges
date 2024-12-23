export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/elsa-coding-challenges',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '24h',
    },
})
