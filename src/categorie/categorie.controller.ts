import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCategorieDto } from './dto/create-categorie.dto';


@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  // Création d'une catégorie (administrateur uniquement)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async createCategorie(@Body() createCategorieDto: CreateCategorieDto) {
    return this.categorieService.createCategorie(createCategorieDto.nomCategorie);
  }
  
  // Récupération de toutes les catégories avec pagination et recherche (accessible à tous)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur') // Ajustez selon vos besoins
  async getCategories(
    @Req() req: any, // Récupère l'objet de requête pour accéder aux informations de l'utilisateur
    @Query('page') page: number = 1, 
    @Query('limit') limit: number = 10,
    @Query('nomCategorie') nomCategorie?: string,
  ) {
    const isAdmin = req.user?.role === 'Admin'; // Vérifie si l'utilisateur est un administrateur
    return this.categorieService.getCategories(Number(page), Number(limit), nomCategorie, isAdmin);
  }

  // Mise à jour d'une catégorie (administrateur uniquement)
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async updateCategorie(
    @Param('id') id: string, 
    @Body() createCategorieDto: CreateCategorieDto
  ) {
    return this.categorieService.updateCategorie(id, createCategorieDto);
  }
  

  // Suppression d'une catégorie (administrateur uniquement)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async deleteCategorie(@Param('id') id: string) {
    return this.categorieService.deleteCategorie(id);
  }

    // Nouvelle route: Récupération des statistiques des catégories
    @Get('statistics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('Admin')
    async getCategorieStatistics() {
      return this.categorieService.getCategorieStatistics();
    }
}
