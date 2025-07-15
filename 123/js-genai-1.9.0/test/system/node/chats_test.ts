/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {mcpToTool} from '../../../src/mcp/_mcp.js';
import {GoogleGenAI} from '../../../src/node/node_client.js';
import {FunctionCallingConfigMode, Tool, Type} from '../../../src/types.js';
import {
  spinUpBeepingServer,
  spinUpPrintingServer,
} from '../../unit/test_mcp_server.js';
import {setupTestServer, shutdownTestServer} from '../test_server.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

const function_calling: Tool = {
  functionDeclarations: [
    {
      description: 'Custom divide function',
      name: 'customDivide',
      parameters: {
        type: Type.OBJECT,
        properties: {
          numerator: {
            type: Type.NUMBER,
          },
          denominator: {
            type: Type.NUMBER,
          },
        },
      },
    },
  ],
};

describe('Chats Tests', () => {
  beforeAll(async () => {
    await setupTestServer();
  });

  afterAll(async () => {
    await shutdownTestServer();
  });

  describe('chat automatic function calling', () => {
    it('test chat automatic function calling', async () => {
      const mcpTools = [
        mcpToTool(await spinUpPrintingServer(), await spinUpBeepingServer()),
      ];
      const client = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});
      const consoleLogSpy = spyOn(console, 'log').and.callThrough();
      const chat = client.chats.create({
        model: 'gemini-2.0-flash',
        config: {
          tools: mcpTools,
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
      });
      await chat.sendMessage({
        message: 'Use the printer to print a simple word: helloX1 in green',
      });
      await chat.sendMessage({
        message: 'Use the printer to print a simple word: hellox2 in blue',
      });
      const allArgs = consoleLogSpy.calls.allArgs();
      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
      expect(allArgs[0][0]).toBe('\u001b[32mhelloX1');
      expect(allArgs[1][0]).toBe('\u001b[0m');
      expect(allArgs[2][0]).toBe('\x1B[34mhellox2');
      expect(allArgs[3][0]).toBe('\u001b[0m');
    });
  });

  describe('sendMessage', () => {
    const testCases = [
      {
        name: 'Google AI with text',
        clientParams: {vertexai: false, apiKey: GEMINI_API_KEY},
        model: 'gemini-2.0-flash',
        config: {},
        history: [],
        messages: ['why is the sky blue?'],
      },
      {
        name: 'Vertex AI with text',
        clientParams: {vertexai: true, project: GOOGLE_CLOUD_PROJECT},
        model: 'gemini-2.0-flash',
        config: {},
        history: [],
        messages: ['why is the sky blue?'],
      },
      {
        name: 'Google AI with config',
        clientParams: {vertexai: false, apiKey: GEMINI_API_KEY},
        model: 'gemini-2.0-flash',
        config: {temperature: 0.5, maxOutputTokens: 20},
        history: [],
        messages: ['why is the sky blue?'],
      },
      {
        name: 'Vertex AI with config',
        clientParams: {vertexai: true, project: GOOGLE_CLOUD_PROJECT},
        model: 'gemini-2.0-flash',
        config: {temperature: 0.5, maxOutputTokens: 20},
        history: [],
        messages: ['why is the sky blue?'],
      },
      {
        name: 'Google AI with history',
        clientParams: {vertexai: false, apiKey: GEMINI_API_KEY},
        model: 'gemini-2.0-flash',
        config: {},
        history: [
          {parts: [{text: 'a=5'}], role: 'user'},
          {parts: [{text: 'b=10'}], role: 'user'},
        ],
        messages: ['what is the value of a+b?'],
      },
      {
        name: 'Vertex AI with history',
        clientParams: {vertexai: true, project: GOOGLE_CLOUD_PROJECT},
        model: 'gemini-2.0-flash',
        config: {},
        history: [
          {parts: [{text: 'a=5'}], role: 'user'},
          {parts: [{text: 'b=10'}], role: 'user'},
        ],
        messages: ['what is the value of a+b?'],
      },
      {
        name: 'Google AI multiple messages',
        clientParams: {vertexai: false, apiKey: GEMINI_API_KEY},
        model: 'gemini-2.0-flash',
        config: {},
        history: [],
        messages: [
          'Tell me a story in 100 words?',
          'What is the title of the story?',
        ],
      },
      {
        name: 'Vertex AI multilple messages',
        clientParams: {vertexai: true, project: GOOGLE_CLOUD_PROJECT},
        model: 'gemini-2.0-flash',
        config: {},
        history: [],
        messages: [
          'Tell me a story in 100 words?',
          'What is the title of the story?',
        ],
      },
    ];

    testCases.forEach(async (testCase) => {
      it(testCase.name, async () => {
        const client = new GoogleGenAI(testCase.clientParams);
        const chat = client.chats.create({
          model: testCase.model,
          config: testCase.config,
          history: testCase.history,
        });
        for (const message of testCase.messages) {
          const response = await chat.sendMessage({message});
          console.log('chat.sendMessage response: ', response.text);
          expect(response.text).not.toBeNull();
        }
        const comprehensiveHistory = chat.getHistory();
        expect(comprehensiveHistory.length).toBeGreaterThan(0);
        const curatedHistory = chat.getHistory(true);
        expect(curatedHistory.length).toBeGreaterThan(0);
      });
    });

    testCases.forEach(async (testCase) => {
      it(testCase.name + ' stream', async () => {
        const client = new GoogleGenAI(testCase.clientParams);
        const chat = client.chats.create({
          model: testCase.model,
          config: testCase.config,
          history: testCase.history,
        });
        for (const message of testCase.messages) {
          const response = await chat.sendMessageStream({message});
          for await (const chunk of response) {
            console.log('chat.sendMessageStream response chunk: ', chunk.text);
            expect(chunk.text).not.toBeNull();
          }
        }
        const comprehensiveHistory = chat.getHistory();
        expect(comprehensiveHistory.length).toBeGreaterThan(0);
        const curatedHistory = chat.getHistory(true);
        expect(curatedHistory.length).toBeGreaterThan(0);
      });
    });

    it('Google AI array of strings', async () => {
      const client = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});
      const chat = client.chats.create({model: 'gemini-2.0-flash'});
      const response = await chat.sendMessage({
        message: [
          'why is the sky blue?',
          'Can the sky appear in other colors?',
        ],
      });
      console.log('chat.sendMessage response: ', response.text);
    });

    it('Vertex AI array of strings', async () => {
      const client = new GoogleGenAI({
        vertexai: true,
        project: GOOGLE_CLOUD_PROJECT,
      });
      const chat = client.chats.create({model: 'gemini-2.0-flash'});
      const response = await chat.sendMessage({
        message: [
          'why is the sky blue?',
          'Can the sky appear in other colors?',
        ],
      });
      console.log('chat.sendMessage response: ', response.text);
    });

    it('Send message stream with error', async () => {
      const client = new GoogleGenAI({vertexai: false, apiKey: GEMINI_API_KEY});
      const chat = client.chats.create({model: 'custom-gemini-2.0-flash'});
      try {
        const response = await chat.sendMessageStream({
          message: 'why is the sky blue?',
        });
        console.log('response: ', response);
      } catch (e: unknown) {
        console.log('catching error: ', e);
      }

      // Add an additional async call to the event loop to trigger the potential
      // promise rejection from the `sendPromise`.
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
  });

  describe('chats function calling', () => {
    const testCases = [
      {
        name: 'Google AI with function calling',
        clientParams: {vertexai: false, apiKey: GEMINI_API_KEY},
        model: 'gemini-2.0-flash',
        config: {tools: [function_calling]},
        history: [],
        messages: [
          'what is the result of 100/2',
          'what is the result of 50/2?',
        ],
      },
      {
        name: 'Vertex AI with function calling',
        clientParams: {vertexai: true, project: GOOGLE_CLOUD_PROJECT},
        model: 'gemini-2.0-flash',
        config: {tools: [function_calling]},
        history: [],
        messages: [
          'what is the result of 100/2',
          'what is the result of 50/2?',
        ],
      },
    ];

    testCases.forEach(async (testCase) => {
      it(testCase.name, async () => {
        const client = new GoogleGenAI(testCase.clientParams);
        const chat = client.chats.create({
          model: testCase.model,
          config: testCase.config,
          history: testCase.history,
        });
        for (const message of testCase.messages) {
          const response = await chat.sendMessage({message});
          console.log(
            'chat.sendMessage function calls: ',
            response.functionCalls,
          );
          expect(response.functionCalls).not.toBeNull();
        }
      });
    });

    testCases.forEach(async (testCase) => {
      it(testCase.name + ' stream', async () => {
        const client = new GoogleGenAI(testCase.clientParams);
        const chat = client.chats.create({
          model: testCase.model,
          config: testCase.config,
          history: testCase.history,
        });
        for (const message of testCase.messages) {
          const response = await chat.sendMessageStream({message});
          for await (const chunk of response) {
            console.log(
              'chat.sendMessageStream function calls: ',
              chunk.functionCalls,
            );
            expect(chunk.functionCalls).not.toBeNull();
          }
        }
      });
    });
  });
});
