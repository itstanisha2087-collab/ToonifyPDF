/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { CartoonStory } from "../types";

/**
 * Returns a new instance of GoogleGenAI using the best available API key.
 * Always create a fresh instance before each call to ensure the latest key is used.
 */
function getAIInstance() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
}

export async function generateCartoonScript(pdfText: string): Promise<CartoonStory> {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Transform the following text into a kid-friendly animated cartoon script with 5-7 scenes. 
    Each scene should have a catchy title, a clear narration for kids, and a detailed visual prompt for an image generator (describe characters' outfits, colors, and the 'cartoon' style explicitly).
    
    IMPORTANT: Pick 1-2 main characters and describe them identically in every scene's visual prompt to maintain consistency. The style should be vibrant, 2D vector-style cartoons with solid outlines, similar to 'Bluey' or 'Hilda'. Avoid complex textures.
    
    Text: ${pdfText.substring(0, 10000)}`, // Limit text for safety
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                narration: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
              },
              required: ["title", "narration", "visualPrompt"],
            },
          },
        },
        required: ["title", "scenes"],
      },
    },
  });

  if (!response.text) throw new Error("Failed to generate script");
  return JSON.parse(response.text);
}

export async function generateCartoonImage(prompt: string): Promise<string> {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { text: `A vibrant, high-quality, kid-friendly cartoon illustration: ${prompt}. Solid colors, thick outlines, friendly characters.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      }
    }
  });

  // Find the image part
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

export async function generateCartoonVideo(prompt: string, onStatusUpdate?: (status: string) => void): Promise<string> {
  const ai = getAIInstance();
  onStatusUpdate?.("Sparking the engine...");
  
  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: `A vibrant 3D animated cartoon scene: ${prompt}. Cute characters, smooth animations, bright lighting, high quality 3D render.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } catch (err: any) {
    if (err.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_NOT_FOUND");
    }
    throw err;
  }

  onStatusUpdate?.("Bringing characters to life...");

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    operation = await ai.operations.getVideosOperation({ operation });
    
    // Optional: give progress hints based on model behavior if available
    if (Math.random() > 0.7) {
      const messages = [
        "Mixing the color palette...",
        "Perfecting the physics...",
        "Adding a dash of magic...",
        "Polishing the frames..."
      ];
      onStatusUpdate?.(messages[Math.floor(Math.random() * messages.length)]);
    }
  }

  if (operation.response && 'generatedVideos' in operation.response) {
    const video = (operation.response as any).generatedVideos[0];
    const base64Video = video.video.videoBytes;
    return `data:video/mp4;base64,${base64Video}`;
  }

  throw new Error("Video generation failed");
}
