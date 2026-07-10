import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'runner/index': 'src/runner/index.ts',
    'tracer/index': 'src/tracer/index.ts',
    'storage/index': 'src/storage/index.ts',
    'evaluator/index': 'src/evaluator/index.ts',
    'assertion/index': 'src/assertion/index.ts',
    'snapshot/index': 'src/snapshot/index.ts',
    'diff/index': 'src/diff/index.ts',
    'replay/index': 'src/replay/index.ts',
    'coverage/index': 'src/coverage/index.ts',
    'experiment/index': 'src/experiment/index.ts',
    'reporter/index': 'src/reporter/index.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
})
