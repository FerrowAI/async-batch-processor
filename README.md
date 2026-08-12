# Async Batch Processor

Process items in batches with concurrency control.

```javascript
const processor = new BatchProcessor({ batchSize: 10, concurrency: 2 });
await processor.process(items, async (batch) => {
  await Promise.all(batch.map(item => saveItem(item)));
});
```

Solves: Memory efficiency, rate limiting, batching overhead.
License: MIT
