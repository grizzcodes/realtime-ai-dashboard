// backend/src/services/productionService.js
const OpenAI = require('openai');
const sharp = require('sharp');
const crypto = require('crypto');
const fetch = require('node-fetch');

class ProductionService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    // Provider adapters
    this.providers = {
      openai: this.generateWithOpenAI.bind(this),
      runway: this.generateWithRunway.bind(this),
      veo3: this.generateWithVeo.bind(this),
      kling: this.generateWithKling.bind(this)
    };
  }

  // Main generation orchestrator
  async generate({ brandId, model, mode, prompt, negativePrompt, params, referenceAssetIds, userId }) {
    try {
      // Create generation record
      const { data: generation, error: genError } = await this.supabase
        .from('generations')
        .insert({
          brand_id: brandId,
          model,
          mode,
          prompt,
          negative_prompt: negativePrompt,
          params_json: params,
          reference_asset_ids: referenceAssetIds,
          status: 'processing',
          created_by: userId || 'system',
          processing_started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (genError) throw genError;

      // Get brand info and references
      const [brandData, referencesData] = await Promise.all([
        this.getBrand(brandId),
        referenceAssetIds?.length ? this.getAssets(referenceAssetIds) : Promise.resolve([])
      ]);

      // Prepare the orchestrated prompt
      const orchestratedPrompt = await this.buildOrchestrationPrompt({
        brand: brandData,
        references: referencesData,
        userPrompt: prompt,
        params
      });

      // Call the appropriate provider
      const providerFunc = this.providers[model];
      if (!providerFunc) {
        throw new Error(`Provider ${model} not supported`);
      }

      const outputs = await providerFunc({
        prompt: orchestratedPrompt,
        negativePrompt,
        mode,
        params,
        references: referencesData
      });

      // Save outputs to database
      const outputRecords = await Promise.all(
        outputs.map((output, index) => 
          this.saveGenerationOutput(generation.id, index, output)
        )
      );

      // Update generation status
      await this.supabase
        .from('generations')
        .update({
          status: 'completed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', generation.id);

      return {
        success: true,
        generation,
        outputs: outputRecords
      };

    } catch (error) {
      console.error('Generation failed:', error);
      
      // Update generation status to failed
      if (generation?.id) {
        await this.supabase
          .from('generations')
          .update({
            status: 'failed',
            error_message: error.message,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', generation.id);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Build the superprompt with brand context
  async buildOrchestrationPrompt({ brand, references, userPrompt, params }) {
    const systemPrompt = `SYSTEM (Production Generator)
You are Dgenz's production ideation engine. Your job is to output 3 distinct, brand-true visual ideas per run, optimized for fast CGI feasibility and photoreal social frames. You must:
- Read brand context + reference images.
- Be clever, simple, and feasible (studio or light CG).
- Return 3 options in a strict JSON block: each with title, one_liner, visual_description, shot_specs, lighting, materials_fx, practical_build_notes, video_variant.
- Respect brand tone and seasonal brief.
- Prefer clean compositions, one iconic idea per frame, minimal VFX overhead, and clear product/logo integration.
- Avoid cringe; be witty, contemporary, and scroll-stopping.

OUTPUT FORMAT (return ONLY this JSON):
{
  "variants": [
    {
      "title": "",
      "one_liner": "",
      "visual_description": "",
      "shot_specs": { "lens_mm": "", "camera_move": "", "framing": "", "ar": "" },
      "lighting": "",
      "materials_fx": "",
      "practical_build_notes": "",
      "video_variant": { "duration_s": 6, "beats": ["", ""], "transition": "" }
    },
    { ... }, { ... }
  ]
}

NEGATIVE DIRECTION: No cluttered collages, no over-branded spam, no uncanny faces, no messy typography. Keep it premium, realistic, and simple.`;

    // Build reference descriptions
    const referenceDescriptions = references.map((ref, i) => 
      `${ref.preview_url} — ${ref.tags?.join(', ') || 'reference image'}`
    ).join('\n');

    const contextPrompt = `Context:
Brand: ${brand.name}
Goal: Generate 3 photoreal CGI-friendly frames that are witty, minimal, and production-feasible in 1 week.
Primary Platforms: IG/TT (9:16 & 1:1).

References (visual anchors):
${referenceDescriptions}

Brand DNA (succinct):
- Aesthetic: ${brand.aesthetic || 'modern, clean'}
- Color accents: ${brand.color_primary}
- Tone: ${brand.tone || 'professional'}
- Must-haves: ${brand.musts || 'brand consistency'}
- Off-limits: ${brand.nevers || 'competitor references'}

In-frame priorities: Product/logo readable; 1 hero move or reveal max; keep prop + set list simple.

User Request: ${userPrompt}

Deliver: 3 variants in the JSON format above.`;

    return `${systemPrompt}\n\n${contextPrompt}`;
  }

  // OpenAI/DALL-E adapter
  async generateWithOpenAI({ prompt, negativePrompt, mode, params }) {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      // First, get the creative concepts using GPT-4
      const conceptResponse = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate 3 production concepts as specified.' }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8
      });

      const concepts = JSON.parse(conceptResponse.choices[0].message.content);

      // Generate images for each concept if in image mode
      const outputs = [];
      for (let i = 0; i < 3; i++) {
        const variant = concepts.variants[i];
        let outputUrl = '';
        
        if (mode === 'image') {
          // Generate image with DALL-E 3
          const imageResponse = await this.openai.images.generate({
            model: 'dall-e-3',
            prompt: `${variant.visual_description}. Style: photoreal, professional product photography. ${params.style || ''}`,
            n: 1,
            size: params.size || '1792x1024',
            quality: params.quality || 'hd',
            style: 'natural'
          });
          
          outputUrl = imageResponse.data[0].url;
        }

        outputs.push({
          ...variant,
          output_url: outputUrl || 'https://via.placeholder.com/1792x1024',
          preview_url: outputUrl || 'https://via.placeholder.com/1792x1024',
          seed: `openai-${Date.now()}-${i}`,
          meta: {
            model: 'dall-e-3',
            revised_prompt: variant.visual_description
          }
        });
      }

      return outputs;
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw error;
    }
  }

  // Runway adapter (via n8n webhook)
  async generateWithRunway({ prompt, mode, params }) {
    if (!process.env.N8N_WEBHOOK_URL) {
      throw new Error('n8n webhook not configured for Runway');
    }

    try {
      const response = await fetch(`${process.env.N8N_WEBHOOK_URL}/runway-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode,
          params,
          callback_url: `${process.env.API_BASE_URL}/webhooks/runway-complete`
        })
      });

      const result = await response.json();
      
      // For now, return placeholder data
      // In production, this would trigger async job and update via webhook
      return Array(3).fill(null).map((_, i) => ({
        title: `Runway Concept ${i + 1}`,
        one_liner: 'AI-generated video concept',
        visual_description: prompt,
        output_url: 'https://via.placeholder.com/1920x1080',
        preview_url: 'https://via.placeholder.com/1920x1080',
        seed: `runway-${Date.now()}-${i}`,
        meta: { provider: 'runway', status: 'processing' }
      }));
    } catch (error) {
      console.error('Runway generation failed:', error);
      throw error;
    }
  }

  // Veo adapter (via n8n webhook)
  async generateWithVeo({ prompt, mode, params }) {
    // Similar to Runway, integrate with n8n
    return Array(3).fill(null).map((_, i) => ({
      title: `Veo Concept ${i + 1}`,
      one_liner: 'AI-generated concept',
      visual_description: prompt,
      output_url: 'https://via.placeholder.com/1920x1080',
      preview_url: 'https://via.placeholder.com/1920x1080',
      seed: `veo-${Date.now()}-${i}`,
      meta: { provider: 'veo3', status: 'processing' }
    }));
  }

  // Kling adapter (via n8n webhook)
  async generateWithKling({ prompt, mode, params }) {
    // Similar to Runway, integrate with n8n
    return Array(3).fill(null).map((_, i) => ({
      title: `Kling Concept ${i + 1}`,
      one_liner: 'AI-generated concept',
      visual_description: prompt,
      output_url: 'https://via.placeholder.com/1920x1080',
      preview_url: 'https://via.placeholder.com/1920x1080',
      seed: `kling-${Date.now()}-${i}`,
      meta: { provider: 'kling', status: 'processing' }
    }));
  }

  // Helper: Get brand info
  async getBrand(brandId) {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Helper: Get reference assets
  async getAssets(assetIds) {
    const { data, error } = await this.supabase
      .from('brand_assets')
      .select('*')
      .in('id', assetIds);
    
    if (error) throw error;
    return data || [];
  }

  // Helper: Save generation output
  async saveGenerationOutput(generationId, index, output) {
    const { data, error } = await this.supabase
      .from('generation_outputs')
      .insert({
        generation_id: generationId,
        index_position: index,
        output_url: output.output_url,
        preview_url: output.preview_url,
        thumbnail_url: output.thumbnail_url,
        seed: output.seed,
        title: output.title,
        one_liner: output.one_liner,
        visual_description: output.visual_description,
        shot_specs: output.shot_specs,
        lighting: output.lighting,
        materials_fx: output.materials_fx,
        practical_build_notes: output.practical_build_notes,
        video_variant: output.video_variant,
        meta_json: output.meta
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Upload and compress asset
  async uploadAsset(file, brandId, userId) {
    try {
      // Generate SHA256 hash
      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Check if already exists
      const { data: existing } = await this.supabase
        .from('brand_assets')
        .select('*')
        .eq('brand_id', brandId)
        .eq('sha256', hash)
        .single();
      
      if (existing) {
        return { success: true, asset: existing, duplicate: true };
      }

      // Process image with sharp
      let metadata = {};
      let previewBuffer;
      let thumbnailBuffer;
      
      if (file.mimetype.startsWith('image/')) {
        const image = sharp(buffer);
        metadata = await image.metadata();
        
        // Create preview (WebP, max 1920px)
        previewBuffer = await image
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        
        // Create thumbnail (WebP, 400px)
        thumbnailBuffer = await image
          .resize(400, 400, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      }

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const basePath = `brands/${brandId}`;
      
      // Upload original
      const originalPath = `${basePath}/original/${hash}-${timestamp}.${ext}`;
      const { error: origError } = await this.supabase.storage
        .from('production-assets')
        .upload(originalPath, buffer, {
          contentType: file.mimetype,
          upsert: false
        });
      
      if (origError) throw origError;

      // Upload preview
      const previewPath = `${basePath}/preview/${hash}-${timestamp}.webp`;
      if (previewBuffer) {
        await this.supabase.storage
          .from('production-assets')
          .upload(previewPath, previewBuffer, {
            contentType: 'image/webp',
            upsert: false
          });
      }

      // Upload thumbnail
      const thumbnailPath = `${basePath}/thumbnail/${hash}-${timestamp}.webp`;
      if (thumbnailBuffer) {
        await this.supabase.storage
          .from('production-assets')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/webp',
            upsert: false
          });
      }

      // Get public URLs
      const { data: { publicUrl: originalUrl } } = this.supabase.storage
        .from('production-assets')
        .getPublicUrl(originalPath);
      
      const { data: { publicUrl: previewUrl } } = this.supabase.storage
        .from('production-assets')
        .getPublicUrl(previewPath);
      
      const { data: { publicUrl: thumbnailUrl } } = this.supabase.storage
        .from('production-assets')
        .getPublicUrl(thumbnailPath);

      // Save to database
      const { data: asset, error: assetError } = await this.supabase
        .from('brand_assets')
        .insert({
          brand_id: brandId,
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          original_url: originalUrl,
          preview_url: previewUrl || originalUrl,
          thumbnail_url: thumbnailUrl || previewUrl,
          sha256: hash,
          width: metadata.width,
          height: metadata.height,
          file_size_bytes: buffer.length,
          created_by: userId || 'system'
        })
        .select()
        .single();

      if (assetError) throw assetError;

      return { success: true, asset };
    } catch (error) {
      console.error('Asset upload failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ProductionService;
