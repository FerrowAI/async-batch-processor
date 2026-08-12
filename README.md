# async-batch-processor

Sliding-window async pool. Keeps exactly N items in flight, preserves result order, supports per-item retry with exponential backoff, abort signaling, and progress callbacks.

## Quickstart

```typescript
import { AsyncBatchProcessor } from 'async-batch-processor';

const processor = new AsyncBatchProcessor();

const items = Array(20).fill(0).map((_, i) => i);
const results = await processor.process(
  items,
  async (item) => {
    const res = await fetch(`https://api.example.com/item/${item}`);
    return res.json();
  },
  {
    concurrency: 3,
    retry: 2,
    onProgress: (current, total) => console.log(`${current}/${total}`)
  }
);

// results[0].item === 0, results[0].result === { ... }
// results[0].retries === 0 (or 1/2 if retried)
```

## API

### `process(items, worker, options?)`

Run worker on items with concurrency control.

**Options:**
- `concurrency` (default 1) — max in-flight count
- `retry` (default 0) — max retry attempts per item
- `onProgress` — callback(current, total)
- `signal` — abort-like { aborted: boolean }

**Returns:** ItemResult[] preserving input order

```typescript
interface ItemResult<T, R> {
  item: T;
  result?: R;
  error?: Error;
  retries: number;  // attempts made
}
```

### `mapLimit(items, concurrency, worker)`

Shorthand for `process()` returning results array. Throws on error.

```typescript
const results = await processor.mapLimit(items, 3, worker);
```

### `forEachLimit(items, concurrency, worker)`

Shorthand for side-effect processing.

```typescript
await processor.forEachLimit(items, 3, async (item) => {
  await save(item);
});
```

## Scope & Limits

- **Sliding window** — not chunk barriers; exactly N in flight at steady state
- **No persistence** — in-memory; failures not logged
- **Order preserved** — results array index matches items array
- **Retry is exponential backoff** — 10ms * 2^attempt
- **AbortSignal-like only** — not full AbortController
- **No timeout per item** — use Promise.race or external timeout

## License

MIT

---

Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/Ruzylo-cloud/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
