// This file provides TypeScript definitions for the Google API client and Picker API,
// which are loaded from external scripts at runtime.

// FIX: Add gapi namespace for gapi.load to be available globally
declare namespace gapi {
  function load(name: string, callback: () => void): void;
}

declare namespace google.picker {
  class PickerBuilder {
    constructor();
    setAppId(appId: string): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setApiKey(key: string): PickerBuilder;
    addView(viewOrId: any): PickerBuilder;
    setCallback(callback: (response: ResponseObject) => void): PickerBuilder;
    build(): Picker;
  }

  class Picker {
    setVisible(visible: boolean): void;
  }

  class View {
    constructor(viewId: ViewId);
    setMimeTypes(mimeTypes: string): View;
  }

  enum ViewId {
    DOCS = 'docs',
    DOCS_IMAGES = 'docs-images',
    DOCS_IMAGES_AND_VIDEOS = 'docs-images-and-videos',
    DOCS_VIDEOS = 'docs-videos',
    DOCUMENTS = 'documents',
    DRAWINGS = 'drawings',
    FOLDERS = 'folders',
    FORMS = 'forms',
    IMAGE_SEARCH = 'image-search',
    MAPS = 'maps',
    PDFS = 'pdfs',
    PHOTOS = 'photos',
    PHOTO_ALBUMS = 'photo-albums',
    PRESENTATIONS = 'presentations',
    RECENTLY_PICKED = 'recently-picked',
    SPREADSHEETS = 'spreadsheets',
    VIDEO_SEARCH = 'video-search',
    WEBCAM = 'webcam',
    YOUTUBE = 'youtube',
    // FIX: Added DOCS_UPLOAD to the ViewId enum and removed the malformed enum below.
    DOCS_UPLOAD = 'docs-upload',
  }
  
  class DocsUploadView {}

  enum Action {
    CANCEL = 'cancel',
    PICKED = 'picked',
  }

  interface ResponseObject {
    action: Action;
    docs: DocumentObject[];
  }

  interface DocumentObject {
    id: string;
    name: string;
    mimeType: string;
    // ... other properties
  }
}

declare namespace gapi.client {
  function load(
    name: 'drive',
    version: 'v3',
    callback: () => void
  ): void;

  const drive: any; // Simplified type for GAPI drive client
}


declare namespace google.accounts.oauth2 {
    function initTokenClient(config: TokenClientConfig): TokenClient;

    interface TokenClient {
        requestAccessToken: (overrideConfig?: object) => void;
    }

    interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
    }
    
    interface TokenResponse {
        access_token: string;
        error?: string;
    }
}
