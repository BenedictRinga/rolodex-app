import { Component, Input, OnInit } from '@angular/core';
import { LinkPreviewService, LinkPreview } from '../../services/link-preview/link-preview.service';

@Component({
  selector: 'app-link-preview',
  template: `
    <div class="link-preview" *ngIf="preview && (preview.title || preview.host)">
      <img *ngIf="preview.image" [src]="preview.image" alt="" class="link-preview-img" (error)="preview.image = ''" />
      <div class="link-preview-body">
        <div class="link-preview-host">{{ preview.host }}</div>
        <div class="link-preview-title">{{ preview.title }}</div>
        <div class="link-preview-desc" *ngIf="preview.description">{{ preview.description }}</div>
      </div>
    </div>
  `,
  styles: [
    `.link-preview { display: flex; gap: 10px; background: var(--rolodex-surface); border: 1px solid var(--rolodex-border-light); border-radius: 12px; padding: 8px; margin: 6px 10px 0; }`,
    `.link-preview-img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; }`,
    `.link-preview-body { min-width: 0; }`,
    `.link-preview-host { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--rolodex-text-tertiary); }`,
    `.link-preview-title { font-size: 13px; font-weight: 600; color: var(--rolodex-text); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }`,
    `.link-preview-desc { font-size: 11px; color: var(--rolodex-text-secondary); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }`,
  ],
})
export class LinkPreviewComponent implements OnInit {
  @Input() url = '';
  preview: LinkPreview | null = null;

  constructor(private readonly linkPreview: LinkPreviewService) {}

  async ngOnInit(): Promise<void> {
    if (!this.url) return;
    this.preview = await this.linkPreview.fetchPreview(this.url);
  }
}
