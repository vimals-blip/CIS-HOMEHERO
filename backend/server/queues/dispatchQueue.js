// Dispatch retry queue. Uses BullMQ + Redis when REDIS_URL is configured;
// otherwise falls back to an in-process setTimeout so the app runs anywhere.
const REDIS_URL = process.env.REDIS_URL;
const RETRY_MS = Number(process.env.DISPATCH_RETRY_MS || 8000);

export const dispatchQueueMode = REDIS_URL ? 'bullmq' : 'inproc';

let queue = null;          // BullMQ Queue (real mode)
let processor = null;      // async ({ bookingId, attempt }) => void

// dispatchService registers its worker function here at startup.
export function initDispatchQueue(processorFn) {
  processor = processorFn;

  if (!REDIS_URL) {
    console.log('Dispatch queue: in-process (set REDIS_URL to enable BullMQ)');
    return;
  }

  // Lazy import keeps bullmq/ioredis out of the hot path when Redis is unused.
  (async () => {
    try {
      const { Queue, Worker } = await import('bullmq');
      const connection = { url: REDIS_URL };
      queue = new Queue('dispatch', { connection });
      new Worker('dispatch', async (job) => { await processor?.(job.data); }, { connection });
      console.log('Dispatch queue: BullMQ ready');
    } catch (err) {
      console.error('BullMQ init failed, falling back to in-process:', err?.message);
      queue = null;
    }
  })();
}

// Schedule a delayed dispatch retry for a booking.
export async function enqueueDispatchRetry(bookingId, attempt) {
  if (queue) {
    await queue.add('retry', { bookingId, attempt }, { delay: RETRY_MS, removeOnComplete: true, removeOnFail: true });
    return;
  }
  const timer = setTimeout(() => { processor?.({ bookingId, attempt }); }, RETRY_MS);
  timer.unref?.();
}
