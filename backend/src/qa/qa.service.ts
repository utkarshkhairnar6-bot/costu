import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiRotator } from '../common/gemini-rotator';

@Injectable()
export class QaService {
  private readonly logger = new Logger(QaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiRotator: GeminiRotator,
  ) {}

  // Real-time QA compliance auditor
  async auditAgentSpeechLine(speech: string, currentCallDuration: number): Promise<{ fatalError: any | null, checkedItems: string[] }> {
    const speechLower = speech.toLowerCase();
    const checkedItems: string[] = [];
    let fatalError: any | null = null;

    // 1. Script Adherence
    if (speechLower.includes('moneycontrol') && (speechLower.includes('jignesh') || speechLower.includes('customer') || speechLower.includes('ramesh') || speechLower.includes('priya'))) {
      checkedItems.push('opener');
    }

    // 2. Language Consent
    if (speechLower.includes('language') || speechLower.includes('comfortable') || speechLower.includes('hindi') || speechLower.includes('english') || speechLower.includes('bhasha')) {
      checkedItems.push('language');
    }

    // 3. Recording Consent
    if ((speechLower.includes('record') || speechLower.includes('recording') || speechLower.includes('quality') || speechLower.includes('training')) && 
        (speechLower.includes('pending') || speechLower.includes('application') || speechLower.includes('complete'))) {
      checkedItems.push('disclosure');
    }

    // 4. Starting Loan Rate 11% p.a.
    if (speechLower.includes('11%') || speechLower.includes('11 percent') || speechLower.includes('gyarah') || speechLower.includes('eleven')) {
      checkedItems.push('productRate');
    }

    // 5. Reducing Balance
    if (speechLower.includes('reducing') || speechLower.includes('reducing balance') || speechLower.includes('reducing basis') || speechLower.includes('ghat-te')) {
      checkedItems.push('reducing');
    }

    // 6. CIBIL check
    if (speechLower.includes('cibil') || speechLower.includes('civil') || speechLower.includes('eligibility') || speechLower.includes('income') || speechLower.includes('obligation')) {
      checkedItems.push('cibil');
    }

    // 7. Onboarding journey stages
    const journeyKeywords = ['ekyc', 'digilocker', 'penny drop', 'pennydrop', 'vkyc', 'video kyc', 'esign', 'e-sign', 'disbursement', '24-48', '24 to 48'];
    let matches = 0;
    journeyKeywords.forEach(kw => {
      if (speechLower.includes(kw)) matches++;
    });
    if (matches >= 2) {
      checkedItems.push('journey');
    }

    // 8. Tenure flexible limits 12-72 months
    const hasTenureValid = (speechLower.includes('12') && speechLower.includes('72')) || 
      (speechLower.includes('1') && speechLower.includes('6') && (speechLower.includes('year') || speechLower.includes('saal')));
    if (hasTenureValid && (speechLower.includes('month') || speechLower.includes('months') || speechLower.includes('saal') || speechLower.includes('year') || speechLower.includes('tenure'))) {
      checkedItems.push('tenure');
    }

    // 9. Pitch USPs: paperless, 2-minute real-time, zero hidden fees
    const hasUSP1 = speechLower.includes('2 minute') || speechLower.includes('2-minute') || speechLower.includes('real-time') || speechLower.includes('real time');
    const hasUSP2 = speechLower.includes('paperless') || speechLower.includes('digital') || speechLower.includes('online');
    const hasUSP3 = speechLower.includes('maintenance') || speechLower.includes('hidden') || speechLower.includes('zero fees') || speechLower.includes('no hidden');
    if (hasUSP1 || hasUSP2 || hasUSP3) {
      checkedItems.push('usps');
    }

    // --- FATAL ERROR AUDIT ---
    // A. False Commitment (e.g. guaranteed approval)
    if (speechLower.includes('guarantee') || speechLower.includes('guaranteed') || speechLower.includes('approve ho jayega') || speechLower.includes('definitely approved') || speechLower.includes('pakka approve')) {
      fatalError = {
        category: 'False Commitment',
        severity: 'Critical',
        employeeSaid: speech,
        reason: 'Guaranteeing final loan approval without full verification is legally non-compliant.',
        correctResponse: 'Loan approval depends on eligibility matching and document verification.'
      };
    }

    // B. Wrong Processing Fees representation (saying "no processing fees")
    if (speechLower.includes('no processing fee') || speechLower.includes('processing fee nahi') || speechLower.includes('zero processing fee')) {
      fatalError = {
        category: 'Incomplete Disclosure / Misguidance',
        severity: 'Critical',
        employeeSaid: speech,
        reason: 'L&T Finance charges processing fees. Claiming zero processing fees violates disclosure guidelines (only annual maintenance fees are zero).',
        correctResponse: 'There are processing charges, but there are zero hidden annual maintenance fees.'
      };
    }

    // C. Quoting outside tenure bounds (12-72 months)
    const numbersInSpeech = speechLower.match(/\d+/g);
    if (numbersInSpeech) {
      numbersInSpeech.forEach(numStr => {
        const num = parseInt(numStr, 10);
        const isSaal = speechLower.includes('year') || speechLower.includes('years') || speechLower.includes('saal');
        const months = isSaal ? num * 12 : num;
        
        if (months > 0 && (months < 12 || months > 72) && (speechLower.includes('month') || speechLower.includes('tenure') || speechLower.includes('saal') || speechLower.includes('year'))) {
          fatalError = {
            category: 'Wrong Eligibility Information',
            severity: 'Critical',
            employeeSaid: speech,
            reason: `Quoting a tenure of ${num} ${isSaal ? 'years' : 'months'} is outside L&T product specifications (12 to 72 months).`,
            correctResponse: 'The tenure is flexible, between 12 months to 72 months (1 to 6 years).'
          };
        }
      });
    }

    // Use Gemini for live audit if available (additional semantic scan)
    if (this.geminiRotator.getClientCount() > 0 && !fatalError) {
      try {
        const result = await this.auditWithGemini(speech);
        if (result && result.isFatal) {
          fatalError = {
            category: result.category,
            severity: result.severity,
            employeeSaid: speech,
            reason: result.reason,
            correctResponse: result.correctResponse
          };
        }
      } catch (e) {
        this.logger.warn(`Gemini live audit failed: ${e.message}`);
      }
    }

    return { fatalError, checkedItems };
  }

