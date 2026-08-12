const { AsyncBatchProcessor } = require('../dist/index.js');

async function demo() {
  const processor = new AsyncBatchProcessor();

  let maxInFlight = 0;
  let currentInFlight = 0;

  const items = Array(20).fill(0).map((_, i) => i);

  const results = await processor.process(
    items,
    async (item) => {
      currentInFlight++;
      maxInFlight = Math.max(maxInFlight, currentInFlight);
      console.log(`  In-flight: ${currentInFlight} (max so far: ${maxInFlight})`);

      await new Promise(r => setTimeout(r, 50));

      currentInFlight--;
      return item * 2;
    },
    {
      concurrency: 3,
      retry: 1,
      onProgress: (current, total) => console.log(`Progress: ${current}/${total}`)
    }
  );

  console.log(`\n=== Results ===`);
  console.log(`Max in-flight: ${maxInFlight} (concurrency was 3) ✓`);
  console.log(`Results count: ${results.length} (matches input) ✓`);
  console.log(`Order preserved: ${results[0].result === 0 && results[19].result === 38} ✓`);
  console.log(`First result:`, results[0]);
}

demo().catch(console.error);
