// src/produit/produit.service.ts
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TypeNotifEnum, TypePrixEnum } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageGeneratorService } from '../utils/image-generator.service'; // Nouvel import
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import * as path from 'path';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service';
import { NotificationService } from '../notification/notification.service';  // Importation du service


@Injectable()
export class ProduitService {
  constructor(
    private readonly prisma: PrismaService,
    public readonly cloudinary: CloudinaryService,
    private readonly imageGenerator: ImageGeneratorService, // Injection du service
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrix
    private readonly notificationService: NotificationService, // Injection du service
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
   * Valide les attributs dynamiques basés sur la catégorie.
   */
  private async validateDynamicAttributes(categorieId: string, attributes: Record<string, any>): Promise<void> {
    if (!categorieId || !attributes) return;

    const categorie = await this.prisma.categorie.findUnique({
      where: { id_Categorie: categorieId },
      include: { attributs: true },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie non trouvée');
    }

    const requiredAttributes = categorie.attributs.filter(attr => attr.estObligatoire);

    for (const attr of requiredAttributes) {
      if (!(attr.nomAttribut in attributes)) {
        throw new BadRequestException(`L'attribut requis "${attr.nomAttribut}" est manquant pour la catégorie "${categorie.nomCategorie}".`);
      }
    }
  }

  /**
   * Création d'un produit avec utilisateur et galerie photo
   */
  async creerProduit(data: CreateProduitDto, utilisateurId: string): Promise<{ message: string; produit: any }> {
    console.log('Début de la création du produit:', data);

    try {
      const { categorieId, photos, disponibilite, valeursAttributs, ...produitData } = data;

      // Valider les attributs dynamiques
      if (categorieId) {
        await this.validateDynamicAttributes(categorieId, valeursAttributs || {});
      }

      const produitCree = await this.prisma.produit.create({
        data: {
          ...produitData,
          disponibilite: disponibilite ?? true,
          valeursAttributs,
          utilisateur: { connect: { id_User: utilisateurId } },
          categorie: categorieId ? { connect: { id_Categorie: categorieId } } : undefined,
        },
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true } },
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
        },
      });

      console.log('Produit créé dans la base de données:', produitCree);

      if (photos?.length > 0) {
      const photosData = photos.map((photo) => ({
        url: photo.url,
        couverture: photo.couverture || false,
        produitId: produitCree.id_Produit,
        publicId: photo.publicId,
      }))

      await this.prisma.photo.createMany({ data: photosData })
      console.log("Photos ajoutées à la base de données:", photosData)
    }

    const produitComplet = await this.findOneProduit(produitCree.id_Produit)
    console.log("Produit complet récupéré:", produitComplet)

    return { message: 'Produit créé avec succès', produit: produitComplet };
  } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      throw new InternalServerErrorException(`Erreur lors de la création du produit : ${error.message || 'Erreur inconnue'}`);
    }
  }

  // Lecture des produits avec pagination
  async lireProduits(page: number = 1, limit: number = 10) {
    try {
      const produits = await this.prisma.produit.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          utilisateur: { select: { id_User: true, nom_user: true, role: true, email: true } }, // Ajout de l'email
          categorie: { select: { id_Categorie: true, nomCategorie: true } },
          photos: { select: { id_Photo: true, url: true, couverture: true } },
        },
      });
  
      const totalCount = await this.prisma.produit.count();
      return {
        success: true,
        data: {
          total: totalCount,
          page,
          pageCount: Math.ceil(totalCount / limit),
          data: produits,
        },
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des produits: ${error.message}`);
    }
  }

  /**
     * Recherche des produits avec pagination et filtres
     * Simplifie les appels multiples pour éviter des requêtes redondantes
     */
  async rechercherProduits(filters: {
    nom?: string
    categorieId?: string
    disponibilite?: boolean
    prixMin?: number
    prixMax?: number
    page?: number
    limit?: number
  }) {
    const { nom, categorieId, disponibilite, prixMin, prixMax, page = 1, limit = 10 } = filters

    const where: Prisma.ProduitWhereInput = {
      nom_Produit: nom ? { contains: nom, mode: "insensitive" } : undefined,
      categorieId: categorieId || undefined,
      prixInitial: {
        gte: prixMin,
        lte: prixMax,
      },
      ...(disponibilite !== undefined && { disponibilite }),
    }

    try {
      const [produits, totalCount] = await Promise.all([
        this.prisma.produit.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            utilisateur: { select: { id_User: true, nom_user: true, role: true, email: true } },
            categorie: { select: { id_Categorie: true, nomCategorie: true } },
            photos: { select: { id_Photo: true, url: true, couverture: true } },
          },
        }),
        this.prisma.produit.count({ where }),
      ])

      return {
        total: totalCount,
        page,
        pageCount: Math.ceil(totalCount / limit),
        data: produits,
      }
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors de la recherche des produits: ${error.message}`)
    }
  }

  // Lecture d'un produit unique
  async findOneProduit(id: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id_Produit: id },
      include: {
        utilisateur: { select: { id_User: true, nom_user: true, role: true, email: true } }, // Ajout de l'email
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
      const produit = await this.prisma.produit.findUnique({
        where: { id_Produit: id },
        include: { photos: true, utilisateur: true },
      });
  
      if (!produit) {
        throw new NotFoundException('Produit non trouvé');
      }
  
      if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
        throw new ForbiddenException('Accès non autorisé');
      }
  
      const { photosToDelete, photosToAdd, categorieId, prixInitial, ...updateData } = data;
  
      // Valider les attributs dynamiques si la catégorie est modifiée ou les attributs sont mis à jour
      if (categorieId || Object.keys(updateData).length > 0) {
        await this.validateDynamicAttributes(categorieId || produit.categorieId, updateData);
      }

      // Suppression des photos
      try {
        if (photosToDelete?.length > 0) {
          const photosToDeleteData = produit.photos.filter(photo => photosToDelete.includes(photo.id_Photo));

          for (const photo of photosToDeleteData) {
            const publicId = this.cloudinary.getPublicIdFromUrl(photo.url);
            if (publicId) {
              await this.cloudinary.deleteImage(publicId);
            }
          }
    
          await this.prisma.photo.deleteMany({
            where: { id_Photo: { in: photosToDelete }, produitId: id },
          });
        }
      } catch (photoDeleteError) {
        console.error("Erreur lors de la suppression des photos", photoDeleteError);
        throw new InternalServerErrorException("Erreur lors de la suppression des photos");
      }
  
      // Ajout de nouvelles photos
      try {
        if (photosToAdd?.length > 0) {
          const newPhotos = [];
          for (const photo of photosToAdd) {
            let photoUrl = photo.url;
  
            if (photoUrl.startsWith('C:\\') || photoUrl.startsWith('/')) {
              const localPath = path.resolve(photoUrl);
              const result = await this.cloudinary.uploadLocalImage(localPath, 'produits');
              photoUrl = result.url;
            } else if (photoUrl.startsWith('content://') || photoUrl.startsWith('file://') || photoUrl.startsWith('assets-library://')) {
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
      } catch (photoAddError) {
        console.error("Erreur lors de l'ajout des photos", photoAddError);
        throw new InternalServerErrorException("Erreur lors de l'ajout des photos");
      }
  
      // Enregistrement de l'historique des prix
      if (prixInitial !== undefined && prixInitial !== produit.prixInitial) {
        try {
          await this.historiquePrixService.enregistrerHistoriquePrix(
            id,
            produit.prixInitial,
            prixInitial,
            TypePrixEnum.PRODUIT,
            utilisateurId
          );
  
          await this.notificationService.notify(
            utilisateurId,
            TypeNotifEnum.PRISE,
            `Le prix du produit ${produit.nom_Produit} a été modifié de ${produit.prixInitial} à ${prixInitial}.`
          );
        } catch (historiqueError) {
          console.error('Erreur lors de l’enregistrement de l’historique des prix :', historiqueError);
          throw new InternalServerErrorException(`Erreur lors de l’enregistrement de l’historique des prix : ${historiqueError.message || 'Erreur inconnue'}`);
        }
      }
  
      // Mise à jour des autres champs du produit
      try {
        const updatedProduit = await this.prisma.produit.update({
          where: { id_Produit: id },
          data: {
            ...updateData,
            prixInitial,
            categorie: categorieId ? { connect: { id_Categorie: categorieId } } : undefined,
          },
          include: {
            utilisateur: { select: { id_User: true, nom_user: true, role: true, email: true } }, // Ajout de l'email
            categorie: { select: { id_Categorie: true, nomCategorie: true } },
            photos: { select: { id_Photo: true, url: true, couverture: true } },
          },
        });
  
        return { message: 'Produit modifié avec succès', produit: updatedProduit };
      } catch (updateError) {
        console.error("Erreur lors de la mise à jour du produit", updateError);
        throw new InternalServerErrorException('Erreur lors de la mise à jour du produit');
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Erreur inattendue lors de la modification du produit:', error);
      throw new InternalServerErrorException('Une erreur inattendue est survenue lors de la modification du produit');
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