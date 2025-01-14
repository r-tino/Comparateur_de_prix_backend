// src/comparateur/comparateur.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ComparateurService } from './comparateur.service';

@Controller('comparateur')
export class ComparateurController {
  constructor(private readonly comparateurService: ComparateurService) {}

  // Comparaison automatique
  @Get('automatique')
  async comparerAutomatiquement(@Query() criteres: any) {
    return this.comparateurService.comparerProduitsAutomatiquement(criteres);
  }

  // Comparaison manuelle
  @Post('manuel')
  async comparerManuellement(@Body('idsProduits') idsProduits: string[]) {
    return this.comparateurService.comparerProduitsManuellement(idsProduits);
  }
}
