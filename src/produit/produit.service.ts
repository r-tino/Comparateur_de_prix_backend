import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Injectable()
export class ProduitService {
  constructor(private readonly prisma: PrismaService) {}

  // Création d'un produit par un utilisateur avec galerie photo et assignation de catégorie
  async creerProduit(data: CreateProduitDto, utilisateurId: string): Promise<{ message: string; produitId?: string }> {
    try {
      const { categorieId, photos, disponibilite, ...produitData } = data;

      // Créer le produit sans les photos d'abord pour obtenir id_Produit
      const produit = await this.prisma.produit.create({
        data: {
          ...produitData,
          disponibilite: disponibilite ?? true, // Valeur par défaut à "true" si non spécifié
          utilisateur: { connect: { id_User: utilisateurId } },
          categorie: categorieId ? { connect: { id_Categorie: categorieId } } : undefined,
        },
      });

      // Utilisez l'id_Produit pour créer les photos associées
      if (photos && photos.length > 0) {
        await this.prisma.photo.createMany({
          data: photos.map(photo => ({
            url: photo.url,
            couverture: photo.couverture,
            type: "Produit",
            produitId: produit.id_Produit,
          }))
        }); 
      }

      return { message: 'Produit créé avec succès', produitId: produit.id_Produit };
    } catch (error) {
      return { message: `Échec de la création du produit: ${error.message}` };
    }
  }

  // Lecture des produits avec pagination et filtrage
  async lireProduits(page: number = 1, limit: number = 10) {
    try {
      const produits = await this.prisma.produit.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          photos: true,
          categorie: true,
        },
      });
      return produits;
    } catch (error) {
      return { message: `Échec de la récupération des produits: ${error.message}` };
    }
  }

  async rechercherProduits(filters: { nom?: string, categorieId?: string, disponibilite?: boolean,  prixMin?: string | number, prixMax?: string | number, page?: number, limit?: number }) {
    const { nom, categorieId, disponibilite, prixMin, prixMax, page = 1, limit = 10 } = filters;
  
    const where: Prisma.ProduitWhereInput = {
      nom_Produit: nom ? { contains: nom, mode: 'insensitive' } : undefined,
      categorieId: categorieId || undefined,
      prixInitial: {
        gte: prixMin ? Number(prixMin) : undefined,
        lte: prixMax ? Number(prixMax) : undefined,
      },
      ...(disponibilite !== undefined && { disponibilite }),  // n'inclut `disponibilite` que s'il est défini
    };
    console.log('Filtre utilisé pour findMany:', where);

    return this.prisma.produit.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { photos: true, categorie: true },
    });
  }
  

  // Modification d'un produit
  async modifierProduit(id: string, data: UpdateProduitDto, utilisateurId: string, role: string): Promise<{ message: string }> {
    try {
      const produit = await this.prisma.produit.findUnique({ where: { id_Produit: id } });
      if (!produit) throw new NotFoundException('Produit non trouvé');

      // Autoriser uniquement le créateur du produit ou un administrateur à le modifier
      if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
        throw new ForbiddenException('Accès non autorisé');
      }

      // Supprimer les photos spécifiées pour suppression
      const photosToDelete = data.photosToDelete || [];
      if (photosToDelete.length > 0) {
        await this.prisma.photo.deleteMany({
          where: {
            id_Photo: { in: photosToDelete },
            produitId: id,
          },
        });
      }

      // Préparer les nouvelles photos à ajouter
      const nouvellesPhotos = data.photosToAdd?.map(photo => ({
        url: photo.url,
        couverture: photo.couverture || false,
        type: photo.type,
        produitId: id,  // Associer les nouvelles photos au produit
        utilisateurId: null, // Ajout de utilisateurId null pour les photos de produit
      }));

      // Mettre à jour la catégorie si elle est fournie dans les données
      const updateData: Prisma.ProduitUpdateInput = {
        ...data,
        disponibilite: data.disponibilite ?? produit.disponibilite, // Mettez à jour la disponibilité si spécifiée
      };

      if (data.categorieId) {
        updateData.categorie = { connect: { id_Categorie: data.categorieId } };
      }

      await this.prisma.produit.update({
        where: { id_Produit: id },
        data: {
          ...updateData,
          photos: {
            create: nouvellesPhotos,
          },
        },
      });

      return { message: 'Produit modifié avec succès' };
    } catch (error) {
      return { message: `Échec de la modification du produit: ${error.message}` };
    }
  }

  // Suppression d'un produit
  async supprimerProduit(id: string, utilisateurId: string, role: string): Promise<{ message: string }> {
    try {
      const produit = await this.prisma.produit.findUnique({ where: { id_Produit: id } });
      if (!produit) throw new NotFoundException('Produit non trouvé');

      // Autoriser uniquement le créateur du produit ou un administrateur à le supprimer
      if (produit.utilisateurId !== utilisateurId && role !== 'Admin') {
        throw new ForbiddenException('Accès non autorisé');
      }


      // Supprimer toutes les photos liées au produit
      await this.prisma.photo.deleteMany({
        where: { produitId: id }, // Suppression des photos liées uniquement au produit
      });

      await this.prisma.produit.delete({ where: { id_Produit: id } });
      return { message: 'Produit supprimé avec succès' };
    } catch (error) {
      return { message: `Échec de la suppression du produit: ${error.message}` };
    }
  }
}
