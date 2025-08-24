import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AIRateLimitService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async checkRateLimit(userId: number, limit: number = 5): Promise<boolean> {
    const key = `ai:rate_limit:${userId}:${new Date().toDateString()}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 86400); // 24 hours
    }
    
    return count <= limit;
  }

  async getRemainingRequests(userId: number, limit: number = 5): Promise<number> {
    const key = `ai:rate_limit:${userId}:${new Date().toDateString()}`;
    const count = await this.redis.get(key);
    const used = count ? parseInt(count, 10) : 0;
    return Math.max(0, limit - used);
  }

  async resetRateLimit(userId: number): Promise<void> {
    const key = `ai:rate_limit:${userId}:${new Date().toDateString()}`;
    await this.redis.del(key);
  }
}