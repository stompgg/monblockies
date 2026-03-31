/**
 * MonBlockies
 * Deterministic pixel-art avatar generator.
 *
 * Any string (wallet address, username, UUID…) maps to a unique
 * 16×16 creature with a consistent palette, silhouette, and eyes.
 *
 *
 * API:
 *   MonBlockies.generate(addr)           → SpriteData
 *   MonBlockies.render(canvas, addr, size)
 *   MonBlockies.toDataURL(addr, size)    → "data:image/png;base64,…"
 *   MonBlockies.PALETTES                 → array of palette objects
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();           // CommonJS / Node
  } else if (typeof define === 'function' && define.amd) {
    define(factory);                      // AMD
  } else {
    root.MonBlockies = factory();         // Browser global
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // ── Pixel type constants ─────────────────────────────────────────────────────
  var BG = 0, OUTLINE = 1, BODY = 2, HI = 3, EYE = 4, MARK = 5, EYE_SHINE = 6;

  // ── Palettes ──────────────────────────────────────────────────────────────────
  function hexToRgb(hex) {
    var v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  }

  var PALETTES = [
    // Saturated - evenly distributed around hue wheel
    { name:'Scarlet',  bg:'#0c0404', outline:'#f04848', body:'#d01010', hi:'#ff3030', eye:'#a0ffe0', mark:'#800808' },
    { name:'Ember',    bg:'#0c0604', outline:'#e07050', body:'#d03808', hi:'#ff6030', eye:'#a0fff0', mark:'#901c04' },
    { name:'Cinder',   bg:'#0c0604', outline:'#d07050', body:'#a83010', hi:'#e05028', eye:'#a0fff0', mark:'#601808' },
    { name:'Inferno',  bg:'#0c0804', outline:'#e0a048', body:'#d87000', hi:'#ffb020', eye:'#a0ffff', mark:'#904800' },
    { name:'Canary',   bg:'#0c0c04', outline:'#e0e040', body:'#c8c000', hi:'#f8f020', eye:'#a0c8ff', mark:'#787000' },
    { name:'Blight',   bg:'#0a0a04', outline:'#c8d048', body:'#889000', hi:'#c8e010', eye:'#a0d8ff', mark:'#505800' },
    { name:'Citrus',   bg:'#080c04', outline:'#b8e830', body:'#80c800', hi:'#a8f010', eye:'#b0a0ff', mark:'#508000' },
    { name:'Lime',     bg:'#080c04', outline:'#a8e040', body:'#70b800', hi:'#98e018', eye:'#c0a0ff', mark:'#487000' },
    { name:'Toxic',    bg:'#060c04', outline:'#60e048', body:'#30c010', hi:'#58f838', eye:'#d8b0ff', mark:'#1c7808' },
    { name:'Slime',    bg:'#040c04', outline:'#50d860', body:'#18a028', hi:'#48e050', eye:'#f0c0ff', mark:'#0c6010' },
    { name:'Spring',   bg:'#040c06', outline:'#40e070', body:'#10b848', hi:'#38f068', eye:'#ffa0e0', mark:'#087028' },
    { name:'Mint',     bg:'#040c08', outline:'#40e090', body:'#10c060', hi:'#30f080', eye:'#ffa0d0', mark:'#087838' },
    { name:'Lagoon',   bg:'#040c0a', outline:'#40d8b8', body:'#08a888', hi:'#28e0b8', eye:'#ffc0e0', mark:'#046050' },
    { name:'Depths',   bg:'#040a0c', outline:'#40c0d8', body:'#0890a8', hi:'#20c8e0', eye:'#ffc0d0', mark:'#045060' },
    { name:'Frost',    bg:'#040810', outline:'#50a0e0', body:'#1870c0', hi:'#50b0f0', eye:'#ffe0b0', mark:'#0c4080' },
    { name:'Abyss',    bg:'#040610', outline:'#5070e0', body:'#1040c0', hi:'#3060f0', eye:'#ffe0c0', mark:'#082070' },
    { name:'Indigo',   bg:'#040810', outline:'#6058e0', body:'#3028d0', hi:'#5048f8', eye:'#f0ffa0', mark:'#181080' },
    { name:'Grape',    bg:'#06040c', outline:'#7848e8', body:'#4818d8', hi:'#6838f8', eye:'#e8ffa0', mark:'#280898' },
    { name:'Void',     bg:'#08040c', outline:'#9050e0', body:'#5818c0', hi:'#8848f0', eye:'#f0ffc0', mark:'#380c80' },
    { name:'Miasma',   bg:'#08040c', outline:'#b048e0', body:'#8018c0', hi:'#a838f0', eye:'#e0ffb0', mark:'#500880' },
    { name:'Orchid',   bg:'#0a040a', outline:'#d040d0', body:'#a010a8', hi:'#d030d8', eye:'#c0ffc0', mark:'#600868' },
    { name:'Magma',    bg:'#0a0408', outline:'#d048c0', body:'#a01090', hi:'#e030c0', eye:'#c0ffa0', mark:'#600858' },
    { name:'Coral',    bg:'#0c040a', outline:'#e050a0', body:'#c01878', hi:'#f048a8', eye:'#c0ffc0', mark:'#800c50' },
    { name:'Rose',     bg:'#0c0408', outline:'#f05080', body:'#d82060', hi:'#f84888', eye:'#a0ffc0', mark:'#881038' },
    { name:'Crimson',  bg:'#0c0404', outline:'#e05060', body:'#c00020', hi:'#ff2040', eye:'#c0ffe0', mark:'#700010' },
    // Muted
    { name:'Rust',     bg:'#0a0705', outline:'#c07e59', body:'#8f4114', hi:'#d2692d', eye:'#bef4ec', mark:'#59290d' },
    { name:'Iron',     bg:'#05080a', outline:'#6a98af', body:'#395a6a', hi:'#668899', eye:'#f4bec7', mark:'#243842' },
    { name:'Dusk',     bg:'#09060a', outline:'#9c6cac', body:'#6e467c', hi:'#9a78a5', eye:'#e6f4be', mark:'#4c3055' },
    { name:'Lichen',   bg:'#070a05', outline:'#85b861', body:'#486a2f', hi:'#759d58', eye:'#c2bef4', mark:'#2b3f1c' },
    { name:'Peat',     bg:'#090608', outline:'#a57395', body:'#57384d', hi:'#8d5e7d', eye:'#c7f4be', mark:'#32202c' },
    { name:'Slate',    bg:'#05070a', outline:'#6886b1', body:'#31445e', hi:'#5b718f', eye:'#f4c2be', mark:'#1c2736' },
    { name:'Tallow',   bg:'#0a0906', outline:'#aca26c', body:'#766d42', hi:'#a19972', eye:'#bee2f4', mark:'#4e492c' },
    { name:'Jade',     bg:'#050a09', outline:'#61b89e', body:'#33715e', hi:'#5ca38e', eye:'#f4bee9', mark:'#20463b' },
    { name:'Foam',     bg:'#050909', outline:'#68a8a8', body:'#3a7878', hi:'#68a0a0', eye:'#f4c8c8', mark:'#204848' },
    { name:'Blossom',  bg:'#0c0608', outline:'#d88090', body:'#c05068', hi:'#e88898', eye:'#b0ffc8', mark:'#803040' },
    { name:'Lavender', bg:'#08050a', outline:'#8c68b1', body:'#7a53a2', hi:'#a895bb', eye:'#f4f4be', mark:'#5c3e79' },
    // Grayscale / near-white
    { name:'Ash',      bg:'#080808', outline:'#989898', body:'#505050', hi:'#787878', eye:'#e0e0e0', mark:'#303030' },
    { name:'Pitch',    bg:'#040606', outline:'#708888', body:'#283838', hi:'#486060', eye:'#a0f0e8', mark:'#141c1c' },
    { name:'Obsidian', bg:'#040410', outline:'#6878b8', body:'#1c2858', hi:'#384880', eye:'#90b0ff', mark:'#101830' },
    { name:'Sulfur',   bg:'#0c0c04', outline:'#d8d850', body:'#b8b800', hi:'#f0f018', eye:'#a0d0ff', mark:'#707000' },
    { name:'Amber',    bg:'#0c0804', outline:'#e0a050', body:'#d87800', hi:'#ffa830', eye:'#a0ffff', mark:'#905000' },
    { name:'Ivory',    bg:'#0c0c0a', outline:'#b0b098', body:'#c8c8a8', hi:'#e8e8d8', eye:'#80c8ff', mark:'#909078' },
  ];

  // Pre-parse RGB values for each palette (avoids hex parsing on every render)
  for (var pi = 0; pi < PALETTES.length; pi++) {
    var p = PALETTES[pi];
    p._rgb = [
      hexToRgb(p.bg), hexToRgb(p.outline), hexToRgb(p.body),
      hexToRgb(p.hi), hexToRgb(p.eye), hexToRgb(p.mark), [255, 255, 255]
    ];
  }

  // ── Hash & RNG ────────────────────────────────────────────────────────────────
  function hashStr(s) {
    var h = 0xdeadbeef;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function makeRng(addr) {
    var s = hashStr(addr);
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ── Noise ──────────────────────────────────────────────────────────────────────
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  // ── Sprite generation ─────────────────────────────────────────────────────────
  var _cache = new Map();
  var MAX_CACHE = 1000;

  /**
   * Generate (and cache) sprite data for the given address.
   * @param {string}      addr
   * @param {number|null} [paletteIdx]  Force a specific palette (0-31). Omit for auto.
   * @returns {{ pixels: Uint8Array, pal: object, G: number }}
   */
  function generate(addr, paletteIdx) {
    var key = addr + ':' + (paletteIdx == null ? 'auto' : paletteIdx);
    if (_cache.has(key)) return _cache.get(key);

    var G   = 16;
    var rng = makeRng(addr);
    var pal = (paletteIdx != null)
      ? PALETTES[paletteIdx]
      : PALETTES[Math.floor(rng() * PALETTES.length)];
    var cx  = (G - 1) / 2, cy = (G - 1) / 2;

    // Polar silhouette profile (typed arrays)
    var PROF = 32;
    var base = new Float32Array(PROF);
    for (var k = 0; k < PROF; k++) base[k] = rng();
    var smoothed = new Float32Array(PROF);
    for (k = 0; k < PROF; k++) {
      smoothed[k] = (base[(k-1+PROF)%PROF] + base[k]*2 + base[(k+1)%PROF]) / 4;
    }

    var spiky      = rng() > 0.45;
    var numSpikes  = spiky ? 3 + Math.floor(rng() * 5) : 0;
    var spikeAmp   = 0.25 + rng() * 0.35;
    var spikePhase = rng() * Math.PI * 2;
    var baseR      = (G / 2) * (0.78 + rng() * 0.16);
    var scaleX     = 0.75 + rng() * 0.40;
    var scaleY     = 0.85 + rng() * 0.30;
    var offX       = (rng() - 0.5) * G * 0.12;
    var offY       = (rng() - 0.5) * G * 0.10;

    // Pre-compute radius LUT — avoids per-pixel trig
    var ASTEPS = 256;
    var radiusLut = new Float32Array(ASTEPS);
    for (var a = 0; a < ASTEPS; a++) {
      var theta = (a / ASTEPS) * 2 * Math.PI - Math.PI;
      var t  = (((theta / (2*Math.PI)) % 1) + 1) % 1;
      var fi = t * PROF;
      var i0 = Math.floor(fi) % PROF, i1 = (i0+1) % PROF;
      var sf = smoothstep(fi - Math.floor(fi));
      var blob  = smoothed[i0]*(1-sf) + smoothed[i1]*sf;
      var spike = spiky ? Math.pow(Math.max(0, Math.cos(theta*numSpikes/2+spikePhase)), 3) : 0;
      radiusLut[a] = baseR * (0.72 + blob*0.28 + spike*spikeAmp);
    }

    // Detail + marking noise (typed arrays)
    var NW = 5, NH = 5;
    var detailGrid = new Float32Array(NW * NH);
    var markGrid = new Float32Array(NW * NH);
    for (var n = 0; n < NW*NH; n++) { detailGrid[n] = rng(); markGrid[n] = rng(); }
    var hiThresh    = 0.58 + rng() * 0.16;
    var markThresh  = 0.52 + rng() * 0.18;
    var hasMarkings = rng() > 0.40;

    // Noise-space LUTs (typed arrays)
    var gxLut = new Float32Array(G);
    var gyLut = new Float32Array(G);
    for (var lp = 0; lp < G; lp++) {
      gxLut[lp] = (lp / (G-1)) * (NW-1);
      gyLut[lp] = (lp / (G-1)) * (NH-1);
    }

    // Pre-compute 2D radius map to avoid per-pixel atan2
    var radiusSqMap = new Float32Array(G * G);
    for (var ry = 0; ry < G; ry++) {
      for (var rx = 0; rx < G; rx++) {
        var dx = (rx-cx-offX)/scaleX, dy = (ry-cy-offY)/scaleY;
        var th = Math.atan2(dy, dx);
        var ai = ((((th + Math.PI) / (2*Math.PI)) * ASTEPS) | 0) % ASTEPS;
        radiusSqMap[ry*G + rx] = radiusLut[ai] * radiusLut[ai];
      }
    }

    // Rasterise silhouette (with inlined bilinear)
    var raw = new Uint8Array(G * G);
    for (var y = 0; y < G; y++) {
      var gy = gyLut[y];
      var y0 = Math.min(Math.floor(gy), NH - 2);
      var fy = smoothstep(gy - y0);
      var y0w = y0 * NW, y1w = (y0 + 1) * NW;
      for (var x = 0; x < G; x++) {
        var dx = (x-cx-offX)/scaleX, dy = (y-cy-offY)/scaleY;
        var idx = y*G + x;
        if (dx*dx + dy*dy > radiusSqMap[idx]) continue;

        // Inlined bilinear for detailGrid
        var gx = gxLut[x];
        var x0 = Math.min(Math.floor(gx), NW - 2);
        var fx = smoothstep(gx - x0);
        var dv = detailGrid[y0w+x0]*(1-fx)*(1-fy) + detailGrid[y0w+x0+1]*fx*(1-fy)
               + detailGrid[y1w+x0]*(1-fx)*fy + detailGrid[y1w+x0+1]*fx*fy;

        if (hasMarkings) {
          // Inlined bilinear for markGrid
          var mv = markGrid[y0w+x0]*(1-fx)*(1-fy) + markGrid[y0w+x0+1]*fx*(1-fy)
                 + markGrid[y1w+x0]*(1-fx)*fy + markGrid[y1w+x0+1]*fx*fy;
          if (mv > markThresh) { raw[idx] = 3; continue; }
        }
        if (dv > hiThresh) { raw[idx] = 2; continue; }
        raw[idx] = 1;
      }
    }

    // Contour pass
    var pixels = new Uint8Array(G * G);
    for (var cy2 = 0; cy2 < G; cy2++) {
      for (var cx2 = 0; cx2 < G; cx2++) {
        var idx = cy2*G + cx2;
        if (raw[idx] === 0) continue;
        var edge = (cx2 > 0   && raw[idx-1] === 0)
                || (cx2 < G-1 && raw[idx+1] === 0)
                || (cy2 > 0   && raw[idx-G] === 0)
                || (cy2 < G-1 && raw[idx+G] === 0);
        if (edge)           { pixels[idx] = OUTLINE; continue; }
        if (raw[idx] === 3) { pixels[idx] = MARK;    continue; }
        if (raw[idx] === 2) { pixels[idx] = HI;      continue; }
        pixels[idx] = BODY;
      }
    }

    // Eye placement — widest interior row in upper 62%
    var eyeCount  = rng() < 0.25 ? 1 : 2;
    var topCut    = Math.floor(G * 0.62);
    var rowCounts = new Uint8Array(topCut);
    var rowFirst  = new Uint8Array(topCut);
    var rowLast   = new Uint8Array(topCut);
    for (var r = 0; r < topCut; r++) rowFirst[r] = 255;

    for (var ey = 1; ey < topCut; ey++) {
      for (var ex = 1; ex < G-1; ex++) {
        var v = pixels[ey*G + ex];
        if (v === BODY || v === HI || v === MARK) {
          rowCounts[ey]++;
          if (ex < rowFirst[ey]) rowFirst[ey] = ex;
          if (ex > rowLast[ey])  rowLast[ey]  = ex;
        }
      }
    }

    var bestRow = -1, bestCount = 0;
    for (var br = 1; br < topCut; br++) {
      if (rowCounts[br] > bestCount) { bestCount = rowCounts[br]; bestRow = br; }
    }

    if (bestRow > 0 && bestCount >= (eyeCount === 1 ? 1 : 3)) {
      var span    = rowLast[bestRow] - rowFirst[bestRow];
      var eyePxs  = eyeCount === 1
        ? [rowFirst[bestRow] + Math.floor(span / 2)]
        : [rowFirst[bestRow] + Math.floor(span * 0.28),
           rowFirst[bestRow] + Math.floor(span * 0.72)];
      var yDrift = eyeCount === 2 ? Math.floor(rng() * 3) - 1 : 0;

      for (var ei = 0; ei < eyePxs.length; ei++) {
        var epx = eyePxs[ei];
        var erow = Math.min(G-1, Math.max(0, bestRow + (ei === 1 ? yDrift : 0)));
        var eidx = erow*G + epx;
        if (pixels[eidx] >= BODY) {
          pixels[eidx] = EYE;
          var s1 = (erow > 0 && epx < G-1) ? (erow-1)*G + (epx+1) : -1;
          var s2 = (erow > 0)              ? (erow-1)*G + epx      : -1;
          if      (s1 >= 0 && pixels[s1] >= BODY) pixels[s1] = EYE_SHINE;
          else if (s2 >= 0 && pixels[s2] >= BODY) pixels[s2] = EYE_SHINE;
        }
      }
    }

    var result = { pixels: pixels, pal: pal, G: G };
    // LRU-style cache limit
    if (_cache.size >= MAX_CACHE) {
      _cache.delete(_cache.keys().next().value);
    }
    _cache.set(key, result);
    return result;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────
  // OffscreenCanvas fallback for Node.js / older browsers
  var createOffscreen = (typeof OffscreenCanvas !== 'undefined')
    ? function(w, h) { return new OffscreenCanvas(w, h); }
    : function(w, h) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
      };

  /**
   * Paint a sprite onto an existing canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {string}      addr
   * @param {number}      [size=32]       - Output size in pixels
   * @param {number|null} [paletteIdx]    - Force a specific palette
   * @param {boolean}     [transparent]   - Make background transparent
   */
  function render(canvas, addr, size, paletteIdx, transparent) {
    size = size || 32;
    var sprite = generate(addr, paletteIdx);
    var G      = sprite.G;
    canvas.width  = size;
    canvas.height = size;

    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(G, G);
    var dat = img.data;
    var cm  = sprite.pal._rgb; // Use pre-parsed RGB values

    for (var i = 0; i < sprite.pixels.length; i++) {
      var px  = sprite.pixels[i];
      var rgb = cm[px];
      var o   = i * 4;
      dat[o] = rgb[0]; dat[o+1] = rgb[1]; dat[o+2] = rgb[2];
      dat[o+3] = (transparent && px === BG) ? 0 : 255;
    }

    if (size === G) {
      ctx.putImageData(img, 0, 0);
    } else {
      var small = createOffscreen(G, G);
      var smallCtx = small.getContext('2d');
      smallCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, G, G, 0, 0, size, size);
    }
  }

  /**
   * Create a new <canvas>, render the sprite into it, and return it.
   * @param {string}      addr
   * @param {number}      [size=32]
   * @param {number|null} [paletteIdx]
   * @param {boolean}     [transparent]
   * @returns {HTMLCanvasElement}
   */
  function createCanvas(addr, size, paletteIdx, transparent) {
    var canvas = document.createElement('canvas');
    render(canvas, addr, size || 32, paletteIdx, transparent);
    return canvas;
  }

  /**
   * Render the sprite to a PNG data URL.
   * @param {string}      addr
   * @param {number}      [size=32]
   * @param {number|null} [paletteIdx]
   * @param {boolean}     [transparent]
   * @returns {string}
   */
  function toDataURL(addr, size, paletteIdx, transparent) {
    return createCanvas(addr, size, paletteIdx, transparent).toDataURL('image/png');
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  return {
    PALETTES:     PALETTES,
    generate:     generate,
    render:       render,
    createCanvas: createCanvas,
    toDataURL:    toDataURL,
    /** Seedable RNG — useful for generating deterministic lists of addresses */
    seedRng:      makeRng,
  };

}));
