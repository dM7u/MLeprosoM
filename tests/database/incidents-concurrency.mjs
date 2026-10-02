import {runHistoryConcurrency} from './history-concurrency.mjs';
await runHistoryConcurrency('incidents',process.argv[2]);
