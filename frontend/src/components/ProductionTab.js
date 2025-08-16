import React, { useState, useEffect } from 'react';
import { 
  Image, Video, Sparkles, Save, Eye, Upload, ChevronDown, 
  Loader, Check, X, FolderOpen, HardDrive, Users, Search,
  RefreshCw, Link, FileText, FolderPlus
} from 'lucide-react';

const ProductionTab = () => {
  // State for CGI Image Proposals
  const [selectedBrand, setSelectedBrand] = useState('');
  const [imageModel, setImageModel] = useState('dalle');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  
  // State for Frames Creation
  const [frameType, setFrameType] = useState('first');
  const [frameModel, setFrameModel] = useState('dalle');
  const [framePrompt, setFramePrompt] = useState('');
  const [generatedFrames, setGeneratedFrames] = useState([]);
  const [approvedFrames, setApprovedFrames] = useState([]);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  
  // State for Video Generation
  const [videoModel, setVideoModel] = useState('runway');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // Google Drive Integration States
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolders, setDriveFolders] = useState([]);
  const [sharedDrives, setSharedDrives] = useState([]);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveView, setDriveView] = useState('folders'); // 'folders' or 'contents'
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingFolder, setSyncingFolder] = useState(false);
  
  // Brand folders (combination of local and Drive)
  const [brandFolders, setBrandFolders] = useState([]);
  const [brandSource, setBrandSource] = useState('local'); // 'local' or 'drive'
  
  // Load initial data
  useEffect(() => {
    checkDriveConnection();
    loadBrandFolders();
  }, []);
  
  // Check Google Drive connection status
  const checkDriveConnection = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/drive/status');
      const data = await response.json();
      setDriveConnected(data.success);
      
      if (data.success) {
        loadDriveFolders();
      }
    } catch (error) {
      console.error('Failed to check Drive connection:', error);
      setDriveConnected(false);
    }
  };
  
  // Load folders from Google Drive
  const loadDriveFolders = async () => {
    setLoadingDrive(true);
    try {
      const response = await fetch('http://localhost:3001/api/drive/folders');
      const data = await response.json();
      
      if (data.success) {
        setDriveFolders(data.myDrive.folders);
        setSharedDrives(data.sharedDrives);
        
        // Transform Drive folders to brand format
        const driveBrands = data.myDrive.folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          context: 'Synced from Google Drive',
          source: 'drive',
          driveId: folder.id,
          webViewLink: folder.webViewLink
        }));
        
        // Add shared drive folders
        data.sharedDrives.forEach(drive => {
          drive.folders.forEach(folder => {
            driveBrands.push({
              id: folder.id,
              name: `${drive.driveName} / ${folder.name}`,
              context: `Shared Drive: ${drive.driveName}`,
              source: 'drive',
              driveId: folder.id,
              sharedDriveId: drive.driveId,
              webViewLink: folder.webViewLink
            });
          });
        });
        
        setBrandFolders(prev => [...prev.filter(b => b.source !== 'drive'), ...driveBrands]);
      }
    } catch (error) {
      console.error('Failed to load Drive folders:', error);
    } finally {
      setLoadingDrive(false);
    }
  };
  
  // Load folder contents from Drive
  const loadFolderContents = async (folderId, isSharedDrive = false) => {
    setLoadingDrive(true);
    try {
      const response = await fetch(`http://localhost:3001/api/drive/folder/${folderId}?shared=${isSharedDrive}`);
      const data = await response.json();
      
      if (data.success) {
        setFolderContents(data.files);
        setDriveView('contents');
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setLoadingDrive(false);
    }
  };
  
  // Sync Drive folder to database for AI access
  const syncFolderToDatabase = async (folder) => {
    setSyncingFolder(true);
    try {
      const response = await fetch('http://localhost:3001/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.driveId,
          brandName: folder.name,
          isSharedDrive: !!folder.sharedDriveId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`✅ Synced ${data.filesProcessed} files from ${folder.name} for AI training!`);
        
        // Update folder to show it's synced
        setBrandFolders(prev => prev.map(f => 
          f.id === folder.id ? { ...f, synced: true, context: `AI-Ready: ${data.filesProcessed} files` } : f
        ));
      }
    } catch (error) {
      console.error('Failed to sync folder:', error);
      alert('Failed to sync folder. Please try again.');
    } finally {
      setSyncingFolder(false);
    }
  };
  
  // Search Drive files
  const searchDriveFiles = async () => {
    if (!searchQuery) return;
    
    setLoadingDrive(true);
    try {
      const response = await fetch(`http://localhost:3001/api/drive/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success) {
        setFolderContents(data.files);
        setDriveView('contents');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoadingDrive(false);
    }
  };
  
  // Import Drive file as asset
  const importDriveAsset = async (file) => {
    try {
      // For images, we can use the thumbnailLink or webContentLink
      if (file.mimeType.startsWith('image/')) {
        setSelectedAssets([...selectedAssets, {
          id: file.id,
          name: file.name,
          url: file.webContentLink || file.thumbnailLink,
          source: 'drive'
        }]);
        alert(`✅ Added ${file.name} to assets`);
      } else {
        alert('Only image files can be imported as assets currently');
      }
    } catch (error) {
      console.error('Failed to import asset:', error);
    }
  };
  
  // Load brand folders from local database
  const loadBrandFolders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/production/brands');
      const data = await response.json();
      if (data.success && data.brands) {
        const localBrands = data.brands.map(b => ({ ...b, source: 'local' }));
        setBrandFolders(localBrands);
      }
    } catch (error) {
      console.error('Failed to load brand folders:', error);
    }
  };
  
  // Generate CGI Images with Drive context
  const generateImages = async () => {
    if (!selectedBrand || !imagePrompt) {
      alert('Please select a brand and enter a prompt');
      return;
    }
    
    setIsGeneratingImages(true);
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      
      // If it's a Drive folder and synced, include that context
      let enhancedPrompt = imagePrompt;
      if (brand.source === 'drive' && brand.synced) {
        enhancedPrompt = `Based on brand folder "${brand.name}" context: ${imagePrompt}`;
      } else {
        enhancedPrompt = `${brand.context}. ${imagePrompt}`;
      }
      
      const response = await fetch('http://localhost:3001/api/production/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: imageModel,
          prompt: enhancedPrompt,
          brand: brand.name,
          variations: 3,
          driveContext: brand.source === 'drive' ? brand.driveId : null
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setGeneratedImages(data.images);
      }
    } catch (error) {
      console.error('Failed to generate images:', error);
      alert('Failed to generate images. Please try again.');
    } finally {
      setIsGeneratingImages(false);
    }
  };
  
  // Save image to project
  const saveToProject = async (imageUrl) => {
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      const response = await fetch('http://localhost:3001/api/production/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          brand: brand.name,
          prompt: imagePrompt,
          model: imageModel
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Image saved to project!');
        setSelectedAssets([...selectedAssets, imageUrl]);
      }
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };
  
  // Generate Frames
  const generateFrames = async () => {
    if (!selectedBrand || !framePrompt) {
      alert('Please select a brand and enter a prompt');
      return;
    }
    
    setIsGeneratingFrames(true);
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      const enhancedPrompt = `${frameType === 'first' ? 'Opening' : 'Closing'} frame: ${brand.context}. ${framePrompt}`;
      
      const response = await fetch('http://localhost:3001/api/production/generate-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: frameModel,
          prompt: enhancedPrompt,
          frameType,
          brand: brand.name
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setGeneratedFrames(data.frames);
      }
    } catch (error) {
      console.error('Failed to generate frames:', error);
      alert('Failed to generate frames. Please try again.');
    } finally {
      setIsGeneratingFrames(false);
    }
  };
  
  // Approve frame for video generation
  const approveFrame = (frameUrl) => {
    setApprovedFrames([...approvedFrames, { url: frameUrl, type: frameType }]);
    setSelectedAssets([...selectedAssets, frameUrl]);
    alert('Frame approved and added to video assets!');
  };
  
  // Generate Video
  const generateVideo = async () => {
    if (selectedAssets.length === 0 || !videoPrompt) {
      alert('Please add assets and enter a video prompt');
      return;
    }
    
    setIsGeneratingVideo(true);
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      
      const response = await fetch('http://localhost:3001/api/production/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: videoModel,
          prompt: videoPrompt,
          assets: selectedAssets,
          brand: brand?.name,
          approvedFrames
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setGeneratedVideo(data.videoUrl);
      }
    } catch (error) {
      console.error('Failed to generate video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  
  // Save video to client preview
  const saveVideoToPreview = async () => {
    if (!generatedVideo) return;
    
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      const response = await fetch('http://localhost:3001/api/production/save-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: generatedVideo,
          brand: brand?.name,
          prompt: videoPrompt,
          model: videoModel
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Video saved! Client preview link: ${data.previewUrl}`);
      }
    } catch (error) {
      console.error('Failed to save video:', error);
    }
  };
  
  // Handle file upload for video assets
  const handleAssetUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAssets = files.map(file => URL.createObjectURL(file));
    setSelectedAssets([...selectedAssets, ...newAssets]);
  };

  return (
    <div className="production-container">
      {/* Google Drive Connection Banner */}
      {!driveConnected && (
        <div className="mb-6 p-4 glass rounded-lg border border-yellow-500 border-opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="text-yellow-400" size={24} />
              <div>
                <h3 className="font-bold">Connect Google Drive for Enhanced Features</h3>
                <p className="text-sm opacity-70">Access brand folders from MyDrive and Shared Drives for AI context</p>
              </div>
            </div>
            <a 
              href="http://localhost:3001/auth/google" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-glass px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-500 hover:bg-opacity-20"
            >
              <Link size={16} />
              Connect Drive
            </a>
          </div>
        </div>
      )}
      
      {/* Google Drive Explorer Panel */}
      {driveConnected && (
        <div className="mb-6 card-glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="text-green-400" size={24} />
              <h2 className="text-xl font-bold">Google Drive Assets</h2>
              <span className="px-2 py-1 text-xs bg-green-500 bg-opacity-20 rounded">Connected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDriveView('folders')}
                className={`px-3 py-1 rounded text-sm ${driveView === 'folders' ? 'bg-blue-500 bg-opacity-30' : 'glass'}`}
              >
                Folders
              </button>
              <button
                onClick={loadDriveFolders}
                className="btn-glass p-2 rounded"
                disabled={loadingDrive}
              >
                <RefreshCw size={16} className={loadingDrive ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchDriveFiles()}
              placeholder="Search files across all drives..."
              className="flex-1 glass px-4 py-2 rounded-lg"
            />
            <button
              onClick={searchDriveFiles}
              className="btn-glass px-4 py-2 rounded-lg"
            >
              <Search size={16} />
            </button>
          </div>
          
          {/* Drive Content Display */}
          {loadingDrive ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin" size={24} />
            </div>
          ) : driveView === 'folders' ? (
            <div className="space-y-4">
              {/* MyDrive Folders */}
              <div>
                <h3 className="text-sm font-medium mb-2 opacity-70">My Drive</h3>
                <div className="grid grid-cols-2 gap-2">
                  {driveFolders.slice(0, 6).map(folder => (
                    <div key={folder.id} className="glass p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <FolderOpen size={16} className="text-blue-400" />
                        <span className="text-sm truncate">{folder.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadFolderContents(folder.id)}
                          className="btn-glass p-1 rounded text-xs"
                          title="Browse"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => syncFolderToDatabase({ ...folder, driveId: folder.id, name: folder.name })}
                          className="btn-glass p-1 rounded text-xs"
                          title="Sync for AI"
                          disabled={syncingFolder}
                        >
                          {syncingFolder ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Shared Drives */}
              {sharedDrives.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 opacity-70">Shared Drives</h3>
                  <div className="space-y-2">
                    {sharedDrives.map(drive => (
                      <div key={drive.driveId} className="glass p-2 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={16} className="text-purple-400" />
                          <span className="text-sm font-medium">{drive.driveName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {drive.folders.slice(0, 4).map(folder => (
                            <div key={folder.id} className="glass p-2 rounded flex items-center justify-between">
                              <span className="text-xs truncate flex-1">{folder.name}</span>
                              <button
                                onClick={() => loadFolderContents(folder.id, true)}
                                className="btn-glass p-1 rounded text-xs"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Folder Contents View
            <div>
              <button
                onClick={() => setDriveView('folders')}
                className="mb-3 text-sm opacity-70 hover:opacity-100"
              >
                ← Back to folders
              </button>
              <div className="grid grid-cols-3 gap-2">
                {folderContents.map(file => (
                  <div key={file.id} className="glass p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-xs truncate">{file.name}</span>
                    </div>
                    {file.thumbnailLink && (
                      <img src={file.thumbnailLink} alt={file.name} className="w-full h-20 object-cover rounded mb-2" />
                    )}
                    <button
                      onClick={() => importDriveAsset(file)}
                      className="w-full btn-glass py-1 text-xs rounded"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. CGI Image Proposals - Enhanced with Drive Integration */}
        <div className="card-glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Image className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold">CGI Image Proposals</h2>
          </div>
          
          {/* Brand Source Toggle */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setBrandSource('local')}
              className={`flex-1 px-2 py-1 rounded text-sm ${
                brandSource === 'local' ? 'bg-blue-500 bg-opacity-30' : 'glass'
              }`}
            >
              Local Brands
            </button>
            <button
              onClick={() => setBrandSource('drive')}
              className={`flex-1 px-2 py-1 rounded text-sm ${
                brandSource === 'drive' ? 'bg-blue-500 bg-opacity-30' : 'glass'
              }`}
              disabled={!driveConnected}
            >
              Drive Brands
            </button>
          </div>
          
          {/* Brand Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Brand Folder</label>
            <div className="relative">
              <select 
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full glass px-4 py-2 rounded-lg appearance-none pr-10"
              >
                <option value="">Select Brand...</option>
                {brandFolders
                  .filter(b => b.source === brandSource)
                  .map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name} {brand.synced ? '✨' : ''}
                    </option>
                  ))
                }
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={16} />
            </div>
            {selectedBrand && brandFolders.find(b => b.id === selectedBrand)?.source === 'drive' && (
              <div className="mt-2 flex gap-2">
                <a
                  href={brandFolders.find(b => b.id === selectedBrand)?.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  View in Drive →
                </a>
                {!brandFolders.find(b => b.id === selectedBrand)?.synced && (
                  <button
                    onClick={() => syncFolderToDatabase(brandFolders.find(b => b.id === selectedBrand))}
                    className="text-xs text-green-400 hover:underline"
                    disabled={syncingFolder}
                  >
                    {syncingFolder ? 'Syncing...' : 'Sync for AI →'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Model Choice */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">AI Model</label>
            <div className="flex gap-2">
              <button
                onClick={() => setImageModel('dalle')}
                className={`flex-1 px-3 py-2 rounded-lg transition-all ${
                  imageModel === 'dalle' 
                    ? 'bg-blue-500 bg-opacity-30 border border-blue-400' 
                    : 'glass hover:bg-white hover:bg-opacity-10'
                }`}
              >
                DALL·E
              </button>
              <button
                onClick={() => setImageModel('midjourney')}
                className={`flex-1 px-3 py-2 rounded-lg transition-all ${
                  imageModel === 'midjourney' 
                    ? 'bg-blue-500 bg-opacity-30 border border-blue-400' 
                    : 'glass hover:bg-white hover:bg-opacity-10'
                }`}
              >
                Midjourney
              </button>
            </div>
          </div>
          
          {/* Prompt Box */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Image Prompt</label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe your concept image..."
              className="w-full glass px-4 py-3 rounded-lg resize-none"
              rows="3"
            />
            {selectedBrand && (
              <p className="text-xs opacity-60 mt-1">
                Context: {brandFolders.find(b => b.id === selectedBrand)?.context}
              </p>
            )}
          </div>
          
          {/* Generate Button */}
          <button
            onClick={generateImages}
            disabled={isGeneratingImages || !selectedBrand || !imagePrompt}
            className="w-full btn-glass py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500 hover:bg-opacity-20 transition-all disabled:opacity-50"
          >
            {isGeneratingImages ? (
              <>
                <Loader className="animate-spin" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate 3 Variations
              </>
            )}
          </button>
          
          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Generated Concepts:</p>
              <div className="grid grid-cols-3 gap-2">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={img} 
                      alt={`Concept ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => saveToProject(img)}
                      className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                    >
                      <Save size={16} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 2. Frames Creation */}
        <div className="card-glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold">Frames Creation</h2>
          </div>
          
          {/* Frame Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Frame Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFrameType('first')}
                className={`flex-1 px-3 py-2 rounded-lg transition-all ${
                  frameType === 'first' 
                    ? 'bg-purple-500 bg-opacity-30 border border-purple-400' 
                    : 'glass hover:bg-white hover:bg-opacity-10'
                }`}
              >
                First Frame
              </button>
              <button
                onClick={() => setFrameType('last')}
                className={`flex-1 px-3 py-2 rounded-lg transition-all ${
                  frameType === 'last' 
                    ? 'bg-purple-500 bg-opacity-30 border border-purple-400' 
                    : 'glass hover:bg-white hover:bg-opacity-10'
                }`}
              >
                Last Frame
              </button>
            </div>
          </div>
          
          {/* Model Choice */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Frame Model</label>
            <div className="grid grid-cols-3 gap-2">
              {['dalle', 'midjourney', 'reve'].map(model => (
                <button
                  key={model}
                  onClick={() => setFrameModel(model)}
                  className={`px-2 py-2 rounded-lg text-sm transition-all ${
                    frameModel === model 
                      ? 'bg-purple-500 bg-opacity-30 border border-purple-400' 
                      : 'glass hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  {model === 'reve' ? 'Reve.art' : model.charAt(0).toUpperCase() + model.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Frame Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Frame Prompt</label>
            <textarea
              value={framePrompt}
              onChange={(e) => setFramePrompt(e.target.value)}
              placeholder={`Describe your ${frameType} frame...`}
              className="w-full glass px-4 py-3 rounded-lg resize-none"
              rows="3"
            />
          </div>
          
          {/* Generate Frames Button */}
          <button
            onClick={generateFrames}
            disabled={isGeneratingFrames || !selectedBrand || !framePrompt}
            className="w-full btn-glass py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-500 hover:bg-opacity-20 transition-all disabled:opacity-50"
          >
            {isGeneratingFrames ? (
              <>
                <Loader className="animate-spin" size={16} />
                Creating Frame...
              </>
            ) : (
              <>
                <Video size={16} />
                Generate Frame
              </>
            )}
          </button>
          
          {/* Generated Frames Preview */}
          {generatedFrames.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Preview & Approve:</p>
              <div className="space-y-2">
                {generatedFrames.map((frame, idx) => (
                  <div key={idx} className="relative">
                    <img 
                      src={frame} 
                      alt={`Frame ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button
                        onClick={() => approveFrame(frame)}
                        className="bg-green-500 bg-opacity-80 p-2 rounded-lg hover:bg-opacity-100 transition-all"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="bg-red-500 bg-opacity-80 p-2 rounded-lg hover:bg-opacity-100 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Approved Frames */}
          {approvedFrames.length > 0 && (
            <div className="mt-4 p-2 glass rounded-lg">
              <p className="text-xs opacity-70">✓ {approvedFrames.length} frames approved</p>
            </div>
          )}
        </div>
        
        {/* 3. Video Generation - Enhanced with Drive Assets */}
        <div className="card-glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-green-400" size={24} />
            <h2 className="text-xl font-bold">Video Generation</h2>
          </div>
          
          {/* Video Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Video Model</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'runway', name: 'Runway' },
                { id: 'veo3', name: 'Veo3' },
                { id: 'kling', name: 'Kling' },
                { id: 'highfields', name: 'Highfields' }
              ].map(model => (
                <button
                  key={model.id}
                  onClick={() => setVideoModel(model.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    videoModel === model.id 
                      ? 'bg-green-500 bg-opacity-30 border border-green-400' 
                      : 'glass hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Input Assets */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Input Assets ({selectedAssets.length})
            </label>
            <div className="glass p-4 rounded-lg">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleAssetUpload}
                className="hidden"
                id="asset-upload"
              />
              <label
                htmlFor="asset-upload"
                className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-500 rounded-lg cursor-pointer hover:border-gray-400 transition-all"
              >
                <Upload size={16} />
                <span className="text-sm">Drop assets or click to upload</span>
              </label>
              
              {/* Selected Assets Preview - Now includes Drive assets */}
              {selectedAssets.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {selectedAssets.map((asset, idx) => (
                    <div key={idx} className="relative">
                      {typeof asset === 'object' && asset.source === 'drive' ? (
                        <div className="w-16 h-16 glass rounded flex items-center justify-center">
                          <FileText size={20} className="text-blue-400" />
                        </div>
                      ) : (
                        <img 
                          src={typeof asset === 'object' ? asset.url : asset} 
                          alt={`Asset ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <button
                        onClick={() => setSelectedAssets(selectedAssets.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Video Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Video Prompt</label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe the video motion and transitions..."
              className="w-full glass px-4 py-3 rounded-lg resize-none"
              rows="3"
            />
          </div>
          
          {/* Generate Video Button */}
          <button
            onClick={generateVideo}
            disabled={isGeneratingVideo || selectedAssets.length === 0 || !videoPrompt}
            className="w-full btn-glass py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-500 hover:bg-opacity-20 transition-all disabled:opacity-50"
          >
            {isGeneratingVideo ? (
              <>
                <Loader className="animate-spin" size={16} />
                Generating Video...
              </>
            ) : (
              <>
                <Video size={16} />
                Generate Video
              </>
            )}
          </button>
          
          {/* Video Preview */}
          {generatedVideo && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <video 
                src={generatedVideo} 
                controls 
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveVideoToPreview}
                  className="flex-1 btn-glass py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-500 hover:bg-opacity-20"
                >
                  <Save size={16} />
                  Save & Share
                </button>
                <button
                  className="flex-1 btn-glass py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500 hover:bg-opacity-20"
                >
                  <Eye size={16} />
                  Client Preview
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
      
      {/* Brand Context Training Tips - Enhanced with Drive Info */}
      <div className="mt-8 card-glass p-6">
        <h3 className="text-lg font-bold mb-3">🎯 Model Training & Optimization</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-blue-400 mb-2">Brand Context</h4>
            <p className="opacity-70">Each brand folder contains metadata for tone, style, and visual language that automatically enhances prompts.</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-purple-400 mb-2">Drive Integration</h4>
            <p className="opacity-70">Sync Google Drive folders to provide AI with brand guidelines, assets, and reference materials.</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-green-400 mb-2">Reference Learning</h4>
            <p className="opacity-70">Previous successful generations are stored and used to fine-tune future prompts for consistency.</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-yellow-400 mb-2">Performance Metrics</h4>
            <p className="opacity-70">Client approval rates and engagement data help refine the generation parameters over time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionTab;