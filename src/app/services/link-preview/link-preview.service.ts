import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface LinkPreview {
  url: string;
  host: string;
  title: string;
  image: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  async fetchPreview(url: string): Promise<LinkPreview> {
    try {
      const res = await fetch(`${environment.rolodexApiBase}/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('preview failed');
      const data = await res.json();
      return {
        url: String(data?.url || url),
        host: String(data?.host || ''),
        title: String(data?.title || ''),
        image: String(data?.image || ''),
        description: String(data?.description || ''),
      };
    } catch {
      return { url, host: '', title: '', image: '', description: '' };
    }
  }
}
