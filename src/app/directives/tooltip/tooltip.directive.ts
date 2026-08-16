import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
} from '@angular/core';

/**
 * A simple tooltip directive.
 *
 * Usage: <element appTooltip="Your tooltip text">
 *
 * On mouseenter a small absolute-positioned div is created next to the host
 * element. It is removed on mouseleave or click.
 */
@Directive({
  selector: '[appTooltip]',
})
export class TooltipDirective {
  @Input('appTooltip') tooltipText = '';

  private tooltipEl: HTMLElement | null = null;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.tooltipText || this.tooltipEl) {
      return;
    }

    this.tooltipEl = this.renderer.createElement('div');
    this.renderer.appendChild(
      this.tooltipEl,
      this.renderer.createText(this.tooltipText)
    );

    // Base styling
    this.renderer.setStyle(this.tooltipEl, 'position', 'absolute');
    this.renderer.setStyle(this.tooltipEl, 'z-index', '9999');
    this.renderer.setStyle(this.tooltipEl, 'background', 'rgba(0,0,0,0.85)');
    this.renderer.setStyle(this.tooltipEl, 'color', '#fff');
    this.renderer.setStyle(this.tooltipEl, 'padding', '6px 10px');
    this.renderer.setStyle(this.tooltipEl, 'border-radius', '4px');
    this.renderer.setStyle(this.tooltipEl, 'font-size', '13px');
    this.renderer.setStyle(this.tooltipEl, 'white-space', 'nowrap');
    this.renderer.setStyle(this.tooltipEl, 'pointer-events', 'none');

    // Position relative to the host
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const top = hostRect.bottom + window.scrollY + 4;
    const left = hostRect.left + window.scrollX + hostRect.width / 2;

    this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
    this.renderer.setStyle(this.tooltipEl, 'transform', 'translateX(-50%)');

    // Append to body so it isn't clipped by overflow
    this.renderer.appendChild(document.body, this.tooltipEl);
  }

  @HostListener('mouseleave')
  @HostListener('click')
  onLeaveOrClick(): void {
    this.destroyTooltip();
  }

  private destroyTooltip(): void {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
