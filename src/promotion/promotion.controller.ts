// src/promotion/promotion.controller.ts

import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException, Query } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';
import { TypePrixEnum } from '@prisma/client';

@Controller('promotions')
@UseGuards(RolesGuard)
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrixService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour POST
  @Roles('Admin', 'Vendeur')  // Seuls les rôles Admin et Vendeur peuvent créer des promotions
  async create(@Body() createPromotionDto: CreatePromotionDto, @Req() req) {
    console.log("User data in request:", req.user); // Ajouter ce log pour déboguer
    try {
      const { user } = req;
      if (!user || !user.id_User) {
        throw new ForbiddenException("Utilisateur non autorisé ou ID manquant");
      }
      // Crée une promotion, la gestion de l'historique des prix se fait automatiquement
      const promotion = await this.promotionService.create(createPromotionDto, user.id_User);
      return promotion;
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors de la création de la promotion : ${error.message}`);
    }
  }
  

  @Get()
  async findAll() {
    return await this.promotionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const promotion = await this.promotionService.findOne(id);
    if (!promotion) {
      throw new NotFoundException('Promotion non trouvée');
    }
    return promotion;
  }

  @Patch(':id')
  @Roles('Admin', 'Vendeur')  // Seuls les rôles Admin et Vendeur peuvent mettre à jour des promotions
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour PATCH
  async update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto, @Req() req) {
    try {
      const { user } = req;
      const existingPromotion = await this.promotionService.findOne(id);
        if (!existingPromotion) {
          throw new NotFoundException("Promotion non trouvée");
        }
      // Met à jour la promotion, l'historique des prix est géré automatiquement lors du changement de prix
      const updatedPromotion = await this.promotionService.update(id, updatePromotionDto, user.id_User);
      return updatedPromotion;
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors de la mise à jour de la promotion : ${error.message}`);
    }
  }

  @Delete(':id')
  @Roles('Admin', 'Vendeur') // Utilisation directe des rôles// Seuls les rôles Admin et Vendeur peuvent supprimer des promotions
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour DELETE
  async remove(@Param('id') id: string, @Req() req) {
    try {
    const { user } = req;
     // Supprime la promotion
     const deletedPromotion = await this.promotionService.remove(id, user.id_User);
     return deletedPromotion;
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors de la suppression de la promotion : ${error.message}`);
    }
  }

  /**
   * Endpoint pour récupérer l'historique des prix d'une promotion.
   */
  @Get(':promotionId/historique-prix')
  @Roles('Admin', 'Vendeur')
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour GET historique-prix
  async lireHistoriquePrix(
    @Param('promotionId') promotionId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber <= 0) {
      throw new BadRequestException('Le paramètre "page" doit être un nombre positif.');
    }
    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new BadRequestException('Le paramètre "limit" doit être un nombre positif.');
    }

    try {
      // Appel au service historiquePrix
      return await this.historiquePrixService.lireHistoriquePrix(
        promotionId,
        TypePrixEnum.PROMOTION,
        pageNumber,
        limitNumber,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de la récupération de l'historique des prix : ${error.message}`,
      );
    }
  }
}

