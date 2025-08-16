// backend/src/routes/driveRoutes.js
const express = require('express');
const router = express.Router();
const GoogleDriveService = require('../services/googleDriveService');

const driveService = new GoogleDriveService();

// Check Drive connection status
router.get('/status', async (req, res) => {
  try {
    const result = await driveService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// List all folders from MyDrive and Shared Drives
router.get('/folders', async (req, res) => {
  try {
    const result = await driveService.listAllFolders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get contents of a specific folder
router.get('/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { shared } = req.query;
    
    const result = await driveService.getFolderContents(
      folderId, 
      shared === 'true'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Search files across all drives
router.get('/search', async (req, res) => {
  try {
    const { q, mimeType, limit } = req.query;
    
    const result = await driveService.searchFiles(q, {
      mimeType,
      limit: limit ? parseInt(limit) : 50
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get file metadata
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await driveService.getFileMetadata(fileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Download file content
router.get('/file/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await driveService.downloadFile(fileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sync folder to database for AI training
router.post('/sync', async (req, res) => {
  try {
    const { folderId, brandName, isSharedDrive } = req.body;
    
    if (!folderId || !brandName) {
      return res.status(400).json({
        success: false,
        error: 'folderId and brandName are required'
      });
    }
    
    // Get folder contents
    const folderContents = await driveService.getFolderContents(folderId, isSharedDrive);
    
    if (!folderContents.success) {
      return res.json(folderContents);
    }
    
    // Process text-based files for AI context
    const processedFiles = [];
    const errors = [];
    
    for (const file of folderContents.files) {
      // Only process text-based files
      if (driveService.isTextBasedFile(file.mimeType)) {
        try {
          const fileContent = await driveService.downloadFile(file.id);
          
          if (fileContent.success) {
            processedFiles.push({
              id: file.id,
              name: file.name,
              content: fileContent.content.substring(0, 5000), // Limit content size
              mimeType: file.mimeType,
              brandName: brandName,
              syncedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          errors.push({
            file: file.name,
            error: error.message
          });
        }
      }
    }
    
    // Here you would save to Supabase
    // For now, we'll store in memory or send to your database endpoint
    
    res.json({
      success: true,
      brandName: brandName,
      folderId: folderId,
      filesProcessed: processedFiles.length,
      totalFiles: folderContents.files.length,
      errors: errors.length > 0 ? errors : undefined,
      files: processedFiles // You might want to remove this in production
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create a new brand folder in Drive
router.post('/create-folder', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }
    
    // This would use the Drive API to create a folder
    // Implementation depends on your needs
    
    res.json({
      success: true,
      message: 'Folder creation endpoint - implement as needed'
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;