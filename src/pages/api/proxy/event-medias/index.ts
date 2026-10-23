import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedApiJwt } from "@/lib/api/jwt";
import { fetchWithJwtRetry } from "@/lib/proxyHandler";
import { getRawBody } from "@/lib/getRawBody";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    console.error("API base URL not configured");
    res.status(500).json({ error: "API base URL not configured" });
    return;
  }

  try {
    const token = await getCachedApiJwt();
    const { method, query } = req;

    let apiUrl = `${API_BASE_URL}/api/event-medias`;
    // Forward query params (e.g., eventId)
    const params = new URLSearchParams();
    for (const key in query) {
      const value = query[key];
      if (Array.isArray(value)) value.forEach(v => params.append(key, v));
      else if (typeof value !== 'undefined') params.append(key, value);
    }
    const qs = params.toString();
    if (qs) apiUrl += `?${qs}`;

    console.log(`Event media proxy: ${method} ${apiUrl}`);

    if (method === "POST" && String(req.headers["content-type"] || "").includes("application/json")) {
      const rawBody = (await getRawBody(req)).toString("utf-8");
      const apiRes = await fetchWithJwtRetry(
        apiUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: rawBody,
        },
        "event-medias-json"
      );
      const text = await apiRes.text();
      res.status(apiRes.status);
      if (!apiRes.ok) {
        console.error(`Event media JSON proxy error: ${apiRes.status} ${text}`);
      }
      try {
        res.json(text ? JSON.parse(text) : {});
      } catch {
        res.send(text);
      }
      return;
    }

    if (method === "POST") {
      // Forward multipart/form-data
      const fetch = (await import("node-fetch")).default;
      const headers = { ...req.headers, authorization: `Bearer ${token}` };
      delete headers["host"];
      delete headers["connection"];
      // Sanitize headers
      const sanitizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) sanitizedHeaders[key] = value.join("; ");
        else if (typeof value === "string") sanitizedHeaders[key] = value;
      }
      const apiRes = await fetch(apiUrl, {
        method: "POST",
        headers: sanitizedHeaders,
        body: req,
      });
      res.status(apiRes.status);
      apiRes.body.pipe(res);
      return;
    }

    if (method === "GET") {
      const fetch = (await import("node-fetch")).default;
      const apiRes = await fetch(apiUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`Event media proxy response: ${apiRes.status} ${apiRes.statusText}`);

      if (!apiRes.ok) {
        console.error(`Event media proxy error: ${apiRes.status} ${apiRes.statusText}`);
        const errorText = await apiRes.text();
        console.error(`Event media proxy error body: ${errorText}`);
        res.status(apiRes.status).json({
          error: `Backend API error: ${apiRes.status} ${apiRes.statusText}`,
          details: errorText
        });
        return;
      }

      // Check content type to handle different response types
      const contentType = apiRes.headers.get('content-type');
      console.log(`Event media proxy content-type: ${contentType}`);

      if (contentType && contentType.includes('application/json')) {
        const data = await apiRes.json();
        console.log(`Event media proxy success: JSON response with ${Array.isArray(data) ? data.length : 1} items`);
        res.status(apiRes.status).json(data);
      } else {
        // Handle non-JSON responses (shouldn't happen for this endpoint)
        const data = await apiRes.text();
        console.log(`Event media proxy success: Text response with ${data.length} characters`);
        res.status(apiRes.status).send(data);
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Event media proxy error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}