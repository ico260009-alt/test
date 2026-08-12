export function extractGeminiText(geminiData) {
  const candidate = geminiData?.candidates?.[0];
  if (!candidate) {
    const blockReason = geminiData?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini blocked the request: ${blockReason}` : 'Gemini returned no candidates');
  }
  const text = candidate?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(`Gemini returned an unexpected response shape (finishReason: ${candidate?.finishReason || 'unknown'})`);
  }
  return text;
}

export function extractGroqText(data) {
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Groq returned an unexpected response shape (no message content)');
  }
  return text;
}
