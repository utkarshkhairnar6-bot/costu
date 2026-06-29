import { Controller, Get, Post, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';
import { GeminiRotator } from '../common/gemini-rotator';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly geminiRotator: GeminiRotator) {}

  @Get('config')
  getConfigStatus() {
    return {
      success: true,
      data: {
        hasGeminiKey: this.geminiRotator.getClientCount() > 0,
        hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
        hasDeepgramKey: !!process.env.DEEPGRAM_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID || '',
      },
    };
  }

  @Post('tts')
  async generateTTS(
    @Body() body: { text: string; voiceId?: string; apiKey?: string; provider?: 'elevenlabs' | 'openai' | 'google' },
    @Res() res: any,
  ) {
    const { text, voiceId, apiKey, provider } = body;

    // Determine target provider. If explicitly 'openai' or 'google', we use that.
    let targetProvider = provider;
    if (!targetProvider) {
      if (apiKey || process.env.ELEVENLABS_API_KEY) {
        targetProvider = 'elevenlabs';
      } else if (process.env.OPENAI_API_KEY) {
        targetProvider = 'openai';
      } else if (this.geminiRotator.getClientCount() > 0) {
        targetProvider = 'google';
      } else {
        targetProvider = 'elevenlabs'; // Default fallback
      }
    }

    if (targetProvider === 'google') {
      // Determine language code based on voiceId or characters
      let lang = 'hi';
      if (voiceId) {
        if (voiceId.startsWith('en-')) {
          lang = 'en';
        } else if (voiceId.startsWith('hi-')) {
          lang = 'hi';
        }
      } else if (/^[a-zA-Z0-9\s\.,\?!'\"]+$/.test(text)) {
        lang = 'en';
      }

      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`Google Translate TTS returned status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(buffer);
      } catch (err: any) {
        console.error('Google Translate TTS failed:', err);
        throw new HttpException(
          `Failed to generate Google voice synthesis: ${err.message || err}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else if (targetProvider === 'openai') {
      const activeApiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!activeApiKey) {
        throw new HttpException('OpenAI API key is not configured on the backend or provided.', HttpStatus.BAD_REQUEST);
      }

      // Default voice ID for OpenAI TTS: alloy
      const activeVoiceId = voiceId || 'alloy';

      try {
        const openai = new OpenAI({
          apiKey: activeApiKey,
        });

        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: activeVoiceId as any,
          input: text,
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        const buffer = Buffer.from(await mp3.arrayBuffer());
        res.send(buffer);
      } catch (err: any) {
        console.error('OpenAI TTS Error details:', err);
        const errMsg = err.message || 'Unknown error';
        throw new HttpException(
          `Failed to generate OpenAI voice synthesis: ${errMsg}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else {
      // ElevenLabs TTS
      const activeApiKey = apiKey || process.env.ELEVENLABS_API_KEY;

      if (!activeApiKey) {
        throw new HttpException('ElevenLabs API key is not configured on the backend or provided.', HttpStatus.BAD_REQUEST);
      }

      // Default voice ID for Hindi male: pNInz6obpgHsBsBiWrtP (Adam)
      const activeVoiceId = voiceId || 'pNInz6obpgHsBsBiWrtP';

      try {
        const elevenlabs = new ElevenLabsClient({
          apiKey: activeApiKey,
        });

        // Fetch the audio stream using ElevenLabs JS SDK
        const audioStream = await elevenlabs.textToSpeech.convert(
          activeVoiceId,
          {
            text: text,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
          }
        );

        res.setHeader('Content-Type', 'audio/mpeg');

        // Check if it's a pipeable Node stream
        if (audioStream && typeof (audioStream as any).pipe === 'function') {
          (audioStream as any).pipe(res);
        } else {
          // Consume async iterable stream chunks for other runtime environments
          const chunks: any[] = [];
          for await (const chunk of audioStream as any) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          res.send(buffer);
        }
      } catch (err: any) {
        console.error('ElevenLabs TTS Error details:', err);
        let errMsg = err.message || 'Unknown error';
        if (err.statusCode) {
          errMsg = `Status code: ${err.statusCode} Body: ${JSON.stringify(err.body || {})}`;
        } else if (err.status) {
          errMsg = `Status code: ${err.status} Body: ${JSON.stringify(err.body || {})}`;
        }
        throw new HttpException(
          `Failed to generate ElevenLabs voice synthesis: ${errMsg}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
}
