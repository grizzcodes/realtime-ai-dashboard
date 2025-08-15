// backend/src/services/googleDriveService.js
const { google } = require('googleapis');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3001/auth/google/callback'
    );
    
    this.setupCredentials();
  }

  setupCredentials() {
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
  }

  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials.access_token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        return { 
          success: false, 
          error: 'Google Drive OAuth not configured. Visit /auth/google to set up.',
          needsAuth: true
        };
      }

      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Test access to Drive
      const response = await drive.about.get({
        fields: 'user, storageQuota'
      });
      
      return {
        success: true,
        message: 'Google Drive connected successfully',
        details: {
          user: response.data.user.displayName,
          email: response.data.user.emailAddress,
          storageUsed: this.formatBytes(response.data.storageQuota.usage),
          storageLimit: response.data.storageQuota.limit ? 
            this.formatBytes(response.data.storageQuota.limit) : 'Unlimited'
        }
      };
    } catch (error) {
      console.error('Drive connection error:', error);
      return {
        success: false,
        error: `Drive API error: ${error.message}`,
        needsAuth: error.code === 401
      };
    }
  }

  // List all folders in MyDrive and Shared Drives
  async listAllFolders() {
    try {
      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Get folders from MyDrive
      const myDriveFolders = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and 'me' in owners and trashed=false",
        fields: 'files(id, name, parents, createdTime, modifiedTime, webViewLink)',
        orderBy: 'name',
        pageSize: 1000
      });

      // Get Shared Drives
      const sharedDrives = await drive.drives.list({
        fields: 'drives(id, name, createdTime)',
        pageSize: 100
      });

      // Get folders from Shared Drives
      let sharedDriveFolders = [];
      for (const sharedDrive of (sharedDrives.data.drives || [])) {
        const folders = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
          driveId: sharedDrive.id,
          corpora: 'drive',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: 'files(id, name, parents, createdTime, modifiedTime, webViewLink)',
          orderBy: 'name',
          pageSize: 1000
        });
        
        sharedDriveFolders.push({
          driveName: sharedDrive.name,
          driveId: sharedDrive.id,
          folders: folders.data.files || []
        });
      }

      return {
        success: true,
        myDrive: {
          folders: myDriveFolders.data.files || [],
          count: myDriveFolders.data.files?.length || 0
        },
        sharedDrives: sharedDriveFolders,
        totalFolders: (myDriveFolders.data.files?.length || 0) + 
          sharedDriveFolders.reduce((acc, drive) => acc + drive.folders.length, 0)
      };
    } catch (error) {
      console.error('Error listing folders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get files in a specific folder
  async getFolderContents(folderId, includeSharedDrive = false) {
    try {
      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      const params = {
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink)',
        orderBy: 'name',
        pageSize: 1000
      };

      if (includeSharedDrive) {
        params.supportsAllDrives = true;
        params.includeItemsFromAllDrives = true;
      }

      const response = await drive.files.list(params);
      
      return {
        success: true,
        files: response.data.files || [],
        count: response.data.files?.length || 0
      };
    } catch (error) {
      console.error('Error getting folder contents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Search for files across all drives
  async searchFiles(query, options = {}) {
    try {
      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      const searchQuery = options.mimeType ? 
        `name contains '${query}' and mimeType='${options.mimeType}' and trashed=false` :
        `name contains '${query}' and trashed=false`;
      
      const params = {
        q: searchQuery,
        fields: 'files(id, name, mimeType, parents, createdTime, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        pageSize: options.limit || 50,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      };

      const response = await drive.files.list(params);
      
      return {
        success: true,
        files: response.data.files || [],
        count: response.data.files?.length || 0
      };
    } catch (error) {
      console.error('Error searching files:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    try {
      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      const response = await drive.files.get({
        fileId: fileId,
        fields: '*',
        supportsAllDrives: true
      });
      
      return {
        success: true,
        file: response.data
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Download file content (for text files, docs, etc.)
  async downloadFile(fileId) {
    try {
      await this.refreshAccessToken();
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // First get file metadata to determine type
      const metadataResponse = await drive.files.get({
        fileId: fileId,
        fields: 'mimeType, name',
        supportsAllDrives: true
      });
      
      const mimeType = metadataResponse.data.mimeType;
      let content;
      
      // Handle Google Docs/Sheets/Slides
      if (mimeType.includes('google-apps')) {
        let exportMimeType = 'text/plain';
        
        if (mimeType.includes('spreadsheet')) {
          exportMimeType = 'text/csv';
        } else if (mimeType.includes('document')) {
          exportMimeType = 'text/plain';
        } else if (mimeType.includes('presentation')) {
          exportMimeType = 'text/plain';
        }
        
        const response = await drive.files.export({
          fileId: fileId,
          mimeType: exportMimeType
        }, { responseType: 'text' });
        
        content = response.data;
      } else {
        // Regular files
        const response = await drive.files.get({
          fileId: fileId,
          alt: 'media',
          supportsAllDrives: true
        }, { responseType: 'text' });
        
        content = response.data;
      }
      
      return {
        success: true,
        content: content,
        fileName: metadataResponse.data.name,
        mimeType: mimeType
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync folder structure to database for AI access
  async syncFolderToDatabase(folderId, brandName) {
    try {
      const folderContents = await this.getFolderContents(folderId);
      
      if (!folderContents.success) {
        return folderContents;
      }
      
      // Process files for AI context
      const processedFiles = [];
      for (const file of folderContents.files) {
        // Only process text-based files
        if (this.isTextBasedFile(file.mimeType)) {
          const fileContent = await this.downloadFile(file.id);
          
          if (fileContent.success) {
            processedFiles.push({
              id: file.id,
              name: file.name,
              content: fileContent.content,
              mimeType: file.mimeType,
              brandName: brandName,
              syncedAt: new Date().toISOString()
            });
          }
        }
      }
      
      // Here you would save to Supabase or your database
      // For now, returning the processed data
      return {
        success: true,
        brandName: brandName,
        folderId: folderId,
        filesProcessed: processedFiles.length,
        files: processedFiles
      };
    } catch (error) {
      console.error('Error syncing folder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper function to check if file is text-based
  isTextBasedFile(mimeType) {
    const textTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'google-apps.document',
      'google-apps.spreadsheet',
      'google-apps.presentation'
    ];
    
    return textTypes.some(type => mimeType.includes(type));
  }

  // Helper function to format bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = GoogleDriveService;