import {GoogleGenAI} from '@google/genai';
import {ChangeEvent, useState} from 'react';
import './App.css';

export default function GenerateContentText({
  apiKey,
  vertexai,
}: {
  apiKey: string;
  vertexai: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [modelResponse, setModelResponse] = useState('');

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSend = async () => {
    const ai = new GoogleGenAI({vertexai: vertexai, apiKey: apiKey});
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
    });
    setModelResponse(response.text ?? 'Empty response');
  };

  return (
    <>
      <div className="card">
        <h2 className="card-title">Text generation sample</h2>
        <form>
          <label htmlFor="prompt" className="form-label">
            Prompt:
          </label>
          <textarea
            className="form-control"
            id="prompt1"
            onChange={handlePromptChange}
          />
          <button
            type="button"
            style={{marginTop: '10px', marginBottom: '10px'}}
            className="btn btn-primary"
            onClick={handleSend}>
            Send
          </button>
          <br />
          <label htmlFor="response" className="form-label">
            Response:
          </label>
          <div className="card">{modelResponse}</div>
        </form>
      </div>
    </>
  );
}
