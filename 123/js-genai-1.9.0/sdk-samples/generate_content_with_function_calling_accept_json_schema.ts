/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionCallingConfigMode, GoogleGenAI} from '@google/genai';
import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI;

async function generateContentFromMLDev() {
  const ai = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Dim the lights so the room feels cozy and warm.',
    config: {
      tools: [
        {
          functionDeclarations: [
            {
              name: 'controlLight',
              description:
                'Set the brightness and color temperature of a room light.',
              parametersJsonSchema: zodToJsonSchema(
                z.object({
                  brightness: z.number(),
                  colorTemperature: z.string(),
                }),
              ),
              responseJsonSchema: zodToJsonSchema(
                z.object({
                  status: z.string(),
                }),
              ),
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ['controlLight'],
        },
      },
    },
  });

  console.debug(response.functionCalls);
}

async function generateContentFromVertexAI() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Dim the lights so the room feels cozy and warm.',
    config: {
      tools: [
        {
          functionDeclarations: [
            {
              name: 'controlLight',
              description:
                'Set the brightness and color temperature of a room light.',
              parametersJsonSchema: zodToJsonSchema(
                z.object({
                  brightness: z.number(),
                  colorTemperature: z.string(),
                }),
              ),
              responseJsonSchema: zodToJsonSchema(
                z.object({
                  status: z.string(),
                }),
              ),
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ['controlLight'],
        },
      },
    },
  });

  console.debug(response.functionCalls);
}

async function main() {
  if (GOOGLE_GENAI_USE_VERTEXAI) {
    await generateContentFromVertexAI().catch((e) =>
      console.error('got error', e),
    );
  } else {
    await generateContentFromMLDev().catch((e) =>
      console.error('got error', e),
    );
  }
}

main();
