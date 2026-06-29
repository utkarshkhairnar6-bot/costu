import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingService } from './recording.service';

@Controller('recordings')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRecording(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException('No recording file provided.', HttpStatus.BAD_REQUEST);
    }
    
    // Check supported formats
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.match(/\.(mp3|wav|m4a)$/i)) {
      throw new HttpException(
        `Invalid audio format (${file.mimetype}). Support is limited to MP3, WAV, and M4A recordings.`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE
      );
    }

    try {
      const result = await this.recordingService.uploadAndAnalyze(
        file.buffer,
        file.originalname,
        file.mimetype
      );
      return {
        success: true,
        message: 'Audio call recording parsed, analyzed, and stored in vector database.',
        data: result,
      };
    } catch (err) {
      throw new HttpException(
        `Recording intelligence pipeline error: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
