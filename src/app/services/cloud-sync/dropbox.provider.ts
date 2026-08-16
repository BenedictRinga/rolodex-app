import { Injectable } from '@angular/core';
import type { CloudProvider, EncryptedBundle } from './sync.types';

// ---------------------------------------------------------------------------
// Dropbox provider — stores the Rolodex bundle in the user's Dropbox
// app folder. Uses the Dropbox JavaScript SDK for OAuth and file ops.
//
// Setup: Register a Dropbox app at https://www.dropbox.com/developers
//   - Choose "Scoped access" + "App folder" permission
//   - Add redirect URI for your domain
//   - Copy the App Key below
// ---------------------------------------------------------------------------

const APP_KEY = 'REPLACE_WITH_YOUR_DROPBOX_APP_KEY';
const FILE_NAME = 'rolodex-bundle.enc';

@Injectable({
  providedIn: 'root',
})
export class DropboxProvider implements CloudProvider {
  readonly name = 'dropbox';
  readonly displayName = 'Dropbox';
  private dbx: any = null;
  private accessToken: string | null = null;

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async authorize(): Promise<void> {
    // Dropbox OAuth uses a popup redirect flow.
    // In a Capacitor app, the Browser plugin handles the redirect.
    // This stub shows the integration pattern — replace with real SDK call.
    return new Promise((resolve, reject) => {
      try {
        // Real implementation would use:
        //   import { Dropbox } from 'dropbox';
        //   const dbx = new Dropbox({ clientId: APP_KEY });
        //   const authUrl = await dbx.auth.getAuthenticationUrl(redirectUri);
        //   ... open browser / Capacitor Browser plugin ...
        //   ... handle code callback, exchange for token ...

        // Placeholder until Dropbox SDK is integrated
        reject(new Error(
          'Dropbox sync is not yet available. ' +
          'To enable it, add the Dropbox SDK (`npm install dropbox`) ' +
          'and configure your App Key in dropbox.provider.ts.'
        ));
      } catch (err) {
        reject(err);
      }
    });
  }

  async disconnect(): Promise<void> {
    // Revoke token via Dropbox API: POST https://api.dropboxapi.com/2/auth/token/revoke
    this.accessToken = null;
    this.dbx = null;
  }

  async push(_bundle: EncryptedBundle): Promise<void> {
    // Real: dbx.filesUpload({ path: `/${FILE_NAME}`, contents, mode: 'overwrite' })
    throw new Error('Dropbox provider not yet configured.');
  }

  async pull(): Promise<EncryptedBundle | null> {
    // Real: dbx.filesDownload({ path: `/${FILE_NAME}` })
    throw new Error('Dropbox provider not yet configured.');
  }

  async getLastModified(): Promise<Date | null> {
    // Real: dbx.filesGetMetadata({ path: `/${FILE_NAME}` })
    throw new Error('Dropbox provider not yet configured.');
  }
}
