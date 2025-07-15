# Usage samples for `@google/genai/node`

To run the samples first build the SDK and the samples, from the repository root:

```sh
# Build the SDK
npm install
npm run build

# Build the samples
cd sdk-samples
npm install
npm run build
```

The samples use key and project settings from environment variables, set the following environment variables prior to invoking samples:

```sh
export GEMINI_API_KEY=<GEMINI_KEY>
export GOOGLE_CLOUD_PROJECT=<GOOGLE_CLOUD_PROJECT>
export GOOGLE_CLOUD_LOCATION=<GCP_REGION>
```

Now you can run the compiled samples, e.g:

```sh
node build/generate_content_with_text.js
```
