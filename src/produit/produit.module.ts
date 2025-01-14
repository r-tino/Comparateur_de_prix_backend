// src/produit/produit.module.ts
import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UtilsModule } from '../utils/utils.module';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service';
import { NotificationModule } from '../notification/notification.module'; // Importation de NotificationModule

@Module({
  imports: [AuthModule, CloudinaryModule, UtilsModule, NotificationModule], // Ajout de NotificationModule
  controllers: [ProduitController],
  providers: [ProduitService, PrismaService, JwtAuthGuard, HistoriquePrixService], // Fournisseurs nécessaires
  exports: [ProduitService],
})
export class ProduitModule {}
