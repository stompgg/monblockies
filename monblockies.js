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

  // ── Palettes (packed) ──────────────────────────────────────────────────────
  var _pN = 'Scarlet Ember Tangerine Inferno Canary Blight Chartreuse Violet Peach Blush Spring Sapphire Honey Depths Frost Abyss Indigo Turquoise Void Maroon Orchid Teal Coral Azure Crimson Fern Forest Wine Rust Iron Dusk Lichen Peat Slate Tallow Jade Foam Olive Lavender Bronze Rose Ash Pitch Obsidian Steel Cobalt Ivory Snow'.split(' ');
  // 36 hex chars per palette: bg(6) + outline(6) + body(6) + hi(6) + eye(6) + mark(6)
  var _pH = '0c0404f04848d01010ff3030a0ffe08008080c0604e07050d03808ff6030a0fff0901c04'
    + '0c0804e8b030c09010f8c82890c0ff7850100c0804e0a048d87000ffb020a0ffff904800'
    + '0c0c04e0e040c8c000f8f020a0c8ff7870000a0a04c8d048889000c8e010a0d8ff505800'
    + '080c0480e83858c01890f048d0a0ff30701008040c9858e06828c0a868f0d8ffa0401080'
    + '0c0806e8a878c87848f8b888a0e8ff8048300c0408e86088c83060f87898a0ffd0802040'
    + '060c0868f89838d87080ffa8ffc0e828a05004040a4090e01068c058a8f0f8c8a0084880'
    + '0c0a04d8b848a88818f0d050a0c8ff68501002060828889808586838a0b0f0b8c8023848'
    + '060a1078c8f840a0e090d8fffff0c02080c00203083048a00c28702040a8d0c8a0041040'
    + '0305104840b82018a03830d0e0f0a0100860040a0a40c8c808a0a050e8e8f8c0a0046060'
    + '06030a6038a03810705828a8c8f0a02008500a0404a85858802828c86868a0f0e0501818'
    + '0a040ad040d0a010a8d030d8c0ffc0600868040c0830d09810a87048e8a8ffa0c0086040'
    + '0c0608f888c0e048a0ffa0d0c0ffd0a8287804080c28a8e00878b840c0f8ffd0a0044068'
    + '080303a03848801020c02838a0e8d0500010080c0498e85070c028b0f860c0a0ff488010'
    + '030804308048185028409858f8c0d80c3018080306904068602040a85078c0f8d8401028'
    + '0a0705c07e598f4114d2692dbef4ec59290d05080a6a98af395a6a668899f4bec7243842'
    + '09060a9c6cac6e467c9a78a5e6f4be4c3055070a0585b861486a2f759d58c2bef42b3f1c'
    + '090608a5739557384d8d5e7dc7f4be32202c05070a6886b131445e5b718ff4c2be1c2736'
    + '0a0906aca26c766d42a19972bee2f44e492c050a0961b89e33715e5ca38ef4bee920463b'
    + '05090968a8a83a787868a0a0f4c8c820484808080aa0a868707840b8c078c8b8f8484820'
    + '08050a8c68b17a53a2a895bbf4f4be5c3e790a0806a08058705030b89068b8e8f0483020'
    + '0a0608c89098986070d8a0a8c0f0d8684048080808989898505050787878e0e0e0303030'
    + '040606708888283838486060a0f0e8141c1c0404106878b81c285838488090b0ff101830'
    + '06080a7090a84a60708aacb8f8d8c030404804040c4878e81850c85890f8f8e0a00c3080'
    + '0c0c0ab0b098c8c8a8e8e8d880c8ff909078080a0cc8d8e8a8c0d8e0f0fff8d8987898b0';
  var _pK = ['bg','outline','body','hi','eye','mark'];
  var PALETTES = new Array(_pN.length);
  for (var _i = 0, _o = 0; _i < _pN.length; _i++, _o += 36) {
    var _p = { name: _pN[_i], _rgb: new Array(7) };
    for (var _j = 0; _j < 6; _j++) {
      var _h = _pH.substr(_o + _j * 6, 6);
      var _v = parseInt(_h, 16);
      _p[_pK[_j]] = '#' + _h;
      _p._rgb[_j] = [(_v >> 16) & 0xff, (_v >> 8) & 0xff, _v & 0xff];
    }
    _p._rgb[6] = [255, 255, 255];
    PALETTES[_i] = _p;
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
    // Always consume rng() for palette to keep silhouette consistent
    var palRng = rng();
    var pal = (paletteIdx != null)
      ? PALETTES[paletteIdx]
      : PALETTES[Math.floor(palRng * PALETTES.length)];
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
