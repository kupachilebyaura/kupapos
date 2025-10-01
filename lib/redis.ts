import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined
}

let redis: Redis

if (process.env.NODE_ENV === 'production') {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
} else {
  // In development, use a global variable to preserve the Redis connection
  // across hot reloads
  if (!global.redis) {
    global.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }
  redis = global.redis
}

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('connect', () => {
  console.log('Redis connected successfully')
})

export { redis }

/**
 * Redis Keys Pattern
 * ------------------
 * token:blacklist:{tokenId} - Blacklisted tokens
 * token:refresh:{userId} - Refresh tokens
 * session:{sessionId} - User sessions
 */

export const RedisKeys = {
  tokenBlacklist: (tokenId: string) => `token:blacklist:${tokenId}`,
  refreshToken: (userId: string) => `token:refresh:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const
