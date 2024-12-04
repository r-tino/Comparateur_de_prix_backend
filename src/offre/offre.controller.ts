// src/offre/offre.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { OffreService } from './offre.service';
import { CreateOffreDto } from './dto/create-offre.dto';
import { UpdateOffreDto } from './dto/update-offre.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';
import { TypePrixEnum } from '@prisma/client';

@Controller('api/offres') // Ajoutez 'api' pour un préfixe d'URL complet
export class OffreController {
  constructor(
    private readonly offreService: OffreService,
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service historiquePrix
  ) {}

  @Post()
  @Roles('Vendeur', 'Admin')
  @UseGuards(JwtAuthGuard) // Garde d'authentification appliquée ici seulement
  async create(@Body() createOffreDto: CreateOffreDto, @Request() req) {
    try {
      const utilisateurId = req.user.userId; // Récupération de l'utilisateur à partir du token JWT
      const offre = await this.offreService.createOffre(createOffreDto, utilisateurId);
      
      return offre;
    } catch (error) {
      throw error; // Gestion des erreurs
    }
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order: 'asc' | 'desc' = 'asc',
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('keyword') keyword?: string
  ) {
    return await this.offreService.findAllOffres({
      page: page?.toString(),
      limit: limit?.toString(),
      sortBy,
      order,
      priceMin: priceMin?.toString(),
      priceMax: priceMax?.toString(),
      keyword,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.offreService.findOneOffre(id);
  }


  @Patch(':id')
  @Roles('Vendeur', 'Admin')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateOffreDto: UpdateOffreDto,
    @Request() req,
  ) {
    const utilisateurId = req.user.userId; // Récupération de l'utilisateur connecté
    const role = req.user.role; // Récupération du rôle

    // Récupération de l'offre avant modification
    const offre = await this.offreService.findOneOffre(id);
    if (!offre) {
      throw new BadRequestException("L'offre spécifiée est introuvable.");
    }

    // Vérification des droits de modification
    if (offre.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new BadRequestException("Vous n'êtes pas autorisé à modifier cette offre.");
    }

    // Mettre à jour l'offre
    return await this.offreService.updateOffre(id, updateOffreDto, utilisateurId);
  }

  @Delete(':id')
  @Roles('Vendeur', 'Admin')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    const utilisateurId = req.user.userId; // Récupération de l'ID de l'utilisateur
    return await this.offreService.deleteOffre(id, utilisateurId);
  }

  /**
   * Endpoint pour récupérer l'historique des prix d'une offre.
   */
  @Get(':offreId/historique-prix')
  @Roles('Vendeur', 'Admin')
  async lireHistoriquePrix(
    @Param('offreId') offreId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('typePrix') typePrix: TypePrixEnum,
  ) {
    // Validation des paramètres de pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber <= 0) {
      throw new BadRequestException('Le paramètre "page" doit être un nombre positif.');
    }
    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new BadRequestException('Le paramètre "limit" doit être un nombre positif.');
    }

    // Validation du type de prix
    if (!Object.values(TypePrixEnum).includes(typePrix)) {
      throw new BadRequestException('Le paramètre "typePrix" est invalide.');
    }

    try {
      // Appel au service historiquePrix
      return await this.historiquePrixService.lireHistoriquePrix(offreId, typePrix, pageNumber, limitNumber);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de la récupération de l'historique des prix : ${error.message}`,
      );
    }
  }
}
