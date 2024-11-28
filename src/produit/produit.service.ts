// src/produit/produit.service.ts
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TypePrixEnum } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageGeneratorService } from '../utils/image-generator.service'; // Nouvel import
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import * as path from 'path';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';

@Injectable()
export class ProduitService {
  constructor(
    private readonly prisma: PrismaService,
    public readonly cloudinary: CloudinaryService,
    private readonly imageGenerator: ImageGeneratorService, // Injection du service
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrix
  ) {}

  /**
   * Génère une image localement et retourne son chemin.
   * @param content Contenu à écrire dans l'image.
   * @returns Chemin du fichier généré.
   */
  async generateLocalImage(content: Buffer): Promise<string> {
    const fileName = `generated-image-${Date.now()}.png`;
    const folder = 'local-images'; // Dossier cible pour les images générées
    return this.imageGenerator.generateImage(fileName, folder, content);
  }

  /**
   * Création d'un produit avec utilisateur et galerie photo
   * Évite les doublons en regroupant les téléchargements de photos
   */
  async creerProduit(data: CreateProduitDto, utilisateurId: string): Promise<{ message: string; produit: any }> {
    console.log('Début de la création du produit:', data);

    try {
      const { categorieId, photos, disponibilite, ...produitData } = data;

      const produit = await this.prisma.produit.create({
        data: {
          ...produitData,
          disponibilite: disponibilite ?? true,
          utilisateur: { connect: { id_User: utilisateurId } },
          categorie: categorieId ? { connect: { id_Categorie: categorieId } } : undefined,
        },
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true } },
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
        },
      });

      console.log('Produit créé dans la base de données:', produit);

      // Consolidation des uploads de photos
      if (photos?.length > 0) {
        const uploadedPhotos = [];

        for (const photo of photos) {
          let photoUrl = photo.url;

          // Convertir les chemins locaux en URLs Cloudinary uniquement si nécessaire
          if (photoUrl.startsWith('C:\\') || photoUrl.startsWith('/')) {
            const localPath = path.resolve(photoUrl);
            const result = await this.cloudinary.uploadLocalImage(localPath, 'produits');
            photoUrl = result.url;
          } else if (photoUrl.startsWith('content://') || photoUrl.startsWith('file://') || photoUrl.startsWith('assets-library://')) {
            // Path from a mobile device
            const result = await this.cloudinary.uploadMobileImage(photoUrl, 'produits');
            photoUrl = result.url;
          }

          uploadedPhotos.push({
            url: photoUrl,
            couverture: photo.couverture || false,
            produitId: produit.id_Produit,
          });
        }

        // Ajouter toutes les photos en un seul appel pour éviter les doublons
        await this.prisma.photo.createMany({ data: uploadedPhotos });
        console.log('Photos téléchargées et ajoutées à la base de données:', uploadedPhotos);
      }

      const produitComplet = await this.findOneProduit(produit.id_Produit);
      console.log('Produit complet récupéré:', produitComplet);

      return { message: 'Produit créé avec succès', produit: produitComplet };
    } catch (error) {
      console.error('Erreur dans creerProduit:', error);
      throw new Error(`Erreur lors de la création du produit: ${error.message}`);
    }
  }

  // Lecture des produits avec pagination
  async lireProduits(page: number = 1, limit: number = 10) {
    try {
      const produits = await this.prisma.produit.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true } },
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
          photos: { select: { id_Photo: true, url: true, couverture: true } },
        },
      });

      const totalCount = await this.prisma.produit.count();
      return {
        total: totalCount,
        page,
        pageCount: Math.ceil(totalCount / limit),
        data: produits,
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des produits: ${error.message}`);
    }
  }

  /**
     * Recherche des produits avec pagination et filtres
     * Simplifie les appels multiples pour éviter des requêtes redondantes
     */
  async rechercherProduits(filters: { nom?: string; categorieId?: string; disponibilite?: boolean; prixMin?: number; prixMax?: number; page?: number; limit?: number; }) {
    const { nom, categorieId, disponibilite, prixMin, prixMax, page = 1, limit = 10 } = filters;

    const where: Prisma.ProduitWhereInput = {
      nom_Produit: nom ? { contains: nom, mode: 'insensitive' } : undefined,
      categorieId: categorieId || undefined,
      prixInitial: {
        gte: prixMin,
        lte: prixMax,
      },
      ...(disponibilite !== undefined && { disponibilite }),
    };

    // Appels regroupés pour réduire les interactions avec la base
    const [produits, totalCount] = await Promise.all([
      this.prisma.produit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true } },
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
          photos: { select: { id_Photo: true, url: true, couverture: true } },
        },
      }),
      this.prisma.produit.count({ where }),
    ]);

    return {
      total: totalCount,
      page,
      pageCount: Math.ceil(totalCount / limit),
      data: produits,
    };
  }

  // Lecture d'un produit unique
  async findOneProduit(id: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id_Produit: id },
      include: {
        utilisateur: { select: { id_User: true, nom_user: true, role: true } },
        categorie: { select: { id_Categorie: true, nomCategorie: true } },
        photos: { select: { id_Photo: true, url: true, couverture: true } },
      },
    });

    if (!produit) throw new NotFoundException('Produit non trouvé');
    return produit;
  }

  // Modification d'un produit
  async modifierProduit(id: string, data: UpdateProduitDto, utilisateurId: string, role: string): Promise<{ message: string; produit: any }> {
    try {
      // Récupérer le produit à modifier
      const produit = await this.prisma.produit.findUnique({
        where: { id_Produit: id },
        include: { photos: true, utilisateur: true },
      });
  
      // Si le produit n'existe pas
      if (!produit) throw new NotFoundException('Produit non trouvé');
  
      // Vérification des droits d'accès
      if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
        throw new ForbiddenException('Accès non autorisé');
      }
  
      // Déstructuration des données
      const { photosToDelete, photosToAdd, categorieId, prixInitial, ...updateData } = data;
  
      // **Suppression des photos**
      if (photosToDelete?.length > 0) {
        const photosToDeleteData = produit.photos.filter((photo) =>
          photosToDelete.includes(photo.id_Photo)
        );
  
        for (const photo of photosToDeleteData) {
          const publicId = this.cloudinary.getPublicIdFromUrl(photo.url);
          if (publicId) {
            await this.cloudinary.deleteImage(publicId); // Suppression dans Cloudinary
          }
        }
  
        await this.prisma.photo.deleteMany({
          where: { id_Photo: { in: photosToDelete }, produitId: id },
        });
      }
  
      // **Ajout de nouvelles photos**
      if (photosToAdd?.length > 0) {
        const newPhotos = [];
        for (const photo of photosToAdd) {
          let photoUrl = photo.url;
  
          if (photoUrl.startsWith('C:\\') || photoUrl.startsWith('/')) {
            const localPath = path.resolve(photoUrl);
            const result = await this.cloudinary.uploadLocalImage(localPath, 'produits');
            photoUrl = result.url;
          } else if (photoUrl.startsWith('content://') || photoUrl.startsWith('file://') || photoUrl.startsWith('assets-library://')) {
            // Path from a mobile device
            const result = await this.cloudinary.uploadMobileImage(photoUrl, 'produits');
            photoUrl = result.url;
          }
  
          newPhotos.push({
            url: photoUrl,
            couverture: photo.couverture || false,
            produitId: id,
          });
        }
  
        await this.prisma.photo.createMany({ data: newPhotos });
      }

      // Vérification des changements de prix
      if (prixInitial !== undefined && prixInitial !== produit.prixInitial) {
        // Appeler le service HistoriquePrix pour enregistrer le changement
        try {
          await this.historiquePrixService.enregistrerHistoriquePrix(
            id,
            produit.prixInitial,
            prixInitial,
            TypePrixEnum.PRODUIT,
            utilisateurId // Ajoutez ce paramètre
          );
        } catch (error) {
          throw new InternalServerErrorException(
            `Erreur lors de l’enregistrement de l’historique des prix : ${error.message}`
          );
        }
      }
  
      // **Mise à jour des autres champs du produit**
      const updatedProduit = await this.prisma.produit.update({
        where: { id_Produit: id },
        data: {
          ...updateData,
          prixInitial, // Mise à jour du prix initial (s'il est défini dans la requête)
          categorie: categorieId ? { connect: { id_Categorie: categorieId } } : undefined,
        },
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true } },
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
          photos: { select: { id_Photo: true, url: true, couverture: true } },
        },
      });
  
      return { message: 'Produit modifié avec succès', produit: updatedProduit };
    } catch (error) {
      console.error('Erreur lors de la modification du produit:', error);
      throw new InternalServerErrorException('Une erreur est survenue lors de la modification du produit');
    }
  }
  


  // Suppression d'un produit
  async supprimerProduit(id: string, utilisateurId: string, role: string): Promise<{ message: string }> {
    const produit = await this.prisma.produit.findUnique({ where: { id_Produit: id }, select: { utilisateurId: true } });
    if (!produit) throw new NotFoundException('Produit non trouvé');

    if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new ForbiddenException('Accès non autorisé');
    }

    await this.prisma.photo.deleteMany({ where: { produitId: id } });
    await this.prisma.produit.delete({ where: { id_Produit: id } });

    return { message: 'Produit supprimé avec succès' };
  }
}