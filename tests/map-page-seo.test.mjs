import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../pages/map.js", import.meta.url), "utf8");

test("map page targets Pelican Beach Resort map intent with one canonical URL", () => {
  assert.match(source, /<title>Pelican Beach Resort Map, Directions &amp; 3D Guide<\/title>/);
  assert.match(source, /<h1>Pelican Beach Resort map, directions and 3D guide\.<\/h1>/);
  assert.match(source, /<link rel="canonical" href=\{`\$\{liveSite\}\/map`\}/);
  assert.match(source, /"@type": "WebPage"/);
  assert.match(source, /mainEntity: \{ "@id": `\$\{liveSite\}\/map#map` \}/);
});

test("map page prominently links both independent MyPelicanBeach 3D tools", () => {
  assert.match(source, /https:\/\/www\.mypelicanbeach\.com\/pelican-beach-resort-interactive-map/);
  assert.match(source, /https:\/\/www\.mypelicanbeach\.com\/pelican-beach-resort-3d-condo-finder/);
  assert.match(source, /Pelican Beach Resort 3D Explorer/);
  assert.match(source, /Pelican Beach Resort 3D Condo Finder/);
  assert.match(source, /Interactive 3D resort map/);
  assert.match(source, /Interactive 3D condo finder/);
});
