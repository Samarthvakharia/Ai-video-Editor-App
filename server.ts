import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit for image uploads if necessary
app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client to avoid crashes if API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/**
 * 1. Start Video Generation (Veo 3)
 * Model: veo-3.1-fast-generate-preview
 */
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, aspectRatio, resolution = "720p" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required for video generation" });
    }

    const ai = getGeminiClient();

    console.log(`Starting Veo 3 video generation for prompt: "${prompt}" [Aspect: ${aspectRatio}]`);

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution, // '720p' or '1080p'
        aspectRatio: aspectRatio || "16:9", // '16:9' or '9:16'
      },
    });

    res.json({
      success: true,
      operationName: operation.name,
      message: "Video generation operation successfully started"
    });
  } catch (error: any) {
    console.error("Error starting video generation:", error);
    res.status(500).json({ error: error.message || "Failed to start video generation" });
  }
});

/**
 * 2. Poll Video Generation Status
 */
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: "Operation name is required" });
    }

    const ai = getGeminiClient();

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({
      done: updated.done,
      error: updated.error,
      // If done, send the response details (contains generated video array)
      response: updated.response
    });
  } catch (error: any) {
    console.error("Error polling video status:", error);
    res.status(500).json({ error: error.message || "Failed to check operation status" });
  }
});

/**
 * 3. Stream/Download the Generated Video
 */
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;

    if (!operationName) {
      return res.status(400).json({ error: "Operation name is required" });
    }

    const ai = getGeminiClient();

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: "Video URI not found or video is still generating" });
    }

    console.log(`Downloading video from storage uri: ${uri}`);

    const apiKey = process.env.GEMINI_API_KEY;
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey || "" },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video from remote storage: ${videoRes.statusText}`);
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "attachment; filename=\"veo-generated-video.mp4\"");

    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error("Error downloading video:", error);
    res.status(500).json({ error: error.message || "Failed to download video file" });
  }
});

/**
 * 4. AI-Powered Color Grading Suggestion
 * Translates natural language mood prompts (e.g., "moody Blade Runner neon") into
 * exact color parameters and preset recommendations.
 */
app.post("/api/suggest-color-grading", async (req, res) => {
  try {
    const { moodPrompt } = req.body;

    if (!moodPrompt) {
      return res.status(400).json({ error: "Mood prompt is required" });
    }

    const ai = getGeminiClient();

    console.log(`Analyzing mood prompt for color grading: "${moodPrompt}"`);

    const systemInstruction = `
      You are an expert colorist and cinematographer for professional film and video editing.
      Your job is to translate a natural language mood description into precise color grading parameters.
      
      Always respond in strict JSON format.
      The output JSON must strictly match this schema structure:
      {
        "exposure": number, // -100 to 100. Default is 0.
        "contrast": number, // -100 to 100. Default is 0.
        "saturation": number, // -100 to 100. Default is 0.
        "temperature": number, // -100 to 100. Negative is cooler (blue), positive is warmer (orange).
        "tint": number, // -100 to 100. Negative is green, positive is magenta.
        "highlights": number, // -100 to 100. Default is 0.
        "shadows": number, // -100 to 100. Default is 0.
        "vignette": number, // 0 to 100. Default is 0.
        "lutPreset": string, // Recommended preset choice. Must be one of: 'none', 'cinematic', 'cyberpunk', 'retro', 'noir', 'warm-sunset', 'dreamy'
        "explanation": string, // A professional cinematographic explanation of why these settings create the requested mood.
        "accentColor": string // A hex color that represents the tone of this color grade.
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Design a custom LUT/color grading profile for this mood prompt: "${moodPrompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exposure: { type: Type.NUMBER, description: "Exposure offset from -100 to 100" },
            contrast: { type: Type.NUMBER, description: "Contrast adjustment from -100 to 100" },
            saturation: { type: Type.NUMBER, description: "Saturation level from -100 to 100" },
            temperature: { type: Type.NUMBER, description: "White balance temperature from -100 to 100" },
            tint: { type: Type.NUMBER, description: "White balance tint from -100 to 100" },
            highlights: { type: Type.NUMBER, description: "Highlights level from -100 to 100" },
            shadows: { type: Type.NUMBER, description: "Shadows depth from -100 to 100" },
            vignette: { type: Type.NUMBER, description: "Vignette strength from 0 to 100" },
            lutPreset: { type: Type.STRING, description: "Base LUT preset option. Must be: 'none', 'cinematic', 'cyberpunk', 'retro', 'noir', 'warm-sunset', 'dreamy'" },
            explanation: { type: Type.STRING, description: "Cinematographic explanation" },
            accentColor: { type: Type.STRING, description: "Representative Hex Color for the grade" }
          },
          required: ["exposure", "contrast", "saturation", "temperature", "tint", "highlights", "shadows", "vignette", "lutPreset", "explanation", "accentColor"]
        }
      }
    });

    const output = JSON.parse(response.text?.trim() || "{}");
    res.json(output);
  } catch (error: any) {
    console.error("Error generating color grading:", error);
    res.status(500).json({ error: error.message || "Failed to generate color grading settings" });
  }
});

