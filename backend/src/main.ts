import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend API requests
  app.enableCors({
    origin: '*', // allows simple local and cloud connectivity
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  logger.log(`NestJS server running on port: ${port}`);
}
bootstrap();
