// src/produit/produit.service.ts
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TypeNotifEnum, TypePrixEnum } from '@prisma/client';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service';
import { NotificationService } from '../notification/notification.service';  // Importation du service


@Injectable()
export class ProduitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrix
    private readonly notificationService: NotificationService, // Injection du service
  ) {}

  // Valide les attributs dynamiques basés sur la catégorie.
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

  // Création d'un produit avec utilisateur et galerie photo
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
        }));

        await this.prisma.photo.createMany({ data: photosData });
        console.log("Photos ajoutées à la base de données:", photosData);
      }

      const produitComplet = await this.findOneProduit(produitCree.id_Produit);
      console.log("Produit complet récupéré:", produitComplet);

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

  // Recherche des produits avec pagination et filtres
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

      // Ajout de nouvelles photos
      if (photosToAdd?.length > 0) {
        const newPhotos = [];
        for (const photo of photosToAdd) {
          const result = await this.cloudinary.uploadImage(photo.url, 'produits');
          newPhotos.push({
            url: result.url,
            couverture: photo.couverture || false,
            produitId: id,
            publicId: result.public_id,
          });
        }

        await this.prisma.photo.createMany({ data: newPhotos });
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
    const produit = await this.prisma.produit.findUnique({ where: { id_Produit: id }, select: { utilisateurId: true, photos: true } });
    if (!produit) throw new NotFoundException('Produit non trouvé');

    if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Suppression des photos de Cloudinary
    for (const photo of produit.photos) {
      const publicId = this.cloudinary.getPublicIdFromUrl(photo.url);
      if (publicId) {
        await this.cloudinary.deleteImage(publicId);
      }
    }

    // Suppression des photos de la base de données
    await this.prisma.photo.deleteMany({ where: { produitId: id } });

    // Suppression du produit
    await this.prisma.produit.delete({ where: { id_Produit: id } });

    return { message: 'Produit supprimé avec succès' };
  }
}