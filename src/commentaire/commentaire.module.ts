// src/commentaire/commentaire.module.ts
import { Module } from '@nestjs/common';
import { CommentaireService } from './commentaire.service';
import { CommentaireController } from './commentaire.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Si vous utilisez Prisma pour MongoDB
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationModule } from '../notification/notification.module'; // Importer le module Notification

@Module({
  imports: [AuthModule, PrismaModule, NotificationModule], // Ajout de NotificationModule ici
  controllers: [CommentaireController],
  providers: [CommentaireService, JwtAuthGuard],
})
export class CommentaireModule {}
