import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { QaService } from './qa.service';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post('audit-line')
  async auditLine(@Body() body: { speech: string; timestamp: number }) {
    const { speech, timestamp } = body;
    if (speech === undefined) {
      throw new HttpException('Missing speech text in request body.', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.qaService.auditAgentSpeechLine(speech, timestamp || 0);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      throw new HttpException(`Live QA auditing error: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('complete-call')
  async completeCall(
    @Body() body: {
      userId: string;
      personaId: string;
      duration: number;
      transcript: any[];
      fatalErrors: any[];
    }
  ) {
    const { userId, personaId, duration, transcript, fatalErrors } = body;
    if (!userId || !personaId || !transcript) {
      throw new HttpException('Missing required call summary fields in request body.', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.qaService.generatePostCallQA(
        'call-temp-id', // generated internally
        userId,
        personaId,
        duration || 0,
        transcript,
        fatalErrors || []
      );
      return {
        success: true,
        message: 'QA scorecard and AI coaching data generated and stored.',
        data: result
      };
    } catch (err) {
      throw new HttpException(`Failed to compile call scorecard: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
