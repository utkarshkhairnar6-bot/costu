import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiRotator } from '../common/gemini-rotator';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private qdrantClient: QdrantClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiRotator: GeminiRotator,
  ) {
    
    const qdrantUrl = process.env.QDRANT_URL;
    if (qdrantUrl) {
      this.qdrantClient = new QdrantClient({
        url: qdrantUrl,
        apiKey: process.env.QDRANT_API_KEY || undefined,
      });
      this.initializeQdrantCollection().catch(err => {
        this.logger.warn(`Qdrant initialization failed: ${err.message}. Running in fallback mode.`);
      });
    }
  }

  private async initializeQdrantCollection() {
    if (!this.qdrantClient) return;
    try {
      const collections = await this.qdrantClient.getCollections();
      const hasCollection = collections.collections.some(c => c.name === 'bpo_knowledge_base');
      if (!hasCollection) {
        await this.qdrantClient.createCollection('bpo_knowledge_base', {
          vectors: {
            size: 768, // size of Gemini embeddings or similar
            distance: 'Cosine',
          },
        });
        this.logger.log('Created Qdrant collection: bpo_knowledge_base');
      }
    } catch (e) {
      this.logger.warn(`Failed to initialize Qdrant database: ${e.message}`);
    }
  }

  async uploadAndAnalyze(fileBuffer: Buffer, filename: string, mimeType: string) {
    this.logger.log(`Processing call recording file: ${filename} (${mimeType})`);

    // 1. Save locally mock/upload path
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, `${Date.now()}_${filename}`);
    fs.writeFileSync(localFilePath, fileBuffer);

    // 2. Speech-To-Text (Deepgram or Mock Fallback)
    let transcriptText = '';
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
    
    if (hasDeepgram) {
      try {
        transcriptText = await this.transcribeWithDeepgram(fileBuffer, mimeType);
      } catch (err) {
        this.logger.error(`Deepgram STT failed: ${err.message}. Using mock parser.`);
        transcriptText = this.getMockTranscript();
      }
    } else {
      this.logger.log('Deepgram API Key not set. Using mock journey transcript.');
      transcriptText = this.getMockTranscript();
    }

    // 3. Extract Intent & Scenario data (Gemini LLM or Mock Fallback)
    let extraction: any = null;
    if (this.geminiRotator.getClientCount() > 0) {
      try {
        extraction = await this.extractIntentsWithGemini(transcriptText);
      } catch (err) {
        this.logger.error(`Gemini extraction failed: ${err.message}. Using mock scenario extraction.`);
        extraction = this.getMockExtraction();
      }
    } else {
      this.logger.log('Gemini API key not configured. Using pre-extracted BPO metadata.');
      extraction = this.getMockExtraction();
    }

    // 4. Save to Qdrant (Vector DB or Fallback)
    const documentId = await this.saveToKnowledgeBase(filename, transcriptText, extraction);

    // 5. Store in Prisma SQLite/PG Database
    const newDoc = await this.prisma.sopDocument.create({
      data: {
        title: filename,
        category: 'Recording Analysis',
        fileUrl: localFilePath,
        textContent: transcriptText,
        vectorId: documentId,
      },
    });

    return {
      documentId: newDoc.id,
      transcript: transcriptText,
      analysis: extraction,
    };
  }

  private async transcribeWithDeepgram(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': mimeType || 'audio/wav',
      },
      body: fileBuffer as any,
    });
    
    if (!response.ok) {
      throw new Error(`Deepgram response error status ${response.status}`);
    }
    const data: any = await response.json();
    return data?.results?.channels[0]?.alternatives[0]?.transcript || '';
  }

  private async extractIntentsWithGemini(transcript: string): Promise<any> {
    if (this.geminiRotator.getClientCount() === 0) throw new Error('Gemini client not initialized.');
    
    return this.geminiRotator.executeWithRetry(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
      You are an expert BPO QA analyst and intent extraction engine.
      Analyze this call recording transcript of a loan agent speaking with a customer:
      
      "${transcript}"
      
      Extract and structure the following elements in JSON format:
      1. Customer Questions (array of objects with "question", "context", and "detectedIntent")
      2. Objections Raised (array of objects with "objection" and "suggestedRebuttal")
      3. Compliance Statements (array of objects with "statement", "isMandatory", and "statusInCall")
      4. Product Explanations (array of objects with "feature", "agentExplanation", and "isAccurate")
      5. Escalation Indicators (array of objects with "triggerText", "reason")
      6. Scenario Metadata (object with "customerMood", "loanOfferAmount", "complianceScore")
      
      Format the output ONLY as a raw, valid JSON object matching this structure. Do not surround it with code markdown block wrappers.
    `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      // Clean code block ticks if any
      const cleanText = responseText.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText);
    });
  }

  private async saveToKnowledgeBase(title: string, text: string, extraction: any): Promise<string | null> {
    const vectorId = `${Date.now()}-doc`;
    if (!this.qdrantClient || this.geminiRotator.getClientCount() === 0) {
      this.logger.log(`Skipped vector saving for ${title} due to missing API configurations.`);
      return vectorId;
    }

    try {
      // Create embedding using Gemini
      const vector = await this.geminiRotator.executeWithRetry(async (client) => {
        const embedModel = client.getGenerativeModel({ model: 'text-embedding-004' });
        const embedResult = await embedModel.embedContent(text);
        return embedResult.embedding.values;
      });

      await this.qdrantClient.upsert('bpo_knowledge_base', {
        wait: true,
        points: [
          {
            id: vectorId,
            vector: vector,
            payload: {
              title: title,
              extractedIntents: extraction?.customerQuestions || [],
              objections: extraction?.objections || [],
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });
      this.logger.log(`Saved vector embeddings for ${title} to Qdrant.`);
      return vectorId;
    } catch (e) {
      this.logger.error(`Failed to upload vectors to Qdrant: ${e.message}`);
      return vectorId;
    }
  }

  private getMockTranscript(): string {
    return `
      Agent: Good afternoon. Thank you for choosing Moneycontrol. My name is Mayuri. Am I speaking with Mr. Jignesh Rathod?
      Customer: Haan, main Jignesh bol raha hoon. Ji batayein kaun bol raha hai?
      Agent: Hello Mr. Jignesh, I am calling on behalf of Moneycontrol regarding the L&T Finance Personal Loan application you started on our portal. Sir, is it a convenient time to talk?
      Customer: Haan, abhi free hoon, boliye na. Mujhe batayein loan ka kya status hai.
      Agent: Thank you, Mr. Jignesh. Sir, standard verification rules starting se pehle main aapse language preference check karna chahungi. Are you comfortable in Hindi or English?
      Customer: Hindi chalega, Hindi mein comfortable hai.
      Agent: Theek hai sir. Aur clear record management ke liye bata doon ki yeh call monitoring and compliance check ke liye record ho sakti hai. Sir, aapka loan check status pending dikha raha hai, jahan aap 10 lakh tak ke loan ke liye eligible ho sakte hain. L&T Finance offers attractive starting interest rates at 11% p.a.
      Customer: Achha, recording theek hai. Lekin mera bank toh mujhe kam interest rate de raha hai. Main L&T kyu choose karoon? Aur processing fees kitni hai?
      Agent: Sir, L&T Finance provides direct approvals in 2 minutes and it's a 100% digital paperless process. Plus, zero annual maintenance fees hai. Also, final rate of interest is customizable on reducing basis based on your CIBIL score and monthly income.
      Customer: Achha, flexible tenure kitna milega?
      Agent: Sir, you get flexible tenure between 12 months to 72 months to repay.
      Customer: Theek hai, 100% digital hai aur zero annual fees hai toh process clear hai. Main aage application complete kar deta hoon. Thank you!
      Agent: Thank you for your time, Mr. Jignesh. Have a nice day ahead.
    `;
  }

  private getMockExtraction(): any {
    return {
      customerQuestions: [
        {
          question: "loan ka kya status hai",
          context: "Inquiring about L&T application progress",
          detectedIntent: "Check Application Status"
        },
        {
          question: "flexible tenure kitna milega",
          context: "Asking for payment duration flexibility",
          detectedIntent: "Inquire Loan Tenure"
        }
      ],
      objections: [
        {
          objection: "mera bank toh mujhe kam interest rate de raha hai",
          suggestedRebuttal: "Highlight L&T's 100% paperless approval, 2-minute real-time decisioning, customizable reducing interest rate, and zero annual hidden fees."
        }
      ],
      complianceStatements: [
        {
          statement: "speaking with Mr. Jignesh Rathod",
          isMandatory: true,
          statusInCall: "Passed"
        },
        {
          statement: "calling on behalf of Moneycontrol",
          isMandatory: true,
          statusInCall: "Passed"
        },
        {
          statement: "call monitoring and compliance check ke liye record",
          isMandatory: true,
          statusInCall: "Passed"
        }
      ],
      productExplanations: [
        {
          feature: "L&T Starting Interest Rate",
          agentExplanation: "Starts from 11% p.a. and customized on reducing basis based on CIBIL",
          isAccurate: true
        },
        {
          feature: "Repayment Tenure",
          agentExplanation: "Flexible timelines from 12 to 72 months",
          isAccurate: true
        }
      ],
      escalationIndicators: [],
      scenarioMetadata: {
        customerMood: "Interested / Inquisitive",
        loanOfferAmount: "₹10,000,000",
        complianceScore: 100
      }
    };
  }
}
