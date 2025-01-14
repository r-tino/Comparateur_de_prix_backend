// src/comparateur/comparateur.module.ts
import { Module } from '@nestjs/common';
import { ComparateurService } from './/comparateur.service';
import { ComparateurController } from './comparateur.controller';
import { ProduitModule } from '../produit/produit.module';
import { OffreModule } from '../offre/offre.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service';

@Module({
  imports: [ProduitModule, OffreModule, PrismaModule], // Ajoutez les modules nécessaires
  controllers: [ComparateurController],
  providers: [ComparateurService, HistoriquePrixService],
})
export class ComparateurModule {}