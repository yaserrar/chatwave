// Iconsax is the only icon set used in Chatwave, and the design system uses the
// "Bulk" variant everywhere, drawn in `currentColor`.
//
// iconsax-react declares its defaults through `Component.defaultProps`
// (`variant: 'Linear'`, `color: 'currentColor'`). React 19 ignores
// `defaultProps` on function/forwardRef components, so without this patch an
// icon rendered as `<Home2 />` gets `variant` and `color` = undefined, falls
// back to the Linear variant and draws with no stroke — it is invisible.
//
// This postinstall step therefore:
//   1. injects real default values into each icon's render function
//      (variant 'Bulk', color 'currentColor', size '24'), which is what React 19
//      actually uses, and
//   2. flips the legacy `defaultProps` to Bulk as well (harmless, documents intent).
// Passing an explicit `variant`, `color` or `size` still works everywhere.
//
// npm workspaces usually hoist iconsax-react to the root node_modules, but it can
// land in apps/web/node_modules when versions conflict, so both are checked.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const roots = [
  join(repo, 'node_modules', 'iconsax-react', 'dist'),
  
].filter((dir) => existsSync(dir));

const destructure = /var variant = (_ref\d*)\.variant,(\s*)color = \1\.color,(\s*)size = \1\.size,/g;

let patched = 0;
for (const root of roots) {
  for (const dir of ['esm', 'cjs']) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const file of readdirSync(full)) {
      if (!file.endsWith('.js')) continue;
      const path = join(full, file);
      const src = readFileSync(path, 'utf8');
      const next = src
        .replace(/defaultProps = \{\s*variant: 'Linear'/g, "defaultProps = {\n  variant: 'Bulk'")
        .replace(
          destructure,
          (_m, ref, s1, s2) =>
            `var variant = ${ref}.variant === undefined ? 'Bulk' : ${ref}.variant,${s1}color = ${ref}.color === undefined ? 'currentColor' : ${ref}.color,${s2}size = ${ref}.size === undefined ? '24' : ${ref}.size,`,
        );
      if (next !== src) {
        writeFileSync(path, next);
        patched++;
      }
    }
  }
}
console.log(`[patch-iconsax] Bulk + currentColor defaults applied to ${patched} files in ${roots.length} location(s)`);
