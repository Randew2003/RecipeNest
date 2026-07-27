const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = [
  "app",
  "components",
  "constants",
  "hooks",
  "services",
  "utils",
  path.join("assets", "styles"),
];
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(directory, files = []) {
  const absoluteDirectory = path.join(projectRoot, directory);
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(relativePath, files);
    else if (extensions.has(path.extname(entry.name))) files.push(relativePath);
  }
  return files;
}

function resolveLocalImport(fromFile, specifier) {
  const base = path.resolve(projectRoot, path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...[".js", ".jsx", ".ts", ".tsx"].map((extension) => `${base}${extension}`),
    ...[".js", ".jsx", ".ts", ".tsx"].map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

const files = sourceRoots.flatMap((root) => walk(root));
const errors = [];
const importPattern = /import\s+(?:[^;]+?\s+from\s+)?["']([^"']+)["']/g;

for (const file of files) {
  const absolutePath = path.join(projectRoot, file);
  const source = fs.readFileSync(absolutePath, "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
    },
  });

  for (const diagnostic of result.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  }

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.startsWith(".") && !resolveLocalImport(file, specifier)) {
      errors.push(`${file}: missing local import ${specifier}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`RecipeNest source validation passed for ${files.length} files.`);
