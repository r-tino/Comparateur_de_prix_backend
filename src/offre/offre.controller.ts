// src/offre/offre.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { OffreService } from './offre.service';
import { CreateOffreDto } from './dto/create-offre.dto';
import { UpdateOffreDto } from './dto/update-offre.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('offres')
export class OffreController {
  constructor(private readonly offreService: OffreService) {}

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
    const utilisateurId = req.user.userId; // Récupération de l'ID de l'utilisateur
    return await this.offreService.updateOffre(id, updateOffreDto, utilisateurId);
  }

  @Delete(':id')
  @Roles('Vendeur', 'Admin')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    const utilisateurId = req.user.userId; // Récupération de l'ID de l'utilisateur
    return await this.offreService.deleteOffre(id, utilisateurId);
  }
}
