import React, { useState, useEffect } from 'react';
import { Image, Video, Sparkles, Save, Eye, Upload, ChevronDown, Loader, Check, X } from 'lucide-react';

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
  
  // Brand folders (will be populated from Supabase)
  const [brandFolders, setBrandFolders] = useState([
    { id: '1', name: 'Nike - Just Do It', context: 'Athletic, empowering, bold' },
    { id: '2', name: 'Apple - Think Different', context: 'Minimalist, innovative, premium' },
    { id: '3', name: 'Coca-Cola - Taste the Feeling', context: 'Refreshing, joyful, classic' },
    { id: '4', name: 'Tesla - Future Forward', context: 'Futuristic, sustainable, innovative' }
  ]);
  
  // Load brand folders from Supabase
  useEffect(() => {
    loadBrandFolders();
  }, []);
  
  const loadBrandFolders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/production/brands');
      const data = await response.json();
      if (data.success && data.brands) {
        setBrandFolders(data.brands);
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
        // Add to selected assets for video generation
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
    // Here you would upload to Supabase and get URLs
    // For now, we'll create object URLs as placeholders
    const newAssets = files.map(file => URL.createObjectURL(file));
    setSelectedAssets([...selectedAssets, ...newAssets]);
  };

  return (
    <div className="production-container">
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
                {brandFolders.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
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
            <label className="block text-sm font-medium mb-2">Input Assets</label>
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
                      <img 
                        src={asset} 
                        alt={`Asset ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
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
      
      {/* Brand Context Training Tips */}
      <div className="mt-8 card-glass p-6">
        <h3 className="text-lg font-bold mb-3">🎯 Model Training & Optimization</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-blue-400 mb-2">Brand Context</h4>
            <p className="opacity-70">Each brand folder contains metadata for tone, style, and visual language that automatically enhances prompts.</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-purple-400 mb-2">Reference Learning</h4>
            <p className="opacity-70">Previous successful generations are stored and used to fine-tune future prompts for consistency.</p>
          </div>
          <div className="glass p-4 rounded-lg">
            <h4 className="font-medium text-green-400 mb-2">Performance Metrics</h4>
            <p className="opacity-70">Client approval rates and engagement data help refine the generation parameters over time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionTab;