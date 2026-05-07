import PQueue from "p-queue";

/**
 * B 站 API 请求队列
 *
 * - 并发数 1：同一时间只有 1 个请求在飞
 * - interval 20000ms + intervalCap 1：每 20 秒最多 1 个请求
 *
 * 这样将请求严格串行化，避免触发 B 站 62012 限流。
 */
export const bilibiliQueue = new PQueue({
    concurrency: 1,
    interval: 20000,
    intervalCap: 1,
});
