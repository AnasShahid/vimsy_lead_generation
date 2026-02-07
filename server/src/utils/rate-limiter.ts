/**
 * Simple token-bucket rate limiter.
 * Each provider gets its own instance.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRateMs: number // ms between token refills
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRateMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // Wait for next token
    const waitMs = this.refillRateMs - (Date.now() - this.lastRefill);
    await new Promise(resolve => setTimeout(resolve, Math.max(waitMs, 100)));
    return this.acquire();
  }
}

// Pre-configured rate limiters for different providers
export const rateLimiters = {
  // 1 request per second for web scraping
  scraping: new RateLimiter(2, 1000),
  // BuiltWith: depends on plan, start conservative
  builtwith: new RateLimiter(5, 1000),
  // Wappalyzer: free tier is very limited
  wappalyzer: new RateLimiter(1, 2000),
  // WordPress detection: 2 requests per second (makes multiple sub-requests)
  wpDetection: new RateLimiter(2, 500),
};
