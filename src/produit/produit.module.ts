// src/produit/produit.module.ts
import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // Import du module Cloudinary
import { UtilsModule } from '../utils/utils.module'; // Importez UtilsModule

@Module({
  imports: [AuthModule, CloudinaryModule, UtilsModule], // Ajout des modules Auth et Cloudinary
  controllers: [ProduitController],
  providers: [ProduitService, PrismaService, JwtAuthGuard], // Fournir Prisma et JwtAuthGuard
})
export class ProduitModule {}