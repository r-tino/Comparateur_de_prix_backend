import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProduitDto } from './dto/create-produit.dto'; // DTO pour la validation
import { UpdateProduitDto } from './dto/update-produit.dto';

@Controller('produits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProduitController {
  constructor(private readonly produitService: ProduitService) {}

  // Création d'un produit (accessible uniquement aux vendeurs)
  @Post()
  @Roles('Admin', 'Vendeur')
  async creerProduit(@Body() createProduitDto: CreateProduitDto, @Req() req) {
    const utilisateurId = req.user.userId; // Récupérer l'ID du vendeur authentifié
    // Vérifier le rôle de l'utilisateur avant de créer un produit
    if (req.user.role !== 'Vendeur' && req.user.role !== 'Admin') {
      throw new UnauthorizedException("Seuls les vendeurs et les administrateurs peuvent créer des produits.");
    }
    return this.produitService.creerProduit(createProduitDto, utilisateurId);
  }

  // Lecture des produits avec filtrage et pagination
  @Get()
  async lireProduits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Appliquer des valeurs par défaut si `page` ou `limit` ne sont pas définis
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    // Vérifiez que les valeurs sont des nombres valides
    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      throw new BadRequestException('Les paramètres page et limit doivent être des nombres.');
    }

    return this.produitService.lireProduits(pageNumber, limitNumber);
  }


  @Get('search')
  async rechercherProduits(
    @Query('nom') nom: string,
    @Query('categorie') categorieId: string,
    @Query('disponibilite') disponibilite: string,
    @Query('prixMin') prixMin: string,
    @Query('prixMax') prixMax: string,
    @Query('page') page: string = '1',  // Défini en chaîne par défaut
    @Query('limit') limit: string = '10', // Défini en chaîne par défaut
  ) {
    // Convertir les valeurs en types nécessaires avec des valeurs par défaut en cas de conversion échouée
    const convertedPrixMin = prixMin ? Number(prixMin) : undefined;
    const convertedPrixMax = prixMax ? Number(prixMax) : undefined;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    // Préparation des filtres pour la recherche
    const filters: any = {
      nom,
      categorieId,
      prixMin: convertedPrixMin,
      prixMax: convertedPrixMax,
      page: pageNumber,
      limit: limitNumber,
    };

    // Inclure `disponibilite` uniquement s'il est défini
    if (disponibilite !== undefined) {
      filters.disponibilite = disponibilite === 'true';
    }

    console.log('Filtres envoyés au service:', filters);

    return this.produitService.rechercherProduits(filters);
  }

  


  // Modification d'un produit (uniquement par le vendeur qui l'a créé)
  @Patch(':id')
  @Roles('Admin', 'Vendeur')
  async modifierProduit(@Param('id') id: string, @Body() data: UpdateProduitDto, @Req() req) {
    const utilisateurId  = req.user.id;
    const role = req.user.role; // Récupérer le rôle de l'utilisateur
    return await this.produitService.modifierProduit(id, data, utilisateurId, role);
  }

  // Suppression d'un produit (uniquement par le vendeur qui l'a créé)
  @Delete(':id')
  @Roles('Admin', 'Vendeur')
  async supprimerProduit(@Param('id') id: string, @Req() req) {
    const utilisateurId = req.user.userId;  // Assurez-vous que l'ID de l'utilisateur est correct
    const role = req.user.role;  // Récupérez le rôle de l'utilisateur depuis `req.user`
    return await this.produitService.supprimerProduit(id, utilisateurId, role);
  }
}
