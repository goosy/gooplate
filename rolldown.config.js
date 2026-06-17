import pkg from './package.json' with { type: 'json' };
import { defineConfig } from 'rolldown';

export default defineConfig({
    input: 'src/index.js',
    output: [{
        file: pkg.exports["."].import,
        format: 'es',
    }, {
        file: pkg.exports["."].require,
        format: 'cjs',
    }],
    plugins: [],
    external: ['fs', 'path', 'net'],
});
