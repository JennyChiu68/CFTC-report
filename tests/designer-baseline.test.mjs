import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";

const expected = JSON.parse(await readFile(new URL("./designer-baseline.json", import.meta.url), "utf8"));
const hash = value => createHash("sha256").update(value).digest("hex");
test("retains the designer's exact stylesheet, shell and all original assets", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url));
  const source = await readFile(new URL("../app/designer-shell.ts", import.meta.url), "utf8");
  const shell = JSON.parse(source.slice(source.indexOf("=") + 1).trim().slice(0, -1));
  assert.equal(hash(css), expected.css);
  assert.equal(hash(shell), expected.shell);
  for (const [name, digest] of Object.entries(expected.assets)) {
    assert.equal(hash(await readFile(new URL("../public/designer/assets/" + name, import.meta.url))), digest);
  }
  assert.match(shell, /操作已记录/);
  assert.match(shell, /小程序操作统一从底部唤起反馈/);
});
