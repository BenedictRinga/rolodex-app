import { Injectable } from '@angular/core';
import type { CloudProvider, EncryptedBundle } from './sync.types';

// ---------------------------------------------------------------------------
// OneDrive provider — stores the Rolodex bundle in the user's OneDrive
// App Root folder (hidden from normal file browsing). Uses Microsoft
// Graph API via MSAL for auth.
//
// Setup: Register an app at https://portal.azure.com
//   - Go to "App registrations" > New registration
//   - Set redirect URI for your app (e.g. http://localhost for dev)
//   - Under "API Permissions" add Files.ReadWrite.AppFolder
//   - Copy the Application (client) ID below
// ---------------------------------------------------------------------------

const CLIENT_ID = 'REPLACE_WITH_YOUR_ONEDRIVE_CLIENT_ID';
const FILE_NAME = 'rolodex-bundle.enc';

@Injectable({
  providedIn: 'root',
})
export class OneDriveProvider implements CloudProvider {
  readonly name = 'onedrive';
  readonly displayName = 'OneDrive';
  private accessToken: string | null = null;

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  async authorize(): Promise<void> {
    // OneDrive / Microsoft Graph uses MSAL.js for auth.
    // In a Capacitor app, use the Browser plugin for the redirect flow.
    // This stub shows the integration pattern — replace with real SDK call.
    return new Promise((_resolve, reject) => {
      // Real implementation would use:
      //   import { PublicClientApplication } from '@azure/msal-browser';
      //   const msal = new PublicClientApplication({
      //     auth: { clientId: CLIENT_ID, redirectUri }
      //   });
      //   const result = await msal.loginPopup({
      //     scopes: ['Files.ReadWrite.AppFolder']
      //   });
      //   this.accessToken = result.accessToken;

      // Placeholder until MSAL is integrated
      reject(new Error(
        'OneDrive sync is not yet available. ' +
        'To enable it, add MSAL (`npm install @azure/msal-browser`) ' +
        'and configure your Client ID in onedrive.provider.ts.'
      ));
    });
  }

  async disconnect(): Promise<void> {
    // Sign out from MSAL
    this.accessToken = null;
  }

  async push(_bundle: EncryptedBundle): Promise<void> {
    // Real: PUT https://graph.microsoft.com/v1.0/me/drive/special/approot:/${FILE_NAME}:/content
    throw new Error('OneDrive provider not yet configured.');
  }

  async pull(): Promise<EncryptedBundle | null> {
    // Real: GET https://graph.microsoft.com/v1.0/me/drive/special/approot:/${FILE_NAME}:/content
    // If 404, return null
    throw new Error('OneDrive provider not yet configured.');
  }

  async getLastModified(): Promise<Date | null> {
    // Real: GET https://graph.microsoft.com/v1.0/me/drive/special/approot:/${FILE_NAME}
    throw new Error('OneDrive provider not yet configured.');
  }
}
