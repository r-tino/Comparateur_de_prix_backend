// src/note/note.module.ts
import { Module } from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule, PrismaModule], // Importation du module Prisma
  controllers: [NoteController], // Déclaration du contrôleur
  providers: [NoteService, JwtAuthGuard], // Déclaration du service
})
export class NoteModule {}