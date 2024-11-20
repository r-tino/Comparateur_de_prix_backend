// src/main.ts

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration CORS pour permettre les requêtes cross-origin
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend autorisé
    methods: 'GET,POST,PATCH,DELETE', // Méthodes HTTP autorisées
    credentials: true, // Permet les cookies et headers d'authentification
  });
  
  // Utilisation de pipes globaux pour la validation
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();