  private async auditWithGemini(speech: string): Promise<any> {
    if (this.geminiRotator.getClientCount() === 0) return null;
    return this.geminiRotator.executeWithRetry(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
      As a BPO QA auditor, inspect this agent statement: "${speech}"
      
      Look for these 10 fatal categories:
      1. Wrong Interest Rate (anything other than 11% starting)
      2. False Commitment (guaranteeing loan approval, etc.)
      3. Wrong Eligibility Information (quoting wrong salaries/criteria)
      4. Compliance Miss (completely misstating recording options)
      5. Misguidance
      6. Miscommunication
      7. Incorrect Documentation
      8. Regulatory Violation (violating standard RBI/BPO fair practices)
      9. Incomplete Disclosure (claiming zero processing fee)
      10. Unprofessional Language

      Output a JSON object ONLY. JSON keys: 
      - isFatal (boolean)
      - category (string or null)
      - severity (string e.g. "Critical" or "Warning" or null)
      - reason (string or null)
      - correctResponse (string or null)
    `;
      const result = await model.generateContent(prompt);
      const cleanText = result.response.text().replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText);
    });
  }

  // Compile full scorecard and coaching suggestions
  async generatePostCallQA(callId: string, userId: string, personaId: string, duration: number, transcript: any[], fatalErrors: any[]) {
    this.logger.log(`Compiling Post-Call QA Audit for Call ${callId}`);

    // Calculate score programmatically
    let passedChecksCount = 0;
    const checklist = {
      opener: false, language: false, disclosure: false, productRate: false,
      reducing: false, cibil: false, tenure: false, usps: false, journey: false
    };

    // Evaluate dialog transcript to compile verified checklist
    const transcriptText = JSON.stringify(transcript);
    const transcriptLower = transcriptText.toLowerCase();

    if (transcriptLower.includes('moneycontrol') && (transcriptLower.includes('jignesh') || transcriptLower.includes('ramesh') || transcriptLower.includes('priya'))) checklist.opener = true;
    if (transcriptLower.includes('language') || transcriptLower.includes('comfortable') || transcriptLower.includes('bhasha')) checklist.language = true;
    if (transcriptLower.includes('record') && transcriptLower.includes('application')) checklist.disclosure = true;
    if (transcriptLower.includes('11%') || transcriptLower.includes('11 percent') || transcriptLower.includes('eleven')) checklist.productRate = true;
    if (transcriptLower.includes('reducing') || transcriptLower.includes('reducing balance')) checklist.reducing = true;
    if (transcriptLower.includes('cibil') || transcriptLower.includes('civil') || transcriptLower.includes('eligibility')) checklist.cibil = true;
    if (transcriptLower.includes('12') && transcriptLower.includes('72')) checklist.tenure = true;
    if (transcriptLower.includes('2 minute') || transcriptLower.includes('paperless') || transcriptLower.includes('maintenance')) checklist.usps = true;
    if (transcriptLower.includes('ekyc') || transcriptLower.includes('vkyc') || transcriptLower.includes('esign')) checklist.journey = true;

    passedChecksCount = Object.values(checklist).filter(v => v === true).length;
    let score = passedChecksCount * 10;
    if (passedChecksCount === 9) score += 10; // All elements checked bonus!

    // If fatal errors were triggered, cap score at 45% (FAIL)
    if (fatalErrors.length > 0) {
      score = Math.min(score, 45);
    }

    // Section ratings (out of 10)
    let comms = Math.max(3, score / 10);
    let prod = checklist.productRate && checklist.reducing && checklist.tenure ? 9 : 5;
    let conf = fatalErrors.length > 0 ? 4 : 8;
    let listn = 8;
    let obj = checklist.usps ? 9 : 4;
    let compl = checklist.opener && checklist.language && checklist.disclosure && fatalErrors.length === 0 ? 10 : 3;
    let close = checklist.journey ? 9 : 5;
    let prof = fatalErrors.length > 0 ? 5 : 9;

    let summaryText = 'The agent initiated the outbound call workflow, handled some customer queries, and guided the persona through L&T loan features.';
    let strengthsText = 'Good opening tone and professional representation of Moneycontrol.';
    let weaknessesText = '';
    let coachingBullets: string[] = [];
    let coachingRecs = 'Practice stating L&T flexible tenure limits (12 to 72 months) and reducing balance ROI.';

    if (!checklist.opener) {
      weaknessesText += 'Missed standard opening script. ';
      coachingBullets.push('Always greet and mention Moneycontrol agency context in the first 15 seconds.');
    }
    if (!checklist.disclosure) {
      weaknessesText += 'Missed recording disclosure. ';
      coachingBullets.push('Ensure legal recording consent warning is stated verbatim.');
    }
    if (fatalErrors.length > 0) {
      weaknessesText += 'Triggered critical fatal compliance violations. ';
      fatalErrors.forEach(err => {
        coachingBullets.push(`Correction for ${err.category}: ${err.reason}. Correct script is: "${err.correctResponse}"`);
      });
    } else {
      strengthsText += ' Stood fully compliant with RBI and BPO fair practices.';
    }

    // Call Gemini for advanced post-call evaluation if keys present
    if (this.geminiRotator.getClientCount() > 0) {
      try {
        const geminiQA = await this.generateScorecardWithGemini(transcript, fatalErrors);
        if (geminiQA) {
          comms = geminiQA.communicationSkills;
          prod = geminiQA.productKnowledge;
          conf = geminiQA.confidence;
          listn = geminiQA.listeningSkills;
          obj = geminiQA.objectionHandling;
          compl = geminiQA.compliance;
          close = geminiQA.closingSkills;
          prof = geminiQA.professionalism;
          summaryText = geminiQA.summary;
          strengthsText = geminiQA.strengths;
          weaknessesText = geminiQA.weaknesses;
          coachingBullets = geminiQA.coachingFeedback;
          coachingRecs = geminiQA.coachingRecommendations;
        }
      } catch (err) {
        this.logger.warn(`Gemini scorecard compile failed: ${err.message}. Saving using programmatic fallback.`);
      }
    }

    // Ensure user exists to avoid foreign key violation
    let activeUserId = userId;
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const firstUser = await this.prisma.user.findFirst();
      if (firstUser) {
        activeUserId = firstUser.id;
      } else {
        const newUser = await this.prisma.user.create({
          data: {
            id: userId,
            email: 'agent@voicely.com',
            password: 'hashed-password-here',
            name: 'Utkarsh Khairnar',
            role: 'EMPLOYEE'
          }
        });
        activeUserId = newUser.id;
      }
    }

    // Ensure persona exists to avoid foreign key violation
    let activePersonaId = personaId;
    const personaExists = await this.prisma.persona.findUnique({ where: { id: personaId } });
    if (!personaExists) {
      const firstPersona = await this.prisma.persona.findFirst();
      if (firstPersona) {
        activePersonaId = firstPersona.id;
      } else {
        const newPersona = await this.prisma.persona.create({
          data: {
            id: personaId,
            name: 'Jignesh Rathod',
            details: 'Loan Range: ₹10L | Pending app | Price Sensitive',
            language: 'Hindi',
            behavior: 'Price Sensitive & Inquisitive',
            systemPrompt: 'Default system prompt'
          }
        });
        activePersonaId = newPersona.id;
      }
    }

    // Save Call, Scorecard, and Coaching report in DB
    const savedCall = await this.prisma.call.create({
      data: {
        userId: activeUserId,
        personaId: activePersonaId,
        duration: duration,
        overallScore: score,
        fatalCount: fatalErrors.length,
        transcript: JSON.stringify(transcript),
        fatalErrors: {
          create: fatalErrors.map(err => ({
            timestamp: err.timestamp || 0,
            category: err.category,
            severity: err.severity,
            employeeSaid: err.employeeSaid,
            reason: err.reason,
            correctResponse: err.correctResponse
          }))
        },
        scorecard: {
          create: {
            communicationSkills: comms,
            productKnowledge: prod,
            confidence: conf,
            listeningSkills: listn,
            objectionHandling: obj,
            compliance: compl,
            closingSkills: close,
            professionalism: prof,
            summary: summaryText,
            strengths: strengthsText,
            weaknesses: weaknessesText,
            managerNotes: fatalErrors.length > 0 ? 'Urgent attention required. Fatal error reviews scheduled.' : 'Satisfactory training score.'
          }
        },
        coaching: {
          create: {
            feedback: JSON.stringify(coachingBullets),
            recommendations: coachingRecs
          }
        }
      },
      include: {
        scorecard: true,
        coaching: true,
        fatalErrors: true
      }
    });

    return savedCall;
  }

  private async generateScorecardWithGemini(transcript: any[], fatalErrors: any[]): Promise<any> {
    if (this.geminiRotator.getClientCount() === 0) return null;
    return this.geminiRotator.executeWithRetry(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
      Review the transcript of this call:
      ${JSON.stringify(transcript)}
      
      And these identified fatal violations:
      ${JSON.stringify(fatalErrors)}

      Evaluate the agent and output a JSON object ONLY containing:
      - communicationSkills (1-10)
      - productKnowledge (1-10)
      - confidence (1-10)
      - listeningSkills (1-10)
      - objectionHandling (1-10)
      - compliance (1-10)
      - closingSkills (1-10)
      - professionalism (1-10)
      - summary (string review of the conversation)
      - strengths (string bullet review)
      - weaknesses (string bullet review of gaps)
      - coachingFeedback (array of strings, listing direct quotes and corrections)
      - coachingRecommendations (string advice on course/KB reading files)

      Formatting rules: Respond with JSON only. Remove code fence decorators.
    `;
      const result = await model.generateContent(prompt);
      const cleanText = result.response.text().replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText);
    });
  }
}
