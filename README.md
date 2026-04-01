# monblockies

Deterministic pixel-art mini monster avatar generator. Maps to a unique 16×16 creature with a consistent palette, silhouette, and eyes.

---

## Quick start

```html
<script src="monblockies.js"></script>
<script>
  var canvas = monblockies.createCanvas('0xdeadbeef', 64);
  document.body.appendChild(canvas);
</script>
```

---

## API

### `monblockies.createCanvas(addr, size?, paletteIdx?)`

Creates and returns a `<canvas>` element with the sprite already painted.

```js
// 64×64 canvas, palette auto-selected from the address
var canvas = monblockies.createCanvas('0xdeadbeef', 64);
document.getElementById('avatar').replaceWith(canvas);
```

| Parameter    | Type     | Default | Description |
|---|---|---|---|
| `addr`       | `string` | —       | Any string. Determines the creature shape and palette. |
| `size`       | `number` | `32`    | Output pixel size. The sprite is always generated at 16×16 and scaled up crisply. |
| `paletteIdx` | `number` | auto    | Force a specific palette (0–31). Omit to derive from `addr`. |

---

### `monblockies.render(canvas, addr, size?, paletteIdx?)`

Paints a sprite into an **existing** canvas element. Use this when you manage the canvas yourself (e.g. inside a component lifecycle).

```js
var canvas = document.getElementById('my-canvas');
monblockies.render(canvas, '0xdeadbeef', 64);
```

---

### `monblockies.toDataURL(addr, size?, paletteIdx?)`

Returns a PNG data URL. Useful for `<img src>`, saving to disk, or uploading.

```js
document.getElementById('avatar').src = monblockies.toDataURL('alice', 64);
```

---

### `monblockies.generate(addr, paletteIdx?)`

Returns raw sprite data without touching the DOM. Useful for server-side rendering with node-canvas, or pre-warming a cache.

```js
var sprite = monblockies.generate('0xdeadbeef');
// sprite.pixels  → Uint8Array of pixel types (16×16)
// sprite.pal     → palette object { bg, outline, body, hi, eye, mark, name }
// sprite.G       → grid size (always 16)
```

---

## Algorithm

Each address is hashed with a djb2-style XOR hash and fed into an XOR-shift RNG to determine:

1. **Palette** — one of 32 hand-crafted DS-era RPG palettes (16 saturated, 10 muted, 6 grayscale/special).
2. **Silhouette** — a 32-point polar radius profile, smoothed and optionally spiked (3–7 spikes, 55% of creatures).
3. **Body detail** — two independent 5×5 bilinear noise grids classify interior pixels as body, highlight, or marking.
4. **Contour** — any body pixel adjacent to the background becomes an outline pixel (cel-shade edge detection).
5. **Eyes** — placed on the widest interior row in the upper 62% of the sprite. 25% of creatures are cyclops; 75% have two eyes with a small random vertical drift. Each eye gets a 1-pixel specular shine.

---

## License

MIT
