// src/produit/produit.controller.ts
import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, UnauthorizedException, BadRequestException, UseInterceptors, UploadedFiles, UploadedFile, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';
import { TypePrixEnum } from '@prisma/client';


@Controller('produits')
@UseGuards(RolesGuard)  // Retirer JwtAuthGuard ici
export class ProduitController {
  constructor(
      private readonly produitService: ProduitService,
      private readonly historiquePrixService: HistoriquePrixService, // Injection du service
  ) {}

  /**
   * Endpoint pour créer un produit
   * Gère les uploads de photos en regroupant les requêtes
   */

  // Gardez JwtAuthGuard pour les routes qui en ont besoin
  @Post()
  @Roles('Admin', 'Vendeur')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 10 }]))
  async creerProduit(
    @Body() createProduitDto: CreateProduitDto,
    @Req() req,
    @UploadedFiles() files: { photos?: Express.Multer.File[] },
  ) {
    const utilisateurId = req.user.userId;

    if (!['Vendeur', 'Admin'].includes(req.user.role)) {
      throw new UnauthorizedException('Seuls les vendeurs et administrateurs peuvent créer des produits.');
    }

    // Téléchargement unique des fichiers et photos locales
    if (files?.photos?.length > 0) {
      createProduitDto.photos = await Promise.all(
        files.photos.map(async (file) => {
          const result = await this.produitService.cloudinary.uploadLocalImage(file.path, 'produits');
          return { url: result.url, couverture: false };
        }),
      );
    }

    return await this.produitService.creerProduit(createProduitDto, utilisateurId);
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
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour POST
  async modifierProduit(@Param('id') id: string, @Body() data: UpdateProduitDto, @Req() req) {
    console.log('ID utilisateur connecté dans le contrôleur:', req.user?.userId);  // Utilisez `userId` ici
    console.log('Rôle utilisateur dans le contrôleur:', req.user?.role);
    
    const utilisateurId = req.user?.userId;  // Utilisez `userId` et non `id_User`
    const role = req.user?.role;

    // Vérification de l'ID du produit
    const produit = await this.produitService.findOneProduit(id);
    console.log('ID utilisateur du produit:', produit.utilisateurId);  // Vérifiez l'ID utilisateur du produit

    // Vérification des droits de modification
    if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new ForbiddenException('Accès non autorisé');
    }

    return await this.produitService.modifierProduit(id, data, utilisateurId, role);
  }

  /**
   * Endpoint pour récupérer l'historique des prix d'un produit
   * @param produitId ID du produit
   * @param page Numéro de la page pour la pagination
   * @param limit Nombre d'éléments par page
   * @param typePrix Type de prix (produit, offre, promotion)
   */
  @Get(':produitId/historique-prix')
  @Roles('Admin', 'Vendeur') // Définition des rôles autorisés
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour POST
  async lireHistoriquePrix(
    @Param('produitId') produitId: string, // Récupération de l'ID du produit
    @Query('page') page = '1', // Valeur par défaut pour la page
    @Query('limit') limit = '10', // Valeur par défaut pour la limite
    @Query('typePrix') typePrix: TypePrixEnum, // Type de prix (produit, offre, promotion)
  ) {
    console.log(`Requête reçue: produitId=${produitId}, page=${page}, limit=${limit}, typePrix=${typePrix}`);

    // Conversion des paramètres
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validation des paramètres de pagination
    if (isNaN(pageNumber) || pageNumber <= 0) {
      console.error('Paramètre "page" invalide:', page);
      throw new BadRequestException('Le paramètre "page" doit être un nombre positif.');
    }
    if (isNaN(limitNumber) || limitNumber <= 0) {
      console.error('Paramètre "limit" invalide:', limit);
      throw new BadRequestException('Le paramètre "limit" doit être un nombre positif.');
    }

    // Validation du typePrix
    if (!Object.values(TypePrixEnum).includes(typePrix)) {
      console.error('Paramètre "typePrix" invalide:', typePrix);
      throw new BadRequestException('Le paramètre "typePrix" est invalide.');
    }

    try {
      // Appel au service
      const result = await this.historiquePrixService.lireHistoriquePrix(produitId, typePrix, pageNumber, limitNumber);
      console.log(`Résultat du service:`, result);
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération de l’historique des prix:', error.message);
      throw new InternalServerErrorException('Erreur lors de la récupération de l’historique des prix.');
    }
  }


  // Suppression d'un produit (uniquement par le vendeur qui l'a créé)
  @Delete(':id')
  @Roles('Admin', 'Vendeur')
  @UseGuards(JwtAuthGuard)  // Ajouter JwtAuthGuard pour POST
  async supprimerProduit(@Param('id') id: string, @Req() req) {
    const utilisateurId = req.user.userId;  // Assurez-vous que l'ID de l'utilisateur est correct
    const role = req.user.role;  // Récupérez le rôle de l'utilisateur depuis `req.user`
    return await this.produitService.supprimerProduit(id, utilisateurId, role);
  }
}
