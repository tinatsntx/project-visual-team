/**
 * Tiny per-key sliding-window rate limiter for state-changing tools
 * (PROJECT_PLAN.md §13.5). In-memory is sufficient for the alpha spike.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number,
    private now: () => number = Date.now,
  ) {}

  allow(key: string): boolean {
    const cutoff = this.now() - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(this.now());
    this.hits.set(key, list);
    return true;
  }
}
