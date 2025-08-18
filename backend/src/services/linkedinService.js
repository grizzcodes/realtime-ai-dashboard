// backend/src/services/linkedinService.js
const axios = require('axios');

class LinkedInService {
  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback';
    this.accessToken = null;
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state = '') {
    const scopes = [
      'r_liteprofile',           // Basic profile
      'r_emailaddress',           // Email address
      'w_member_social',          // Post on behalf of user
      'r_organization_social',    // Read company data
      'w_organization_social',    // Post as company
      'rw_organization_admin'     // Manage company pages
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state: state
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('LinkedIn token exchange failed:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Get user profile
  async getUserProfile(accessToken = null) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      return { success: false, error: 'No access token available' };
    }

    try {
      // Get basic profile
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      // Get email
      const emailResponse = await axios.get(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const profile = profileResponse.data;
      const email = emailResponse.data.elements[0]['handle~'].emailAddress;

      return {
        success: true,
        profile: {
          id: profile.id,
          firstName: profile.localizedFirstName,
          lastName: profile.localizedLastName,
          email: email,
          profilePicture: profile.profilePicture?.['displayImage~']?.elements[0]?.identifiers[0]?.identifier
        }
      };
    } catch (error) {
      console.error('Failed to get LinkedIn profile:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Share content on LinkedIn
  async shareContent({ 
    accessToken = null, 
    text, 
    title, 
    description, 
    url, 
    imageUrl,
    visibility = 'PUBLIC' 
  }) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      return { success: false, error: 'No access token available' };
    }

    try {
      // First, get the user's LinkedIn ID
      const profileResult = await this.getUserProfile(token);
      if (!profileResult.success) {
        return profileResult;
      }

      const authorId = `urn:li:person:${profileResult.profile.id}`;

      // Build the share content
      const shareContent = {
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text || ''
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
      };

      // Add article/link content if URL is provided
      if (url) {
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: url,
          title: {
            text: title || 'Shared from DGenz AI Hub'
          },
          description: {
            text: description || ''
          }
        }];

        // Add thumbnail if provided
        if (imageUrl) {
          shareContent.specificContent['com.linkedin.ugc.ShareContent'].media[0].thumbnails = [{
            url: imageUrl
          }];
        }
      }

      // Share the content
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        shareContent,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        postId: response.data.id,
        message: 'Content shared successfully on LinkedIn'
      };
    } catch (error) {
      console.error('Failed to share on LinkedIn:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Upload image to LinkedIn
  async uploadImage(accessToken, imagePath) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      return { success: false, error: 'No access token available' };
    }

    try {
      // Step 1: Register upload
      const profileResult = await this.getUserProfile(token);
      if (!profileResult.success) {
        return profileResult;
      }

      const registerResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${profileResult.profile.id}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Step 2: Upload the image
      // This would need to read the actual image file
      // For now, returning the upload URL for frontend handling
      
      return {
        success: true,
        uploadUrl,
        asset,
        message: 'Upload URL generated. Please upload the image to the provided URL.'
      };
    } catch (error) {
      console.error('Failed to upload image to LinkedIn:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Get company pages the user administers
  async getAdminOrganizations(accessToken = null) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      return { success: false, error: 'No access token available' };
    }

    try {
      const response = await axios.get(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName,vanityName,logoV2(original~:playableStreams))))',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const organizations = response.data.elements.map(element => ({
        id: element.organizationalTarget,
        name: element['organizationalTarget~'].localizedName,
        vanityName: element['organizationalTarget~'].vanityName,
        logo: element['organizationalTarget~'].logoV2?.['original~']?.elements[0]?.identifiers[0]?.identifier
      }));

      return {
        success: true,
        organizations
      };
    } catch (error) {
      console.error('Failed to get organizations:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Share as organization/company
  async shareAsOrganization({
    accessToken = null,
    organizationId,
    text,
    title,
    description,
    url,
    imageUrl
  }) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      return { success: false, error: 'No access token available' };
    }

    try {
      const shareContent = {
        author: organizationId, // Organization URN
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text || ''
            },
            shareMediaCategory: url ? 'ARTICLE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add article content if URL provided
      if (url) {
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: url,
          title: { text: title || '' },
          description: { text: description || '' }
        }];

        if (imageUrl) {
          shareContent.specificContent['com.linkedin.ugc.ShareContent'].media[0].thumbnails = [{
            url: imageUrl
          }];
        }
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        shareContent,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        postId: response.data.id,
        message: 'Content shared successfully as organization'
      };
    } catch (error) {
      console.error('Failed to share as organization:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Test connection
  async testConnection() {
    if (!this.clientId || !this.clientSecret) {
      return {
        success: false,
        error: 'LinkedIn API credentials not configured'
      };
    }

    return {
      success: true,
      message: 'LinkedIn API configured',
      authUrl: this.getAuthorizationUrl()
    };
  }
}

module.exports = LinkedInService;