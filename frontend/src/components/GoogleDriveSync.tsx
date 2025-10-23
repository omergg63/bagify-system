import React, { useState, useEffect, useCallback } from 'react';
import { GoogleIcon } from './Icons';
import { Spinner } from './Spinner';

interface GoogleDriveSyncProps {
  onProcess: (files: File[]) => void;
  isProcessing: boolean;
}

// These environment variables must be set for this feature to work.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ onProcess, isProcessing }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  let tokenClient: google.accounts.oauth2.TokenClient | null = null;
  
  const pickerCallback = useCallback(async (data: google.picker.ResponseObject, accessToken: string) => {
    if (data.action === google.picker.Action.CANCEL) {
        setIsSyncing(false);
        return;
    }

    if (data.action === google.picker.Action.PICKED) {
      const files: File[] = [];
      const promises = data.docs.map(async (doc) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );
          if (!res.ok) throw new Error(`Failed to download ${doc.name}`);
          
          const blob = await res.blob();
          return new File([blob], doc.name, { type: doc.mimeType });
        } catch (e) {
          console.error(e);
          setError(`Error downloading ${doc.name}.`);
          return null;
        }
      });

      const downloadedFiles = (await Promise.all(promises)).filter((f): f is File => f !== null);
      
      if (downloadedFiles.length > 0) {
        onProcess(downloadedFiles);
      }
    }
    setIsSyncing(false);
  }, [onProcess]);

  const handleSyncClick = () => {
    setError(null);
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      setError("Google Drive integration is not configured. Missing Client ID or API Key.");
      return;
    }
    if (window.gapi && window.google) {
        gapi.load('picker', () => {
             tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID!,
                scope: SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse.error) {
                      setError('Authorization failed. Please try again.');
                      setIsSyncing(false);
                      return;
                    }
                    createPicker(tokenResponse.access_token);
                },
            });
            setIsSyncing(true);
            tokenClient.requestAccessToken({ prompt: '' });
        });
    } else {
        setError("Google API client is not ready. Please try again in a moment.");
    }
  };
  
  const createPicker = (accessToken: string) => {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("image/png,image/jpeg");

    const picker = new google.picker.PickerBuilder()
      .setApiKey(GOOGLE_API_KEY!)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data) => pickerCallback(data, accessToken))
      .build();
    picker.setVisible(true);
  };
  
  useEffect(() => {
      // Check if the google scripts are loaded
      if (window.gapi && window.google) {
          setIsReady(true);
      }
  }, []);

  const disabled = isSyncing || isProcessing || !isReady;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
    return (
        <div className="text-center p-4 bg-gray-800 rounded-lg border border-yellow-700/50">
            <p className="font-semibold text-yellow-400">Google Drive Sync Not Configured</p>
            <p className="text-sm text-gray-400 mt-1">Please set GOOGLE_CLIENT_ID and GOOGLE_API_KEY to enable this feature.</p>
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleSyncClick}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg font-semibold text-white transition-all duration-200 enabled:hover:bg-gray-600 enabled:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSyncing ? <Spinner className="w-6 h-6" /> : <GoogleIcon className="w-6 h-6" />}
        <span>Sync from Google Drive</span>
      </button>
      {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
    </div>
  );
};