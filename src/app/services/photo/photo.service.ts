import { Injectable } from '@angular/core';

/**
 * 2026-08-17 PHOTO PICKER — a tiny shared helper.
 * A hidden file input (accept="image/*") → FileReader → a base64 data URL.
 * Works on the web PWA (mobile browsers surface the camera/gallery chooser)
 * and in the Capacitor WebView. The data URL is small enough to persist
 * inside the contact model's existing image.base64String field or the
 * profile store.
 */
@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  pick(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = () => {
        const file = input.files?.[0];
        document.body.removeChild(input);
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => {
        document.body.removeChild(input);
        resolve(null);
      };
      input.click();
    });
  }
}