/**
 * 5. AI-Powered Scene Transition Generator
 * Compares descriptions of two adjacent video clips to recommend the perfect
 * transition style, timing, and aesthetic justification.
 */
app.post("/api/suggest-transition", async (req, res) => {
  try {
    const { clipAPrompt, clipBPrompt, transitionIdea } = req.body;

    if (!clipAPrompt || !clipBPrompt) {
      return res.status(400).json({ error: "Clip A description and Clip B description are required" });
    }

    const ai = getGeminiClient();

    console.log(`Analyzing transition bridge. Clip A: "${clipAPrompt}" -> Clip B: "${clipBPrompt}" [Aspiration: ${transitionIdea || "Seamless transition"}]`);

    const systemInstruction = `
      You are a world-class visual effects editor and match-cut director.
      Your goal is to bridge two scenes (Clip A and Clip B) with a brilliant transition.
      
      The available transition types in our playback engine are:
      - 'crossfade' (Standard soft overlay dissolve)
      - 'zoom' (Dynamic zooming blur cut)
      - 'wipe-left' (Sliding edge from right to left)
      - 'wipe-right' (Sliding edge from left to right)
      - 'glitch' (Digital static chromatic distortion transition)
      - 'ripple' (Fluid water wave distortion effect)
      - 'slide-left' (Whole screen pushes left)
      - 'slide-right' (Whole screen pushes right)
      - 'spin' (Rotating radial blur whip-pan)

      Analyze the visual contents of Clip A and Clip B. Consider their lighting, motion, themes, and dominant colors.
      If a specific theme is desired (provided as transitionIdea), shape your choice around that request.
      
      Output a strict JSON response with the following schema:
      {
        "transitionType": string, // One of the valid transition types listed above
        "duration": number, // Recommended duration in seconds (0.5 to 2.5)
        "title": string, // An evocative, professional name for this transition cut (e.g. "Sunset Burn Cut", "Analog Static Dissolve")
        "justification": string, // Editorial analysis explaining why this transition type fits best (e.g. matching motion directions, color contrast, thematic bridge)
        "veoPrompt": string // A creative text prompt that could be fed into Veo 3 to generate an organic, morphed 2-second visual transition bridging Clip A and Clip B.
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Create the transition bridge.
        Clip A description: "${clipAPrompt}"
        Clip B description: "${clipBPrompt}"
        User Aspiration/Idea: "${transitionIdea || "Seamless and stylish cinematic link"}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transitionType: { type: Type.STRING, description: "Type of transition to apply" },
            duration: { type: Type.NUMBER, description: "Duration in seconds (0.5 to 2.5)" },
            title: { type: Type.STRING, description: "Evocative name of the transition design" },
            justification: { type: Type.STRING, description: "Professional editorial justification" },
            veoPrompt: { type: Type.STRING, description: "Prompt for Veo 3 to generate a physical morph clip bridging A and B" }
          },
          required: ["transitionType", "duration", "title", "justification", "veoPrompt"]
        }
      }
    });

    const output = JSON.parse(response.text?.trim() || "{}");
    res.json(output);
  } catch (error: any) {
    console.error("Error generating transition suggestion:", error);
    res.status(500).json({ error: error.message || "Failed to generate transition suggestions" });
  }
});


// -------------------------------------------------------------
// Serve Application Frontend
// -------------------------------------------------------------

async function startServer() {
  // Vite dev server middleware in non-production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving static distribution from: ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Video Editor Server running on http://localhost:${PORT}`);
    console.log(`📱 Production ready for Cloud Run on 0.0.0.0:3000`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error("Critical failure during server startup:", err);
  process.exit(1);
});
