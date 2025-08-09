// backend/src/routes/production.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const ProductionService = require('../services/productionService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Initialize service (will be set in main.js)
let productionService;

// Middleware to inject service
router.use((req, res, next) => {
  if (!productionService && req.app.locals.supabaseClient) {
    productionService = new ProductionService(req.app.locals.supabaseClient);
  }
  next();
});

// Get all brands
router.get('/brands', async (req, res) => {
  try {
    const { data, error } = await req.app.locals.supabaseClient
      .from('brands')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json({ success: true, brands: data });
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get brand details with assets
router.get('/brands/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    
    // Get brand
    const { data: brand, error: brandError } = await req.app.locals.supabaseClient
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();
    
    if (brandError) throw brandError;
    
    // Get brand assets
    const { data: assets, error: assetsError } = await req.app.locals.supabaseClient
      .from('brand_assets')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });
    
    if (assetsError) throw assetsError;
    
    res.json({ 
      success: true, 
      brand,
      assets: assets || []
    });
  } catch (error) {
    console.error('Failed to fetch brand details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload brand asset
router.post('/brands/:brandId/assets', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const { brandId } = req.params;
    const userId = req.body.userId || 'system';
    
    const result = await productionService.uploadAsset(req.file, brandId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Asset upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate content
router.post('/generate', async (req, res) => {
  try {
    const { 
      brandId, 
      model, 
      mode, 
      prompt, 
      negativePrompt,
      params,
      referenceAssetIds,
      userId 
    } = req.body;
    
    if (!brandId || !model || !mode || !prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: brandId, model, mode, prompt' 
      });
    }
    
    const result = await productionService.generate({
      brandId,
      model,
      mode,
      prompt,
      negativePrompt,
      params: params || {},
      referenceAssetIds: referenceAssetIds || [],
      userId: userId || 'system'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get generation history
router.get('/generations', async (req, res) => {
  try {
    const { brandId, limit = 20, offset = 0 } = req.query;
    
    let query = req.app.locals.supabaseClient
      .from('generations')
      .select(`
        *,
        generation_outputs (*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      generations: data,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Failed to fetch generations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single generation
router.get('/generations/:generationId', async (req, res) => {
  try {
    const { generationId } = req.params;
    
    const { data, error } = await req.app.locals.supabaseClient
      .from('generations')
      .select(`
        *,
        generation_outputs (*),
        brands (*)
      `)
      .eq('id', generationId)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, generation: data });
  } catch (error) {
    console.error('Failed to fetch generation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve/save output to board
router.post('/outputs/:outputId/approve', async (req, res) => {
  try {
    const { outputId } = req.params;
    const { approved, savedToBoard } = req.body;
    
    const updates = {};
    if (approved !== undefined) updates.approved = approved;
    if (savedToBoard !== undefined) updates.saved_to_board = savedToBoard;
    
    const { data, error } = await req.app.locals.supabaseClient
      .from('generation_outputs')
      .update(updates)
      .eq('id', outputId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, output: data });
  } catch (error) {
    console.error('Failed to update output:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new brand
router.post('/brands', async (req, res) => {
  try {
    const { name, slug, color_primary, aesthetic, tone, musts, nevers, notes } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and slug are required' 
      });
    }
    
    const { data, error } = await req.app.locals.supabaseClient
      .from('brands')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        color_primary: color_primary || '#000000',
        aesthetic,
        tone,
        musts,
        nevers,
        notes
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, brand: data });
  } catch (error) {
    console.error('Failed to create brand:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update brand
router.put('/brands/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const updates = req.body;
    
    const { data, error } = await req.app.locals.supabaseClient
      .from('brands')
      .update(updates)
      .eq('id', brandId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, brand: data });
  } catch (error) {
    console.error('Failed to update brand:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
