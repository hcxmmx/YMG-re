/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {GoogleGenAI} from '@google/genai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI;

async function generateContentFromVertexAI() {
  const ai = new GoogleGenAI({
    vertexai: true,
    apiKey: GOOGLE_API_KEY,
  });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: 'why is the sky blue?',
  });
  console.debug(response.text);
}

async function main() {
  if (GOOGLE_GENAI_USE_VERTEXAI) {
    await generateContentFromVertexAI().catch((e) =>
      console.error('got error', e),
    );
  } else {
    console.log('Test is for Vertex AI API key only.');
  }
}

main();
