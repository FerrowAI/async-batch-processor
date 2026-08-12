export interface ProcessOptions {
  concurrency?: number;
  retry?: number;
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignalLike;
}

export interface AbortSignalLike {
  aborted: boolean;
}

export interface ItemResult<T, R> {
  item: T;
  result?: R;
  error?: Error;
  retries: number;
}

export class AsyncBatchProcessor {
  async process<T, R>(
    items: T[],
    worker: (item: T) => Promise<R>,
    options: ProcessOptions = {}
  ): Promise<ItemResult<T, R>[]> {
    const concurrency = options.concurrency ?? 1;
    const maxRetries = options.retry ?? 0;
    const results: ItemResult<T, R>[] = Array(items.length).fill(null);
    const signal = options.signal;

    let inFlight = 0;
    let nextIndex = 0;
    const queue: Promise<void>[] = [];

    const processItem = async (index: number, item: T) => {
      let lastError: Error | undefined;
      let retries = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted) throw new Error('Aborted');

        try {
          inFlight++;
          const result = await worker(item);
          inFlight--;
          results[index] = { item, result, retries: attempt };
          return;
        } catch (error) {
          inFlight--;
          lastError = error as Error;
          retries++;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 10 * Math.pow(2, attempt)));
          }
        }
      }

      results[index] = { item, error: lastError, retries: maxRetries };
    };

    const worker_ = async () => {
      while (nextIndex < items.length && !signal?.aborted) {
        const index = nextIndex++;
        const item = items[index];
        const task = processItem(index, item);
        queue.push(task);

        if (inFlight >= concurrency) {
          await Promise.race(queue);
          queue.splice(0, Math.max(0, queue.length - concurrency));
        }
      }
    };

    // Start worker pool
    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => worker_().catch(() => {}));

    await Promise.all(workers);
    await Promise.all(queue);
    options.onProgress?.(items.length, items.length);

    return results;
  }

  async mapLimit<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results = await this.process(items, worker, { concurrency });
    return results.map((r) => {
      if (r.error) throw r.error;
      return r.result as R;
    });
  }

  async forEachLimit<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>
  ): Promise<void> {
    await this.process(items, worker, { concurrency });
  }
}
