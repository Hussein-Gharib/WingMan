// Test-only module resolution hook.
//
// `server-only` is a marker package provided by the Next.js bundler; it is not
// resolvable under a plain `node --test` run. These unit tests exercise pure
// logic from server modules, so we stub `server-only` with an empty module.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: 'data:text/javascript,export{}', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
