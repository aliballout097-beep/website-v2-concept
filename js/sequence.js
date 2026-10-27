/* =========================================================
   FrameSequence — film-smooth image sequence on <canvas>
   - fractional frame position: blends frame N and N+1, so even
     slow scrolling looks like a real video (no stepping)
   - virtual camera (scale / x / y) for dolly & push-in moves
   - progressive loading: keyframes first, then fills the gaps
   - renders on the GSAP ticker, only when something changed
   ========================================================= */
(function () {
  class FrameSequence {
    constructor({ canvas, count, src, bg = '#0b0a06', fit = 'cover' }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.count = count;
      this.src = src;
      this.bg = bg;
      this.fit = fit;
      this.frames = new Array(count);
      this.loaded = new Uint8Array(count);
      this.pos = 0;                                  // fractional frame index
      this.view = { scale: 1, x: 0, y: 0 };
      this.dirty = true;
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize, { passive: true });
      this.resize();
      gsap.ticker.add(() => this.dirty && this.render());
    }

    order() {
      const seen = new Set(), out = [];
      for (const step of [this.count, 16, 8, 4, 2, 1])
        for (let i = 0; i < this.count; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
      return out;
    }

    load(onProgress, concurrency = 6) {
      const queue = this.order();
      let done = 0;
      return new Promise((resolve) => {
        const next = () => {
          if (!queue.length) return;
          const i = queue.shift(), img = new Image();
          img.decoding = 'async';
          img.onload = img.onerror = () => {
            if (img.naturalWidth) { this.frames[i] = img; this.loaded[i] = 1; this.dirty = true; }
            done++;
            onProgress && onProgress(done / this.count);
            if (done === this.count) resolve();
            next();
          };
          img.src = this.src(i);
        };
        for (let c = 0; c < concurrency; c++) next();
      });
    }

    nearest(i) {
      if (this.loaded[i]) return i;
      for (let d = 1; d < this.count; d++) {
        if (i - d >= 0 && this.loaded[i - d]) return i - d;
        if (i + d < this.count && this.loaded[i + d]) return i + d;
      }
      return -1;
    }

    setProgress(p) {
      const pos = Math.min(1, Math.max(0, p)) * (this.count - 1);
      if (pos !== this.pos) { this.pos = pos; this.dirty = true; }
    }
    setView(v) { Object.assign(this.view, v); this.dirty = true; }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
      this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
      this.dirty = true;
    }

    drawFrame(img, alpha) {
      const c = this.canvas, v = this.view;
      const s = Math[this.fit === 'cover' ? 'max' : 'min'](c.width / img.naturalWidth, c.height / img.naturalHeight) * v.scale;
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(img, (c.width - w) / 2 + v.x * c.width, (c.height - h) / 2 + v.y * c.height, w, h);
    }

    render() {
      this.dirty = false;
      const i0 = Math.floor(this.pos), f = this.pos - i0;
      const a = this.nearest(i0);
      if (a < 0) return;
      const ctx = this.ctx, c = this.canvas;
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, c.width, c.height);
      this.drawFrame(this.frames[a], 1);
      // blend toward the next frame → motion looks continuous, like video
      const b = i0 + 1;
      if (f > 0.02 && b < this.count && this.loaded[b] && a === i0) this.drawFrame(this.frames[b], f);
      ctx.globalAlpha = 1;
    }
  }
  window.FrameSequence = FrameSequence;
})();
