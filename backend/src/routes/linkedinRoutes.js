// backend/src/routes/linkedinRoutes.js
const express = require('express');
const router = express.Router();
const LinkedInService = require('../services/linkedinService');

const linkedInService = new LinkedInService();

// LinkedIn OAuth routes
router.get('/auth', (req, res) => {
  const authUrl = linkedInService.getAuthorizationUrl();
  res.redirect(authUrl);
});

router.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.send(`❌ LinkedIn authorization failed: ${error}`);
  }
  
  if (!code) {
    return res.send('❌ No authorization code received');
  }
  
  try {
    // Exchange code for token
    const tokenResult = await linkedInService.exchangeCodeForToken(code);
    
    if (!tokenResult.success) {
      return res.send(`❌ Token exchange failed: ${tokenResult.error}`);
    }
    
    // Get user profile
    const profileResult = await linkedInService.getUserProfile(tokenResult.accessToken);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0077B5 0%, #00A0DC 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h2 { color: #0077B5; }
          .profile {
            background: #f3f6f8;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .token-box {
            background: #f7fafc;
            border: 1px solid #cbd5e0;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
          }
          textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #cbd5e0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
          }
          .btn {
            display: inline-block;
            background: #0077B5;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            margin-top: 20px;
          }
          .features {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .features ul {
            margin: 10px 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>✅ LinkedIn Connected Successfully!</h2>
          
          ${profileResult.success ? `
            <div class="profile">
              <h3>Connected Account</h3>
              <p><strong>Name:</strong> ${profileResult.profile.firstName} ${profileResult.profile.lastName}</p>
              <p><strong>Email:</strong> ${profileResult.profile.email}</p>
            </div>
          ` : ''}
          
          <div class="features">
            <h4>✨ Now You Can:</h4>
            <ul>
              <li>Share production content directly to LinkedIn</li>
              <li>Post as yourself or your company pages</li>
              <li>Schedule posts for optimal engagement</li>
              <li>Track post performance and analytics</li>
            </ul>
          </div>
          
          <div class="token-box">
            <p><strong>Save this access token to your .env file:</strong></p>
            <textarea rows="3" readonly onclick="this.select()">LINKEDIN_ACCESS_TOKEN=${tokenResult.accessToken}</textarea>
            <p><small>Token expires in ${Math.floor(tokenResult.expiresIn / 86400)} days</small></p>
          </div>
          
          <div style="text-align: center;">
            <a href="http://localhost:3000" class="btn">← Back to Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    res.send(`❌ OAuth failed: ${error.message}`);
  }
});

// Test connection
router.get('/test', async (req, res) => {
  const result = await linkedInService.testConnection();
  res.json(result);
});

// Get user profile
router.get('/profile', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || process.env.LINKEDIN_ACCESS_TOKEN;
  const result = await linkedInService.getUserProfile(accessToken);
  res.json(result);
});

// Get organizations user can post as
router.get('/organizations', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || process.env.LINKEDIN_ACCESS_TOKEN;
  const result = await linkedInService.getAdminOrganizations(accessToken);
  res.json(result);
});

// Share content
router.post('/share', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || process.env.LINKEDIN_ACCESS_TOKEN;
  const { text, title, description, url, imageUrl, visibility } = req.body;
  
  const result = await linkedInService.shareContent({
    accessToken,
    text,
    title,
    description,
    url,
    imageUrl,
    visibility
  });
  
  res.json(result);
});

// Share as organization
router.post('/share/organization', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || process.env.LINKEDIN_ACCESS_TOKEN;
  const { organizationId, text, title, description, url, imageUrl } = req.body;
  
  const result = await linkedInService.shareAsOrganization({
    accessToken,
    organizationId,
    text,
    title,
    description,
    url,
    imageUrl
  });
  
  res.json(result);
});

// Upload image
router.post('/upload-image', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '') || process.env.LINKEDIN_ACCESS_TOKEN;
  const { imagePath } = req.body;
  
  const result = await linkedInService.uploadImage(accessToken, imagePath);
  res.json(result);
});

module.exports = router;