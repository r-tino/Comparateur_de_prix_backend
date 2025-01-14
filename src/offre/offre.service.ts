// src/offre/offre.service.ts
import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOffreDto } from './dto/create-offre.dto';
import { UpdateOffreDto } from './dto/update-offre.dto';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';
import { TypePrixEnum } from '@prisma/client';

@Injectable()
export class OffreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrix
  ) {}

  async createOffre(createOffreDto: CreateOffreDto, utilisateurId: string) {
    try {
      console.log('Données reçues pour la création de l\'offre:', {
        prix: createOffreDto.prixOffre,
        stock: createOffreDto.stock,
        dateExpiration: createOffreDto.dateExpiration,
        produitId: createOffreDto.produitId,
        utilisateurId: utilisateurId,
      });
  
      // Créer l'offre dans la base de données
      const offre = await this.prisma.offre.create({
        data: {
          prixOffre: createOffreDto.prixOffre,
          stock: createOffreDto.stock,
          dateExpiration: createOffreDto.dateExpiration,
          produitId: createOffreDto.produitId,
          utilisateurId: utilisateurId,
        },
        include: {
          produit: {
            select: {
              nom_Produit: true, // Retourner uniquement le nom du produit
              photos: { select: { url: true } },
            },
          },
          utilisateur: {
            select: {
              nom_user: true, // Retourner uniquement le nom de l'utilisateur
            },
          },
          promotion: { // Inclure la relation promotion pour obtenir son ID
            select: { prixPromotionnel: true },
          },
        },
      });

      const photoCouverture = offre.produit.photos[0]?.url;
  
      return {
        message: 'Offre créée avec succès',
        offre: {
          id_Offre: offre.id_Offre,
          prixOffre: offre.prixOffre,
          stock: offre.stock,
          dateExpiration: offre.dateExpiration,
          nom_Produit: offre.produit.nom_Produit, 
          photoCouverture, // Afficher nom_Produit à la place de produitId
          nom_user: offre.utilisateur.nom_user,   // Afficher nom_user à la place de utilisateurId
          promotionId: offre.promotion ? offre.promotion.prixPromotionnel : null, // Accéder à l'ID de la promotion
        },
      };
    } catch (error) {
      console.error("Erreur lors de la création de l'offre:", error);
      throw new Error("Erreur lors de la création de l'offre");
    }
  }

  async findAllOffres(query: { page?: string, limit?: string, sortBy?: string, order?: 'asc' | 'desc', priceMin?: string, priceMax?: string,keyword?: string }) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const priceMin = query.priceMin ? parseFloat(query.priceMin) : undefined;
    const priceMax = query.priceMax ? parseFloat(query.priceMax) : undefined;
    const sortBy = query.sortBy || 'id_Offre';
    const order = query.order || 'asc';
    const keyword = query.keyword || '';

    const whereConditions: any = {
      prixOffre: {
        ...(priceMin !== undefined && { gte: priceMin }),
        ...(priceMax !== undefined && { lte: priceMax })
      },
      OR: [
        {
          produit: { nom_Produit: { contains: keyword, mode: 'insensitive' }}
        },
        {
          utilisateur: { nom_user: { contains: keyword, mode: 'insensitive' }}
        }
      ]
    };

    const offres = await this.prisma.offre.findMany({
      where: whereConditions,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        produit: { 
          select: { 
            id_Produit: true,
            nom_Produit: true,
            photos: { select: { url: true } }, 
          },
        },
        utilisateur: { select: { nom_user: true } },
        promotion: { // Inclure la relation promotion pour obtenir son ID
          select: { prixPromotionnel: true },
        },
      },
    });

    const totalCount = await this.prisma.offre.count({ where: whereConditions });

    return {
      total: totalCount,
      page,
      pageCount: Math.ceil(totalCount / limit),
      data: offres.map((offre) => {
        // Exemple de modification dans votre backend si nécessaire
        const baseUrl = 'http://localhost:3001'; // Changez cela selon votre configuration
        const photoCouverture = offre.produit.photos[0]?.url 
        ? `${baseUrl}${offre.produit.photos[0].url}` 
        : null;
        return {
          id_Offre: offre.id_Offre,
          prixOffre: offre.prixOffre,
          stock: offre.stock,
          dateExpiration: offre.dateExpiration,
          id_produit: offre.produit.id_Produit,
          nom_Produit: offre.produit.nom_Produit,
          photoCouverture,
          nom_User: offre.utilisateur.nom_user,
          promotionId: offre.promotion ? offre.promotion.prixPromotionnel : null,
        };
      }),
    };
  }

  async findOneOffre(id: string) {
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: id },
      include: {
        produit: { 
          select: { 
            nom_Produit: true,
            photos: { select: { url: true } }, 
          }, 
        },
        utilisateur: { 
          select: { 
            id_User: true, // Ajoutez cette ligne
            nom_user: true, 
          },
         },
        promotion: { // Inclure la relation promotion pour obtenir son ID
          select: { prixPromotionnel: true },
        },
      },
    });

    if (!offre) {
      throw new NotFoundException('Offre non trouvée');
    }

    const photoCouverture = offre.produit.photos[0]?.url;

    return {
      id_Offre: offre.id_Offre,
      prixOffre: offre.prixOffre,
      stock: offre.stock,
      dateExpiration: offre.dateExpiration,
      nom_Produit: offre.produit.nom_Produit,
      photoCouverture,
      utilisateurId: offre.utilisateurId,
      nom_user: offre.utilisateur.nom_user,
      promotionId: offre.promotion ? offre.promotion.prixPromotionnel : null, // Accéder à l'ID de la promotion
    };
  }

  async updateOffre(id: string, updateOffreDto: UpdateOffreDto, utilisateurId: string) {
    try {
      // Récupère l'offre et vérifie le propriétaire
      const offre = await this.prisma.offre.findUnique({
        where: { id_Offre: id },
        select: { utilisateurId: true , prixOffre: true }, // Inclure l'ancien prix
      });
  
      if (!offre) {
        throw new NotFoundException("Offre non trouvée");
      }
  
      if (offre.utilisateurId !== utilisateurId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette offre");
      }

      // Vérification des changements de prix
      const { prixOffre } = updateOffreDto; // Nouveau prix fourni dans la mise à jour
      if (prixOffre !== undefined && prixOffre !== offre.prixOffre) {
        // Enregistrer l'historique du changement de prix
        try {
          await this.historiquePrixService.enregistrerHistoriquePrix(
            id,
            offre.prixOffre,
            prixOffre,
            TypePrixEnum.OFFRE,
            utilisateurId // Ajout de l'utilisateur
          );
        } catch (error) {
          throw new InternalServerErrorException(
            `Erreur lors de l’enregistrement de l’historique des prix : ${error.message}`,
          );
        }
      }
  
      // Met à jour l'offre si l'utilisateur est le propriétaire
      const updatedOffre = await this.prisma.offre.update({
        where: { id_Offre: id },
        data: updateOffreDto,
        include: {
          produit: {
            select: {
              nom_Produit: true,
              photos: { select: { url: true } },
            },
          },
          utilisateur: { select: { nom_user: true } },
          promotion: { // Inclure la relation promotion pour obtenir son ID
            select: { prixPromotionnel: true },
          },
        },
      });

      const modificateur = await this.prisma.utilisateur.findUnique({
        where: { id_User: utilisateurId },
        select: { nom_user: true },
      });
  
      const photoCouverture = updatedOffre.produit.photos[0]?.url;
  
      return {
        message: 'Offre mise à jour avec succès',
        offre: {
          id_Offre: updatedOffre.id_Offre,
          prix: updatedOffre.prixOffre,
          stock: updatedOffre.stock,
          dateExpiration: updatedOffre.dateExpiration,
          nom_Produit: updatedOffre.produit.nom_Produit,
          photoCouverture,
          nom_user: updatedOffre.utilisateur.nom_user,
          modifiePar: modificateur?.nom_user || null, // Ajout de l'utilisateur ayant effectué la modification
          promotionId: updatedOffre.promotion ? updatedOffre.promotion.prixPromotionnel : null,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’offre:', error.message || error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error; // Propager les exceptions spécifiques
      }
      throw new InternalServerErrorException("Une erreur est survenue lors de la mise à jour de l’offre.");
    }
  }
  

  async deleteOffre(id: string, utilisateurId: string) {
    // Vérifie le propriétaire avant la suppression
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: id },
      select: { utilisateurId: true },
    });

    if (!offre) throw new NotFoundException("Offre non trouvée");
    if (offre.utilisateurId !== utilisateurId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette offre");
    }

    // Supprimer l'historique des prix lié à cette offre
    await this.prisma.historiquePrix.deleteMany({
      where: { sourceId: id, typePrix: TypePrixEnum.OFFRE },
    });

    // Supprime l'offre si l'utilisateur est le propriétaire
    await this.prisma.offre.delete({ where: { id_Offre: id } });
    return { message: 'Offre supprimée avec succès', offreId: id };
  }
}