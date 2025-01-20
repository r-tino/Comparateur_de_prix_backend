// src/categorie/categorie.module.ts
import { Module } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CategorieController } from './categorie.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CategorieController],
  providers: [CategorieService, PrismaService],
  exports: [CategorieService],
})
export class CategorieModule {}