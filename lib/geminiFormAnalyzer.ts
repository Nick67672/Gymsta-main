import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const getEnv = (key: string): string | undefined => {
  const fromProcess = (process.env as any)?.[key];
  if (fromProcess) return String(fromProcess);
  const extra = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifest2?.extra ?? {};
  const fromExtra = extra?.[key];
  return typeof fromExtra === 'string' ? fromExtra : undefined;
};

const apiKey = getEnv('EXPO_PUBLIC_GEMINI_API_KEY');

if (!apiKey) {
  console.warn('Gemini API key missing: set EXPO_PUBLIC_GEMINI_API_KEY');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface FormAnalysisResult {
  ok: boolean;
  text?: string;
  error?: string;
}

export const analyzeExerciseFormFromVideo = async (videoUri: string): Promise<FormAnalysisResult> => {
  try {
    if (!genAI) return { ok: false, error: 'Gemini API not configured' };

    // Read file to base64
    const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: FileSystem.EncodingType.Base64 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are an expert strength coach. Analyze the provided video for exercise form.
Rules:
- Identify the exercise if and only if you are reasonably certain.
- If you cannot confidently detect an exercise, say: "I couldn't confidently detect an exercise in this video."
- If detected, provide concise, actionable feedback: 3-6 bullet points covering setup, path of motion, tempo, and common mistakes.
- Be specific and objective; avoid guessing.
`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64, mimeType: 'video/mp4' } },
    ] as any);

    const response = await result.response;
    const text = response.text();
    return { ok: true, text };
  } catch (error: any) {
    console.error('Form analysis error:', error);
    return { ok: false, error: error?.message || 'Failed to analyze video' };
  }
};


