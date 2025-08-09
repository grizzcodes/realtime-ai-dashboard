import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Image, Video, Sparkles, ChevronDown, X, Check, Save, Loader2, Plus } from 'lucide-react';

const Production = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandAssets, setBrandAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  
  // Generation parameters
  const [model, setModel] = useState('openai');
  const [mode, setMode] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [quality, setQuality] = useState('hd');
  
  // Current generation outputs
  const [currentOutputs, setCurrentOutputs] = useState([]);

  const models = [
    { id: 'openai', name: 'OpenAI / DALL-E 3', modes: ['image'] },
    { id: 'runway', name: 'Runway', modes: ['video'] },
    { id: 'veo3', name: 'Veo 3', modes: ['video'] },
    { id: 'kling', name: 'Kling', modes: ['video'] }
  ];

  const aspectRatios = ['9:16', '1:1', '16:9', '4:5', '3:2'];

  // Load brands on mount
  useEffect(() => {
    loadBrands();
  }, []);

  // Load brand assets when brand changes
  useEffect(() => {
    if (selectedBrand) {
      loadBrandAssets(selectedBrand.id);
      loadGenerations(selectedBrand.id);
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/production/brands');
      const data = await response.json();
      if (data.success) {
        setBrands(data.brands);
        if (data.brands.length > 0) {
          setSelectedBrand(data.brands[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const loadBrandAssets = async (brandId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/production/brands/${brandId}`);
      const data = await response.json();
      if (data.success) {
        setBrandAssets(data.assets);
      }
    } catch (error) {
      console.error('Failed to load brand assets:', error);
    }
  };

  const loadGenerations = async (brandId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/production/generations?brandId=${brandId}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setGenerations(data.generations);
      }
    } catch (error) {
      console.error('Failed to load generations:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedBrand) return;

    setIsUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'user');
      
      try {
        const response = await fetch(
          `http://localhost:3001/api/production/brands/${selectedBrand.id}/assets`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        const result = await response.json();
        if (result.success) {
          if (result.duplicate) {
            console.log('Asset already exists:', result.asset);
          } else {
            console.log('Asset uploaded:', result.asset);
          }
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    
    setIsUploading(false);
    loadBrandAssets(selectedBrand.id);
  };

  const handleGenerate = async () => {
    if (!selectedBrand || !prompt) {
      alert('Please select a brand and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setCurrentOutputs([]);

    try {
      const response = await fetch('http://localhost:3001/api/production/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand.id,
          model,
          mode,
          prompt,
          params: {
            aspectRatio,
            quality,
            size: aspectRatio === '9:16' ? '1024x1792' : 
                  aspectRatio === '1:1' ? '1024x1024' : '1792x1024'
          },
          referenceAssetIds: selectedAssets,
          userId: 'user'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentOutputs(result.outputs);
        loadGenerations(selectedBrand.id);
      } else {
        alert(`Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveOutput = async (outputId, approved) => {
    try {
      const response = await fetch(`http://localhost:3001/api/production/outputs/${outputId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, savedToBoard: approved })
      });
      
      const result = await response.json();
      if (result.success) {
        // Update local state
        setCurrentOutputs(prev => prev.map(output => 
          output.id === outputId ? { ...output, approved, saved_to_board: approved } : output
        ));
      }
    } catch (error) {
      console.error('Failed to update output:', error);
    }
  };

  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-md border-b border-white border-opacity-10 sticky top-0 z-40 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Production</h1>
            
            {/* Brand Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                {selectedBrand ? selectedBrand.name : 'Select Brand'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showBrandDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showBrandDropdown && (
                <div className="absolute top-full mt-2 w-48 bg-gray-900 rounded-lg shadow-xl overflow-hidden z-50">
                  {brands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setShowBrandDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-white hover:bg-opacity-10 transition-all text-white ${
                        selectedBrand?.id === brand.id ? 'bg-white bg-opacity-20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: brand.color_primary }}
                        />
                        {brand.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white opacity-60 text-sm">
              {brandAssets.length} assets • {generations.length} generations
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-80px)]">
        {/* Left Rail - Brand Assets */}
        <div className="col-span-3 bg-black bg-opacity-30 backdrop-blur-md rounded-xl p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Brand Assets</h3>
            <label className="cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </div>
            </label>
          </div>

          {brandAssets.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-white opacity-30 mx-auto mb-2" />
              <p className="text-white opacity-50 text-sm">Upload reference images</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {brandAssets.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => toggleAssetSelection(asset.id)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                    selectedAssets.includes(asset.id) 
                      ? 'ring-2 ring-blue-500 transform scale-95' 
                      : 'hover:ring-2 hover:ring-white hover:ring-opacity-50'
                  }`}
                >
                  <img 
                    src={asset.thumbnail_url || asset.preview_url} 
                    alt="Brand asset"
                    className="w-full h-24 object-cover"
                  />
                  {selectedAssets.includes(asset.id) && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1">
                    {asset.type === 'video' ? (
                      <Video className="w-3 h-3 text-white" />
                    ) : (
                      <Image className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center - Results Grid */}
        <div className="col-span-6 bg-black bg-opacity-30 backdrop-blur-md rounded-xl p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">Generated Variants</h3>
          
          {currentOutputs.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {currentOutputs.map((output, index) => (
                <div key={output.id} className="bg-white bg-opacity-5 rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-800 relative">
                    <img 
                      src={output.preview_url} 
                      alt={output.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-white font-medium text-sm mb-1">{output.title}</h4>
                    <p className="text-white opacity-60 text-xs mb-3">{output.one_liner}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveOutput(output.id, !output.approved)}
                        className={`flex-1 px-2 py-1 rounded text-xs transition-all ${
                          output.approved 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                        }`}
                      >
                        {output.approved ? <Check className="w-3 h-3 mx-auto" /> : 'Approve'}
                      </button>
                      <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-all">
                        <Save className="w-3 h-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : generations.length > 0 ? (
            <div className="space-y-4">
              {generations.slice(0, 3).map(gen => (
                <div key={gen.id} className="bg-white bg-opacity-5 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-white opacity-60 text-xs">
                        {new Date(gen.created_at).toLocaleDateString()} • {gen.model}
                      </span>
                      <p className="text-white text-sm mt-1">{gen.prompt.slice(0, 100)}...</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      gen.status === 'completed' ? 'bg-green-500 text-white' :
                      gen.status === 'processing' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {gen.status}
                    </span>
                  </div>
                  {gen.generation_outputs && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {gen.generation_outputs.map((output, i) => (
                        <img 
                          key={i}
                          src={output.thumbnail_url || output.preview_url} 
                          alt={`Output ${i}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-white opacity-30 mx-auto mb-2" />
              <p className="text-white opacity-50">No generations yet</p>
              <p className="text-white opacity-30 text-sm mt-1">Enter a prompt and click Generate 3</p>
            </div>
          )}
        </div>

        {/* Right Rail - Generation Controls */}
        <div className="col-span-3 bg-black bg-opacity-30 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4">Generate</h3>
          
          {/* Model Selector */}
          <div className="mb-4">
            <label className="text-white text-sm opacity-80 mb-1 block">Model</label>
            <select 
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                const selectedModel = models.find(m => m.id === e.target.value);
                if (selectedModel && !selectedModel.modes.includes(mode)) {
                  setMode(selectedModel.modes[0]);
                }
              }}
              className="w-full bg-white bg-opacity-10 text-white px-3 py-2 rounded-lg"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Mode Selector */}
          <div className="mb-4">
            <label className="text-white text-sm opacity-80 mb-1 block">Mode</label>
            <div className="flex gap-2">
              {models.find(m => m.id === model)?.modes.map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-2 rounded-lg transition-all ${
                    mode === m 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  {m === 'image' ? <Image className="w-4 h-4 mx-auto" /> : <Video className="w-4 h-4 mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="mb-4">
            <label className="text-white text-sm opacity-80 mb-1 block">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {aspectRatios.map(ar => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    aspectRatio === ar 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="mb-4">
            <label className="text-white text-sm opacity-80 mb-1 block">Quality</label>
            <div className="flex gap-2">
              {['standard', 'hd'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                    quality === q 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Selected References */}
          {selectedAssets.length > 0 && (
            <div className="mb-4">
              <label className="text-white text-sm opacity-80 mb-1 block">
                References ({selectedAssets.length} selected)
              </label>
              <div className="flex gap-1 flex-wrap">
                {selectedAssets.map(id => {
                  const asset = brandAssets.find(a => a.id === id);
                  return asset ? (
                    <div key={id} className="relative">
                      <img 
                        src={asset.thumbnail_url || asset.preview_url} 
                        alt="Reference"
                        className="w-12 h-12 object-cover rounded"
                      />
                      <button
                        onClick={() => toggleAssetSelection(id)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Prompt */}
          <div className="mb-4">
            <label className="text-white text-sm opacity-80 mb-1 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="w-full bg-white bg-opacity-10 text-white px-3 py-2 rounded-lg h-32 resize-none placeholder-white placeholder-opacity-30"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt || !selectedBrand}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              isGenerating || !prompt || !selectedBrand
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate 3
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Production;