// src/utilisateur/utilisateur.module.ts
import { Module } from '@nestjs/common';
import { UtilisateurService } from './utilisateur.service';
import { UtilisateurController } from './utilisateur.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ AuthModule ],
  providers: [UtilisateurService, PrismaService],
  controllers: [UtilisateurController],
  exports: [UtilisateurService],
})
export class UtilisateurModule {}
