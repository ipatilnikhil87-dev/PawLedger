/**
 * /api/transcribe — Whisper STT proxy
 *
 * Accepts a multipart audio file (field name: "audio") and forwards it to
 * OpenAI Whisper (whisper-1). Returns { transcript: string } on success.
 *
 * Requires env var: OPENAI_API_KEY
 * Optional env var: WHISPER_LANG  (default: "en")
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { FormData, Blob } from 'node-fetch';
import nodeFetch from 'node-fetch';

const router = Router();

// Keep uploaded audio in memory — files are small (< 1 MB for 30s clips)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 24 * 1024 * 1024 }, // 24 MB — Whisper's max
});

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // --- No API key configured ---
    if (!apiKey || apiKey.trim() === '' || apiKey === 'sk-your-openai-key-here') {
      res.status(402).json({
        error: 'no_api_key',
        message:
          'OPENAI_API_KEY is not configured on the server. ' +
          'Add it to your .env file and restart the server to enable Whisper transcription.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'missing_file', message: 'No audio file provided.' });
      return;
    }

    // --- Build multipart form for OpenAI ---
    const form = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    // Whisper needs a filename with a valid extension to detect format
    const ext = req.file.mimetype?.includes('mp4') ? 'mp4' : 'webm';
    form.append('file', audioBlob, `recording.${ext}`);
    form.append('model', 'whisper-1');
    form.append('language', process.env.WHISPER_LANG || 'en');
    form.append('response_format', 'json');

    // Optional: provide a prompt to help Whisper recognise vet/pet terms
    form.append(
      'prompt',
      'Dog health record. Veterinary clinic. Vaccine batch. Dr. Deworming. Antirabies. Cessna Lifeline. Hindi-English mixed.',
    );

    const whisperRes = await (nodeFetch as any)(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form as any,
      },
    );

    if (!whisperRes.ok) {
      const body = await whisperRes.text();
      console.error('[Transcribe] Whisper API error:', whisperRes.status, body);
      res.status(whisperRes.status).json({
        error: 'whisper_error',
        message: `Whisper API returned ${whisperRes.status}: ${body.slice(0, 300)}`,
      });
      return;
    }

    const data = (await whisperRes.json()) as { text?: string };
    const transcript = (data.text || '').trim();

    res.json({ transcript });
  } catch (err: any) {
    console.error('[Transcribe] Unexpected error:', err);
    res.status(500).json({ error: 'server_error', message: err?.message || 'Internal server error' });
  }
});

export { router as transcribeRouter };
