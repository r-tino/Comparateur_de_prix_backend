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
import * as fs from "fs"

@Controller('produits')
export class ProduitController {
  constructor(
      private readonly produitService: ProduitService,
      private readonly historiquePrixService: HistoriquePrixService, // Injection du service
  ) {}

  /**
   * Endpoint pour créer un produit
   * Gère les uploads de photos en regroupant les requêtes
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'photos', maxCount: 10 }
  ], {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Seules les images sont autorisées.'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5 Mo par fichier
  }))  
  async creerProduit(
    @Body() createProduitDto: CreateProduitDto,
    @Req() req,
    @UploadedFiles() files: { photos?: Express.Multer.File[] },
  ) {
    const utilisateurId = req.user.userId;

    if (!['Vendeur', 'Admin'].includes(req.user.role)) {
      throw new UnauthorizedException('Seuls les vendeurs et administrateurs peuvent créer des produits.');
    }

    try {
      if (files?.photos?.length > 0) {
        const uploadResults = await Promise.all(
          files.photos.map((file) => this.produitService.cloudinary.uploadLocalImage(file.path, "produits")),
        )
  
        createProduitDto.photos = uploadResults.map((result) => ({
          url: result.url,
          couverture: false,
          publicId: result.public_id,
        }))
      }
  
      const result = await this.produitService.creerProduit(createProduitDto, utilisateurId)
      return { success: true, data: result };
    } catch (error) {
      console.error("Erreur lors de la création du produit:", error)
      throw new InternalServerErrorException("Erreur lors de la création du produit: " + error.message)
    } finally {
      // Nettoyage des fichiers temporaires
      if (files?.photos) {
        files.photos.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Erreur lors de la suppression du fichier temporaire:", err)
          })
        })
      }
    }
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


  @Get("search")
  async rechercherProduits(
    @Query('nom') nom: string,
    @Query('categorie') categorieId: string,
    @Query('disponibilite') disponibilite: string,
    @Query('prixMin') prixMin: string,
    @Query('prixMax') prixMax: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const filters = {
        nom,
        categorieId,
        disponibilite: disponibilite === "true",
        prixMin: prixMin ? Number(prixMin) : undefined,
        prixMax: prixMax ? Number(prixMax) : undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      }

      const result = await this.produitService.rechercherProduits(filters)
      return { success: true, data: result }
    } catch (error) {
      console.error("Erreur lors de la recherche des produits:", error)
      return {
        success: false,
        error: error.message || "Une erreur est survenue lors de la recherche des produits.",
      }
    }
  }

  
  // Modification d'un produit (uniquement par le vendeur qui l'a créé)
  @Patch(':id')
  @UseGuards( JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur')
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
  @UseGuards( JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur')
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
  @UseGuards( JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur')
  async supprimerProduit(@Param('id') id: string, @Req() req) {
    const utilisateurId = req.user.userId;  // Assurez-vous que l'ID de l'utilisateur est correct
    const role = req.user.role;  // Récupérez le rôle de l'utilisateur depuis `req.user`
    return await this.produitService.supprimerProduit(id, utilisateurId, role);
  }
}
