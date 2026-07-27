// Test-only helper. The app's source files use ESM `import`/`export`
// syntax and are normally transpiled by Metro/Babel at build time. Plain
// Node can't `require()` them as-is, so this hook transpiles them to
// CommonJS on demand (via the TypeScript compiler, same technique already
// used by scripts/validate-source.cjs) purely for running unit tests.
//
// Usage: node -r ./tests/register.cjs --test tests/*.test.js
const Module = require("node:module");
const fs = require("node:fs");
const ts = require("typescript");

const originalJsLoader = Module._extensions[".js"];

Module._extensions[".js"] = function transpilingLoader(module, filename) {
  const source = fs.readFileSync(filename, "utf8");

  if (!/\bimport\s|\bexport\s/.test(source)) {
    return originalJsLoader(module, filename);
  }

  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });

  module._compile(outputText, filename);
};
