import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getAppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = getAppConfig();
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.webOrigin });
  const openApi = new DocumentBuilder().setTitle('HireBit API').setVersion('0.1.0').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, openApi));
  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
