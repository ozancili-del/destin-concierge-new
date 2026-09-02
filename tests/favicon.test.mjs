import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("every Destin page receives the square brand favicon from the document head", async () => {
  const documentSource = await readFile(new URL("../pages/_document.js", import.meta.url), "utf8");
  const logo = await readFile(new URL("../public/favicon-512.png", import.meta.url));
  assert.match(documentSource, /rel="icon" href="\/favicon-512\.png" type="image\/png" sizes="512x512"/);
  assert.match(documentSource, /rel="apple-touch-icon" href="\/favicon-512\.png"/);
  assert.equal(logo.readUInt32BE(16), 512);
  assert.equal(logo.readUInt32BE(20), 512);
});
