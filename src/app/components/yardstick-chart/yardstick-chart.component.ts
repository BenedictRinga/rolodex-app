import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';

/**
 * 2026-09-14 BUILD 196 THE LIVE YARDSTICK (founder: the Yardstick section's
 * static concept curve must "catch and reflect actual stats", with a dynamic
 * graph + pinch, expandable to the Command Center — like Zyppar's
 * CommandCenter retention chart). A dependency-free SVG line/area chart,
 * ported from that pattern:
 *  - geometry: fixed viewBox (720x220), pads, x by day-index, y scaled to the
 *    series max (rounded up to a nice grid);
 *  - zoom: pinch + ± controls + "latest →" jump, the SVG scaling inside a
 *    horizontally-scrolling wrapper (touch-action pan-x pan-y), with the
 *    point UNDER THE FINGERS anchored during the pinch and the CENTER
 *    anchored on ± steps (verbatim from the Zyppar 2026-09-11 zoomscroll fix);
 *  - gridlines + day labels drawn as SVG primitives — no chart library.
 */
@Component({
  selector: 'app-yardstick-chart',
  templateUrl: './yardstick-chart.component.html',
  styleUrls: ['./yardstick-chart.component.scss'],
  standalone: false,
})
export class YardstickChartComponent implements OnChanges {
  /** The 14-day series: [{ day: '2026-09-14', count: n }, ...] */
  @Input() points: Array<{ day: string; count: number }> = [];
  /** Stroke color for the line. */
  @Input() color = '#00C853';
  /** Legend label. */
  @Input() seriesLabel = 'Opens';

  chartW = 720;
  chartH = 220;
  padL = 44;
  padR = 14;
  padT = 14;
  padB = 26;
  zoom = 1;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private pinchAnchorPx = 0;
  private pinchContentX = 0;
  private niceMax = 10;

  @ViewChild('ysWrap', { static: false }) ysWrap?: ElementRef<HTMLElement>;

  ngOnChanges(): void {
    // Round the max up to a comfortable grid ceiling.
    const max = Math.max(0, ...this.points.map((p) => Number(p.count) || 0));
    const step = max <= 10 ? 2 : max <= 40 ? 10 : max <= 100 ? 25 : max <= 400 ? 50 : 100;
    this.niceMax = Math.max(step, Math.ceil(max / step) * step);
  }

  private innerW(): number { return this.chartW - this.padL - this.padR; }
  private innerH(): number { return this.chartH - this.padT - this.padB; }

  private xAt(i: number): number {
    const n = Math.max(1, this.points.length - 1);
    return this.padL + (i / n) * this.innerW();
  }

  private yAt(v: number): number {
    const v2 = Math.min(this.niceMax, Math.max(0, Number(v) || 0));
    return this.padT + (1 - v2 / this.niceMax) * this.innerH();
  }

  linePath(): string {
    if (!this.points.length) return '';
    return this.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${this.xAt(i).toFixed(1)},${this.yAt(p.count).toFixed(1)}`)
      .join(' ');
  }

  areaPath(): string {
    if (!this.points.length) return '';
    const pts = this.points.map((p, i) => `${this.xAt(i).toFixed(1)},${this.yAt(p.count).toFixed(1)}`);
    const base = this.yAt(0).toFixed(1);
    return `M${this.xAt(0).toFixed(1)},${base} L${pts.join(' L')} L${this.xAt(this.points.length - 1).toFixed(1)},${base} Z`;
  }

  /** Dots on each day (small fleet days must still be visible). */
  dotX(i: number): number { return this.xAt(i); }
  dotY(i: number): number { return this.yAt(this.points[i]?.count || 0); }

  /** Day labels — every other day when zoomed out, all when zoomed. */
  dayLabels(): Array<{ x: number; label: string }> {
    const every = this.zoom >= 2 ? 1 : 2;
    return this.points
      .map((p, i) => ({ x: this.xAt(i), label: (p.day || '').slice(5), i }))
      .filter((l) => l.i % every === 0 || l.i === this.points.length - 1);
  }

  gridYs(): Array<{ y: number; label: string }> {
    return [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = Math.round(this.niceMax * f);
      return { y: this.yAt(v), label: String(v) };
    });
  }

  // ── zoom: ported verbatim in spirit from Zyppar's 2026-09-11 zoomscroll ──
  zoomIn(): void {
    const prev = this.zoom;
    this.zoom = Math.min(3, Math.round((this.zoom + 0.25) * 100) / 100);
    if (this.zoom !== prev) this.anchorCenter();
  }

  zoomOut(): void {
    const prev = this.zoom;
    this.zoom = Math.max(1, Math.round((this.zoom - 0.25) * 100) / 100);
    if (this.zoom !== prev) this.anchorCenter();
  }

  private anchorCenter(): void {
    const wrap = this.ysWrap?.nativeElement;
    if (!wrap) return;
    const frac = wrap.scrollWidth > 0 ? (wrap.scrollLeft + wrap.clientWidth / 2) / wrap.scrollWidth : 1;
    requestAnimationFrame(() => {
      const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
      wrap.scrollLeft = Math.max(0, Math.min(max, frac * wrap.scrollWidth - wrap.clientWidth / 2));
    });
  }

  scrollToLatest(): void {
    const wrap = this.ysWrap?.nativeElement;
    if (!wrap) return;
    requestAnimationFrame(() => wrap.scrollTo({ left: wrap.scrollWidth, behavior: 'smooth' }));
  }

  pinchStart(ev: TouchEvent): void {
    if (ev.touches && ev.touches.length === 2) {
      this.pinchStartDist = Math.hypot(
        ev.touches[0].clientX - ev.touches[1].clientX,
        ev.touches[0].clientY - ev.touches[1].clientY,
      );
      this.pinchStartZoom = this.zoom;
      const wrap = this.ysWrap?.nativeElement;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        this.pinchAnchorPx = (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - rect.left;
        this.pinchContentX = wrap.scrollLeft + this.pinchAnchorPx;
      }
    }
  }

  pinchMove(ev: TouchEvent): void {
    if (ev.touches && ev.touches.length === 2 && this.pinchStartDist > 0) {
      const dist = Math.hypot(
        ev.touches[0].clientX - ev.touches[1].clientX,
        ev.touches[0].clientY - ev.touches[1].clientY,
      );
      this.zoom = Math.min(3, Math.max(1, Math.round(this.pinchStartZoom * (dist / this.pinchStartDist) * 100) / 100));
      const wrap = this.ysWrap?.nativeElement;
      if (wrap) {
        const targetContentX = this.pinchContentX * (this.zoom / this.pinchStartZoom);
        requestAnimationFrame(() => {
          const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
          wrap.scrollLeft = Math.max(0, Math.min(max, targetContentX - this.pinchAnchorPx));
        });
      }
      ev.preventDefault(); // keep the pinch on the chart, not page scroll
    }
  }
}
