import React, { useState, useEffect, useRef } from 'react';
import { 
  Image, Video, Sparkles, Save, Eye, Upload, ChevronDown, ChevronRight,
  Loader, Check, X, FolderOpen, HardDrive, Users, Search,
  RefreshCw, Link, FileText, FolderPlus, Pin, MoreVertical,
  File, FileImage, FileVideo, FileAudio, Grid, List, 
  ChevronLeft, Star, Clock, Download, Trash2, Share2, Copy
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
  const [driveConnected, setDriveConnected] = useState(true); // Set to true since user is connected
  const [driveFolders, setDriveFolders] = useState([]);
  const [sharedDrives, setSharedDrives] = useState([]);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingFolder, setSyncingFolder] = useState(false);
  
  // Split Panel States
  const [showDrivePanel, setShowDrivePanel] = useState(true);
  const [drivePanelWidth, setDrivePanelWidth] = useState(30); // percentage
  const [expandedFolders, setExpandedFolders] = useState({});
  const [pinnedFolders, setPinnedFolders] = useState([]);
  const [hoveredFile, setHoveredFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'grid'
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Brand folders (combination of local and Drive)
  const [brandFolders, setBrandFolders] = useState([]);
  
  // Refs for context menu
  const contextMenuRef = useRef(null);
  
  // Load initial data
  useEffect(() => {
    checkDriveConnection();
    loadBrandFolders();
    loadDriveFolders();
  }, []);
  
  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Check Google Drive connection status
  const checkDriveConnection = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/drive/status');
      const data = await response.json();
      setDriveConnected(data.success);
    } catch (error) {
      console.error('Failed to check Drive connection:', error);
      setDriveConnected(false);
    }
  };
  
  // Load folders from Google Drive with tree structure
  const loadDriveFolders = async () => {
    setLoadingDrive(true);
    try {
      const response = await fetch('http://localhost:3001/api/drive/folders');
      const data = await response.json();
      
      if (data.success) {
        // Transform to tree structure
        const folderTree = data.myDrive.folders.map(folder => ({
          ...folder,
          type: 'folder',
          children: [],
          source: 'mydrive'
        }));
        
        setDriveFolders(folderTree);
        
        // Process shared drives
        const sharedDriveTree = data.sharedDrives.map(drive => ({
          id: drive.driveId,
          name: drive.driveName,
          type: 'shared_drive',
          children: drive.folders.map(f => ({
            ...f,
            type: 'folder',
            children: [],
            source: 'shared'
          }))
        }));
        
        setSharedDrives(sharedDriveTree);
        
        // Transform for brand selector
        const driveBrands = [];
        data.myDrive.folders.forEach(folder => {
          driveBrands.push({
            id: folder.id,
            name: folder.name,
            context: 'Synced from Google Drive',
            source: 'drive',
            driveId: folder.id,
            webViewLink: folder.webViewLink
          });
        });
        
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
  
  // Load folder contents
  const loadFolderContents = async (folderId, isSharedDrive = false) => {
    setLoadingDrive(true);
    setSelectedDriveFolder(folderId);
    try {
      const response = await fetch(`http://localhost:3001/api/drive/folder/${folderId}?shared=${isSharedDrive}`);
      const data = await response.json();
      
      if (data.success) {
        setFolderContents(data.files);
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setLoadingDrive(false);
    }
  };
  
  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
    
    // Load contents if expanding
    if (!expandedFolders[folderId]) {
      loadFolderContents(folderId);
    }
  };
  
  // Pin/Unpin folder
  const togglePinFolder = (folder) => {
    setPinnedFolders(prev => {
      const isPinned = prev.some(f => f.id === folder.id);
      if (isPinned) {
        return prev.filter(f => f.id !== folder.id);
      } else {
        return [...prev, folder];
      }
    });
  };
  
  // Handle right-click context menu
  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      type
    });
  };
  
  // Context menu actions
  const handleContextAction = async (action) => {
    const { item, type } = contextMenu;
    
    switch (action) {
      case 'open':
        if (type === 'folder') {
          toggleFolder(item.id);
        } else {
          window.open(item.webViewLink, '_blank');
        }
        break;
      case 'pin':
        togglePinFolder(item);
        break;
      case 'sync':
        await syncFolderToDatabase(item);
        break;
      case 'import':
        await importDriveAsset(item);
        break;
      case 'download':
        // Implement download
        window.open(item.webContentLink, '_blank');
        break;
      case 'share':
        // Copy link to clipboard
        navigator.clipboard.writeText(item.webViewLink);
        alert('Link copied to clipboard!');
        break;
      case 'delete':
        // Implement delete (requires additional permissions)
        alert('Delete functionality requires additional permissions');
        break;
    }
    
    setContextMenu(null);
  };
  
  // Get file icon based on MIME type
  const getFileIcon = (mimeType) => {
    if (mimeType.includes('folder')) return <FolderOpen size={16} className="text-blue-400" />;
    if (mimeType.includes('image')) return <FileImage size={16} className="text-green-400" />;
    if (mimeType.includes('video')) return <FileVideo size={16} className="text-purple-400" />;
    if (mimeType.includes('audio')) return <FileAudio size={16} className="text-pink-400" />;
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText size={16} className="text-yellow-400" />;
    return <File size={16} className="text-gray-400" />;
  };
  
  // Render folder tree recursively
  const renderFolderTree = (folders, level = 0) => {
    return folders.map(folder => (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-${level * 4 + 2} py-1.5 hover:bg-white hover:bg-opacity-5 cursor-pointer rounded group`}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-0.5"
          >
            {expandedFolders[folder.id] ? 
              <ChevronDown size={14} /> : 
              <ChevronRight size={14} />
            }
          </button>
          <FolderOpen size={16} className="text-blue-400" />
          <span className="text-sm flex-1 truncate">{folder.name}</span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinFolder(folder);
              }}
              className="p-1 hover:bg-white hover:bg-opacity-10 rounded"
            >
              <Pin size={12} className={pinnedFolders.some(f => f.id === folder.id) ? 'text-yellow-400' : ''} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, folder, 'folder');
              }}
              className="p-1 hover:bg-white hover:bg-opacity-10 rounded"
            >
              <MoreVertical size={12} />
            </button>
          </div>
        </div>
        
        {/* Render folder contents if expanded */}
        {expandedFolders[folder.id] && selectedDriveFolder === folder.id && (
          <div className={`ml-${level * 4 + 6}`}>
            {loadingDrive ? (
              <div className="px-4 py-2">
                <Loader size={14} className="animate-spin" />
              </div>
            ) : (
              folderContents.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-white hover:bg-opacity-5 cursor-pointer rounded group"
                  onMouseEnter={() => setHoveredFile(file)}
                  onMouseLeave={() => setHoveredFile(null)}
                  onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  onClick={() => setSelectedFiles([file])}
                >
                  {getFileIcon(file.mimeType)}
                  <span className="text-xs flex-1 truncate">{file.name}</span>
                  <div className="opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        importDriveAsset(file);
                      }}
                      className="p-1 hover:bg-white hover:bg-opacity-10 rounded text-xs"
                    >
                      <Download size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Render children folders */}
        {folder.children && folder.children.length > 0 && expandedFolders[folder.id] && (
          <div>
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
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
  
  // Sync folder to database
  const syncFolderToDatabase = async (folder) => {
    setSyncingFolder(true);
    try {
      const response = await fetch('http://localhost:3001/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          brandName: folder.name,
          isSharedDrive: folder.source === 'shared'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`✅ Synced ${data.filesProcessed} files from ${folder.name} for AI training!`);
      }
    } catch (error) {
      console.error('Failed to sync folder:', error);
      alert('Failed to sync folder. Please try again.');
    } finally {
      setSyncingFolder(false);
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
  
  // Generate CGI Images
  const generateImages = async () => {
    if (!selectedBrand || !imagePrompt) {
      alert('Please select a brand and enter a prompt');
      return;
    }
    
    setIsGeneratingImages(true);
    try {
      const brand = brandFolders.find(b => b.id === selectedBrand);
      const enhancedPrompt = `${brand.context}. ${imagePrompt}`;
      
      const response = await fetch('http://localhost:3001/api/production/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: imageModel,
          prompt: enhancedPrompt,
          brand: brand.name,
          variations: 3
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
    <div className="production-container flex h-full">
      {/* Main Production Content */}
      <div className={`flex-1 transition-all duration-300 ${showDrivePanel ? `pr-4` : ''}`} 
           style={{ width: showDrivePanel ? `${100 - drivePanelWidth}%` : '100%' }}>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. CGI Image Proposals */}
          <div className="card-glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="text-blue-400" size={24} />
              <h2 className="text-xl font-bold">CGI Image Proposals</h2>
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
                  {pinnedFolders.length > 0 && (
                    <optgroup label="⭐ Pinned">
                      {pinnedFolders.map(brand => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Brands">
                    {brandFolders.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} {brand.synced ? '✨' : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={16} />
              </div>
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
          
          {/* 3. Video Generation */}
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
                
                {/* Selected Assets Preview */}
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
      </div>
      
      {/* Collapsible Drive Explorer Panel */}
      <div 
        className={`transition-all duration-300 ${showDrivePanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ width: showDrivePanel ? `${drivePanelWidth}%` : '0' }}
      >
        <div className="h-full card-glass p-4 relative">
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="text-green-400" size={20} />
              <h3 className="font-bold">Drive Explorer</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'tree' ? 'grid' : 'tree')}
                className="p-1.5 glass rounded hover:bg-white hover:bg-opacity-10"
                title={viewMode === 'tree' ? 'Grid View' : 'Tree View'}
              >
                {viewMode === 'tree' ? <Grid size={14} /> : <List size={14} />}
              </button>
              <button
                onClick={loadDriveFolders}
                className="p-1.5 glass rounded hover:bg-white hover:bg-opacity-10"
                disabled={loadingDrive}
              >
                <RefreshCw size={14} className={loadingDrive ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowDrivePanel(!showDrivePanel)}
                className="p-1.5 glass rounded hover:bg-white hover:bg-opacity-10"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchDriveFiles()}
                placeholder="Search files..."
                className="w-full glass pl-9 pr-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>
          
          {/* Pinned Folders */}
          {pinnedFolders.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium mb-2 opacity-70">⭐ Pinned</h4>
              <div className="space-y-1">
                {pinnedFolders.map(folder => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-2 p-2 glass rounded hover:bg-white hover:bg-opacity-5 cursor-pointer"
                    onClick={() => loadFolderContents(folder.id, folder.source === 'shared')}
                  >
                    <Star size={12} className="text-yellow-400" />
                    <FolderOpen size={14} className="text-blue-400" />
                    <span className="text-xs flex-1 truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Folder Tree View */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {loadingDrive && folderContents.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : viewMode === 'tree' ? (
              <>
                {/* My Drive */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium mb-2 opacity-70 flex items-center gap-2">
                    <HardDrive size={12} />
                    My Drive
                  </h4>
                  <div className="space-y-1">
                    {renderFolderTree(driveFolders)}
                  </div>
                </div>
                
                {/* Shared Drives */}
                {sharedDrives.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium mb-2 opacity-70 flex items-center gap-2">
                      <Users size={12} />
                      Shared Drives
                    </h4>
                    <div className="space-y-2">
                      {sharedDrives.map(drive => (
                        <div key={drive.id}>
                          <div className="flex items-center gap-2 p-2 glass rounded mb-1">
                            <Users size={14} className="text-purple-400" />
                            <span className="text-sm font-medium">{drive.name}</span>
                          </div>
                          <div className="ml-2">
                            {renderFolderTree(drive.children)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Grid View
              <div className="grid grid-cols-2 gap-2">
                {folderContents.map(file => (
                  <div
                    key={file.id}
                    className="glass p-3 rounded-lg cursor-pointer hover:bg-white hover:bg-opacity-5"
                    onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                  >
                    {file.thumbnailLink ? (
                      <img src={file.thumbnailLink} alt={file.name} className="w-full h-20 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-20 glass rounded mb-2 flex items-center justify-center">
                        {getFileIcon(file.mimeType)}
                      </div>
                    )}
                    <p className="text-xs truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* File Preview on Hover */}
          {hoveredFile && hoveredFile.thumbnailLink && (
            <div className="absolute bottom-4 left-4 right-4 p-3 glass rounded-lg">
              <img src={hoveredFile.thumbnailLink} alt={hoveredFile.name} className="w-full h-32 object-cover rounded mb-2" />
              <p className="text-xs font-medium truncate">{hoveredFile.name}</p>
              <p className="text-xs opacity-60">{hoveredFile.mimeType}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Toggle Panel Button (when closed) */}
      {!showDrivePanel && (
        <button
          onClick={() => setShowDrivePanel(true)}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 p-3 glass rounded-l-lg hover:bg-white hover:bg-opacity-10"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed glass rounded-lg py-2 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'folder' ? (
            <>
              <button
                onClick={() => handleContextAction('open')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <FolderOpen size={14} />
                Open
              </button>
              <button
                onClick={() => handleContextAction('pin')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Pin size={14} />
                {pinnedFolders.some(f => f.id === contextMenu.item.id) ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={() => handleContextAction('sync')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Sparkles size={14} />
                Sync for AI
              </button>
              <hr className="my-1 border-gray-700" />
              <button
                onClick={() => handleContextAction('share')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Share2 size={14} />
                Copy Link
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleContextAction('import')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Download size={14} />
                Import as Asset
              </button>
              <button
                onClick={() => handleContextAction('download')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Download size={14} />
                Download
              </button>
              <hr className="my-1 border-gray-700" />
              <button
                onClick={() => handleContextAction('share')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-white hover:bg-opacity-10 flex items-center gap-2"
              >
                <Share2 size={14} />
                Copy Link
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionTab;