import { Injectable } from '@angular/core';
import type { CloudProvider, EncryptedBundle } from './sync.types';

// ---------------------------------------------------------------------------
// Google Drive provider — stores the Rolodex bundle in the appDataFolder
// (hidden from the user's normal Drive view). Uses the Google Identity
// Services library (gapi) for auth and Drive REST API v3 for file ops.
// ---------------------------------------------------------------------------

const CLIENT_ID = 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID';
const API_KEY = 'REPLACE_WITH_YOUR_GOOGLE_API_KEY';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'rolodex-bundle.enc';
const MIME_TYPE = 'application/octet-stream';

declare const gapi: any;
declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveProvider implements CloudProvider {
  readonly name = 'google-drive';
  readonly displayName = 'Google Drive';
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private gapiLoaded = false;

  /** Must be called once before any other method. Loads the gapi library. */
  async init(): Promise<void> {
    if (this.gapiLoaded) return;

    return new Promise((resolve, reject) => {
      // Load gapi script dynamically
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            this.gapiLoaded = true;
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async authorize(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            this.accessToken = response.access_token;
            resolve();
          }
        },
      });

      // Respect user's "granted" state
      if (this.accessToken) {
        resolve();
      } else {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.accessToken) {
      try {
        google.accounts.oauth2.revoke(this.accessToken);
      } catch {
        // revoke is best-effort
      }
    }
    this.accessToken = null;
    this.tokenClient = null;
  }

  async push(bundle: EncryptedBundle): Promise<void> {
    await this.ensureAuth();

    // Check if file already exists
    const fileId = await this.findExistingFile();

    const metadata = {
      name: FILE_NAME,
      mimeType: MIME_TYPE,
      parents: ['appDataFolder'],
    };

    const boundary = 'rolodex_boundary_' + Math.random().toString(36).slice(2);
    const body = this.buildMultipartBody(boundary, metadata, JSON.stringify(bundle));

    if (fileId) {
      // Update existing file
      await gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
        body,
      });
    } else {
      // Create new file
      await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
        body,
      });
    }
  }

  async pull(): Promise<EncryptedBundle | null> {
    await this.ensureAuth();

    const fileId = await this.findExistingFile();
    if (!fileId) return null;

    const response = await gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });

    return JSON.parse(response.body) as EncryptedBundle;
  }

  async getLastModified(): Promise<Date | null> {
    await this.ensureAuth();

    const fileId = await this.findExistingFile();
    if (!fileId) return null;

    const response = await gapi.client.drive.files.get({
      fileId,
      fields: 'modifiedTime',
    });

    return response.result.modifiedTime
      ? new Date(response.result.modifiedTime)
      : null;
  }

  // ---- private helpers -----------------------------------------------------

  private async ensureAuth(): Promise<void> {
    if (!this.accessToken) {
      await this.authorize();
    }
  }

  private async findExistingFile(): Promise<string | null> {
    try {
      const response = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        q: `name = '${FILE_NAME}'`,
        fields: 'files(id)',
      });
      const files = response.result.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch {
      return null;
    }
  }

  private buildMultipartBody(
    boundary: string,
    metadata: Record<string, unknown>,
    content: string,
  ): string {
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push('Content-Type: application/json; charset=UTF-8');
    parts.push('');
    parts.push(JSON.stringify(metadata));
    parts.push(`--${boundary}`);
    parts.push('Content-Type: application/octet-stream');
    parts.push('');
    parts.push(content);
    parts.push(`--${boundary}--`);
    return parts.join('\r\n');
  }
}
