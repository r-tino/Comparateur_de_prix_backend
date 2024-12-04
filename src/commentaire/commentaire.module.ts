// src/commentaire/commentaire.module.ts
import { Module } from '@nestjs/common';
import { CommentaireService } from './commentaire.service';
import { CommentaireController } from './commentaire.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Si vous utilisez Prisma pour MongoDB
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule, PrismaModule], // Ajouter les modules nécessaires, par exemple Prisma ou d'autres dépendances
  controllers: [CommentaireController],
  providers: [CommentaireService, JwtAuthGuard],
})
export class CommentaireModule {}
