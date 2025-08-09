# 🎬 Production Tab Setup Instructions

## Backend Dependencies to Install

```bash
cd backend
npm install sharp multer @supabase/supabase-js
```

## Frontend Integration

To integrate the Production tab into your App.js, make these 3 simple changes:

### 1. Add Import (at the top of App.js)
```javascript
import Production from './components/Production';
```

### 2. Add Tab to Navigation (line ~503)
Change:
```javascript
{['dashboard', 'magic-inbox', 'supa', 'integrations'].map(tab => (
```

To:
```javascript
{['dashboard', 'magic-inbox', 'supa', 'production', 'integrations'].map(tab => (
```

### 3. Add Tab Label (line ~511)
Change:
```javascript
{tab === 'magic-inbox' ? '✨ Magic Inbox' : 
 tab === 'supa' ? '🗄️ SUPA' :
 tab.charAt(0).toUpperCase() + tab.slice(1)}
```

To:
```javascript
{tab === 'magic-inbox' ? '✨ Magic Inbox' : 
 tab === 'supa' ? '🗄️ SUPA' :
 tab === 'production' ? '🎬 Production' :
 tab.charAt(0).toUpperCase() + tab.slice(1)}
```

### 4. Add Component Rendering (line ~927, before integrations)
Add this line:
```javascript
{activeTab === 'production' && <Production />}
```

## Supabase Setup

1. Run the SQL schema in your Supabase dashboard (see `production-schema.sql`)
2. Create a Storage bucket named `production-assets`
3. Set the bucket to public if you want direct URL access

## Environment Variables

Add to your `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
N8N_WEBHOOK_URL=your_n8n_webhook_url (optional)
```

## Testing

1. Restart your backend server
2. Navigate to the Production tab
3. The sample brands (Garage, Nike, Glossier) should appear
4. Try uploading an image and generating content!

## Features

- **Brand Management**: Create and manage multiple brands with unique aesthetics
- **Asset Library**: Upload and organize reference images/videos per brand
- **AI Generation**: Generate 3 variants using OpenAI/DALL-E 3
- **Provider Support**: Ready for Runway, Veo 3, Kling integration via n8n
- **Batch Processing**: Always generates 3 options for A/B testing
- **Approval Workflow**: Mark outputs as approved and save to board

## Troubleshooting

- If brands don't load, check your Supabase connection
- If generation fails, verify your OpenAI API key
- For file uploads, ensure `sharp` is installed in backend
- Check browser console for detailed error messages
