import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiRotator {
  private readonly logger = new Logger(GeminiRotator.name);
  private clients: GoogleGenerativeAI[] = [];
  private keys: string[] = [];
  private currentIndex = 0;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    const keysString = process.env.GEMINI_API_KEYS || '';
    const parsedKeys = keysString
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Fallback to GEMINI_API_KEY if GEMINI_API_KEYS is not configured
    if (parsedKeys.length === 0 && process.env.GEMINI_API_KEY) {
      parsedKeys.push(process.env.GEMINI_API_KEY);
    }

    this.keys = parsedKeys;
    this.clients = this.keys.map(key => new GoogleGenerativeAI(key));
    this.logger.log(`Initialized GeminiRotator with ${this.clients.length} API key(s).`);
  }

  /**
   * Retrieves the next API key in a round-robin rotation.
   */
  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured.');
    }
    const key = this.keys[this.currentIndex];
    // Rotate index (synced with client rotation)
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  /**
   * Returns the number of initialized clients.
   */
  getClientCount(): number {
    return this.clients.length;
  }

  /**
   * Gets the next Gemini client in a round-robin rotation.
   */
  private getNextClient(): GoogleGenerativeAI {
    if (this.clients.length === 0) {
      throw new Error('No Gemini API keys configured. Please set GEMINI_API_KEYS in .env.');
    }
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }

  /**
   * Executes a Gemini operation (e.g. content generation, embeddings).
   * If a quota/rate limit error occurs, it rotates to the next key and retries.
   */
  async executeWithRetry<T>(operation: (client: GoogleGenerativeAI) => Promise<T>): Promise<T> {
    const maxAttempts = this.clients.length;
    let lastError: any = null;

    if (maxAttempts === 0) {
      throw new Error('No Gemini API clients initialized.');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Get the next client (which advances the index for subsequent requests)
      const clientIndex = this.currentIndex;
      const client = this.getNextClient();

      try {
        return await operation(client);
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || '';
        
        // Match rate limiting (HTTP 429), quota limits, or Resource Exhausted messages
        const isQuotaError =
          error?.status === 429 ||
          errorMessage.includes('429') ||
          errorMessage.toLowerCase().includes('quota') ||
          errorMessage.toLowerCase().includes('limit') ||
          errorMessage.toLowerCase().includes('exhausted');

        if (isQuotaError && maxAttempts > 1) {
          this.logger.warn(
            `Gemini client at index ${clientIndex} experienced a quota/rate limit. Retrying with next client...`
          );
          continue; // Move to the next client
        }

        // For other errors (e.g., bad model name, syntax errors), fail immediately
        throw error;
      }
    }

    throw new Error(
      `All ${maxAttempts} Gemini keys were rate-limited or exhausted. Last error: ${lastError?.message}`
    );
  }
}
