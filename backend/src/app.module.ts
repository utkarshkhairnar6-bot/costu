import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { RecordingService } from './recording/recording.service';
import { RecordingController } from './recording/recording.controller';
import { QaService } from './qa/qa.service';
import { QaController } from './qa/qa.controller';
import { PersonaController } from './persona/persona.controller';
import { SimulatorController } from './simulator/simulator.controller';
import { AnalyticsController } from './analytics/analytics.controller';
import { GeminiRotator } from './common/gemini-rotator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [
    RecordingController,
    QaController,
    PersonaController,
    SimulatorController,
    AnalyticsController,
  ],
  providers: [
    PrismaService,
    RecordingService,
    QaService,
    GeminiRotator,
  ],
})
export class AppModule {}
