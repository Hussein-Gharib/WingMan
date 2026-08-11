// Registers the test-only loader hooks before any test module is imported.
// Used via: node --test --import ./test/setup.mjs
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
