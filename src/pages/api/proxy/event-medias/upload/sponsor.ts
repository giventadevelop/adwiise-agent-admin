import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getRawBody } from '@/lib/getRawBody';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle multipart form data
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!API_BASE_URL) {
      res.status(500).json({ error: "API base URL not configured" });
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
    }

    const { eventId, entityId, imageType, title, description, isPublic, tenantId } = req.query;

    // eventId can be 0 or "0" for main sponsors page (sponsors not yet associated with events)
    // Check if eventId is missing (undefined or null), but allow 0
    const eventIdValue = Array.isArray(eventId) ? eventId[0] : eventId;
    if (eventIdValue === undefined || eventIdValue === null || eventIdValue === '' || !entityId || !imageType || !title) {
      return res.status(400).json({ error: 'Missing required parameters: eventId, entityId, imageType, title' });
    }

    // Validate entityId
    const entityIdStr = Array.isArray(entityId) ? entityId[0] : entityId;
    const entityIdInt = parseInt(entityIdStr);
    if (isNaN(entityIdInt)) {
      return res.status(400).json({ error: 'Invalid entityId: must be a valid integer' });
    }

    // Get values from query parameters (eventIdValue already extracted above)
    const imageTypeValue = Array.isArray(imageType) ? imageType[0] : imageType;
    const titleValue = Array.isArray(title) ? title[0] : title;
    const descriptionValue = Array.isArray(description) ? description[0] || 'Uploaded image' : description || 'Uploaded image';
    const tenantIdValue = Array.isArray(tenantId) ? tenantId[0] : tenantId || process.env.NEXT_PUBLIC_TENANT_ID || 'tenant_demo_001';
    const isPublicValue = Array.isArray(isPublic) ? isPublic[0] : isPublic;
    const isPublicBoolean = String(isPublicValue) === 'true';

    // Use the Swagger API specification endpoint (backend expects /upload/sponsor-image)
    const apiUrl = `${API_BASE_URL}/api/event-medias/upload/sponsor-image`;

    // Build query string according to Swagger specification
    const queryParams = new URLSearchParams({
      eventId: eventIdValue,
      entityId: String(entityIdInt),
      imageType: imageTypeValue, // Now sends LOGO_IMAGE, HERO_IMAGE, BANNER_IMAGE
      title: titleValue,
      description: descriptionValue,
      tenantId: tenantIdValue,
      isPublic: isPublicBoolean.toString()
    });

    const apiUrlWithParams = `${apiUrl}?${queryParams.toString()}`;

    console.log('🔍 Sponsor Image Upload Proxy Debug:');
    console.log('📋 Values:', {
      entityId: entityIdInt,
      eventId: eventIdValue,
      imageType: imageTypeValue,
      title: titleValue,
      description: descriptionValue,
      isPublic: isPublicBoolean
    });
    console.log('🔗 Backend URL with params:', apiUrlWithParams);

    const rawBody = await getRawBody(req);

    // Get JWT token
    let token = await getCachedApiJwt();
    if (!token) {
      token = await generateApiJwt();
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantIdValue,
      'content-length': String(rawBody.length),
    };

    if (req.headers['content-type']) {
      headers['content-type'] = Array.isArray(req.headers['content-type'])
        ? req.headers['content-type'][0]
        : req.headers['content-type'];
      console.log('🔧 Content-Type from request:', headers['content-type']);
    }

    console.log('🔧 Final headers being sent to backend:', headers);
    console.log('🔧 Final URL being called:', apiUrlWithParams);

    const apiRes = await fetch(apiUrlWithParams, {
      method: 'POST',
      headers,
      body: rawBody,
    });

    console.log('🔧 Backend response status:', apiRes.status);

    if (apiRes.status >= 200 && apiRes.status < 300) {
      const text = await apiRes.text();
      console.log('✅ Sponsor Image Upload Proxy: Backend upload successful - HTTP status:', apiRes.status);
      res.status(apiRes.status);
      res.setHeader('Content-Type', apiRes.headers.get('content-type') || 'application/json');
      res.send(text);
      return;
    }

    let backendDetail = '';
    try {
      backendDetail = await apiRes.text();
    } catch {
      /* ignore */
    }
    console.error('❌ Sponsor Image Upload Proxy: Backend upload failed - HTTP status:', apiRes.status, backendDetail.slice(0, 1000));
    res.status(apiRes.status >= 400 ? apiRes.status : 500).json({
      error: 'Sponsor image upload failed',
      status: apiRes.status,
      message: backendDetail || `Upload operation failed with HTTP status ${apiRes.status}`,
      success: false
    });
  } catch (err) {
    console.error('Sponsor image upload proxy error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}

