// src/promotion/promotion.service.ts
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service'; // Injection du service HistoriquePrix
import { TypePrixEnum } from '@prisma/client';

@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly historiquePrixService: HistoriquePrixService, // Injection du service HistoriquePrix
  ) {}

  // Créer une promotion avec calcul automatique du prix promotionnel
  async create(data: CreatePromotionDto, userId: string) {
    // Validation des dates
    if (data.dateDebut >= data.dateFin) {
      throw new BadRequestException("La date de début doit être antérieure à la date de fin.");
    }

    const isOwner = await this.checkOfferOwnership(data.offreId, userId);
    if (!isOwner) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer une promotion pour cette offre.");
    }

    // Récupération du prix initial de l'offre pour le calcul de la promotion
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: data.offreId },
      select: {
        prixOffre: true,
        produit: {
          select: {
            nom_Produit: true,
            photos: { select: { url: true } },
          },
        },
        utilisateur: {
          select: { nom_user: true },
        },
      },
    });

    if (!offre) {
      throw new NotFoundException("L'offre associée n'existe pas.");
    }

    // Calcul du prix promotionnel en appliquant le pourcentage de réduction
    const prixPromotionnel = offre.prixOffre - (offre.prixOffre * data.pourcentage) / 100;

    // Enregistrer l'historique du changement de prix
    try {
      await this.historiquePrixService.enregistrerHistoriquePrix(
        data.offreId,
        offre.prixOffre,
        prixPromotionnel,
        TypePrixEnum.PROMOTION,
        userId // Ajout de l'utilisateur
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de l’enregistrement de l’historique des prix : ${error.message}`,
      );
    }

    // Enregistrer le Promotion
    try {
      const promotion = await this.prisma.promotion.create({
        data: {
          ...data,
          prixPromotionnel,
        },
        include: {
          offre: {
            select: {
              produit: {
                select: { nom_Produit: true, photos: { select: { url: true } } },
              },
              utilisateur: { select: { nom_user: true } },
            },
          },
        },
      });

      // Sélectionner la photo de couverture (première photo)
      const photoCouverture = promotion.offre.produit.photos[0]?.url;

      return {
        message: 'Promotion créée avec succès',
        promotionId: promotion.id_Promotion,
        offre: {
          produitNom: promotion.offre.produit.nom_Produit,
          photoCouverture,
          utilisateurNom: promotion.offre.utilisateur.nom_user,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors de la création de la promotion: ${error.message}`);
    }
  }

  // Obtenir une promotion par ID
  async findOne(id: string) {
    try {
      const promotion = await this.prisma.promotion.findUnique({
        where: { id_Promotion: id },
        include: {
          offre: {
            select: {
              produit: {
                select: { nom_Produit: true, photos: { select: { url: true } } },
              },
              utilisateur: { select: { nom_user: true } },
            },
          },
        },
      });
      if (!promotion) {
        throw new NotFoundException('Promotion non trouvée');
      }
      const photoCouverture = promotion.offre.produit.photos[0]?.url;

      return {
        ...promotion,
        offre: {
          produitNom: promotion.offre.produit.nom_Produit,
          photoCouverture,
          utilisateurNom: promotion.offre.utilisateur.nom_user,
        },
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de la promotion: ${error.message}`);
    }
  }

  // Récupérer toutes les promotions
  async findAll() {
    try {
      const promotions = await this.prisma.promotion.findMany({
        select: {
          id_Promotion: true,
          pourcentage: true,
          prixPromotionnel: true,
          dateDebut: true,
          dateFin: true,
          offre: {
            select: {
              produit: {
                select: { nom_Produit: true, photos: { select: { url: true } } },
              },
              utilisateur: { select: { nom_user: true } },
            },
          },
        },
      });
      return promotions.map((promotion) => {
        const photoCouverture = promotion.offre.produit.photos[0]?.url;
        return {
          ...promotion,
          offre: {
            produitNom: promotion.offre.produit.nom_Produit,
            photoCouverture,
            utilisateurNom: promotion.offre.utilisateur.nom_user,
          },
        };
      });
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des promotions: ${error.message}`);
    }
  }

 // Mettre à jour une promotion avec recalcul automatique du prix promotionnel
 async update(id: string, data: UpdatePromotionDto, userId: string) {
  const promotion = await this.prisma.promotion.findUnique({
    where: { id_Promotion: id },
    include: {
      offre: {
        select: {
          id_Offre: true,
          prixOffre: true,
          produit: { select: { nom_Produit: true, photos: { select: { url: true } } } },
          utilisateur: { select: { nom_user: true } },
        },
      },
    },
  });

  if (!promotion) {
    throw new NotFoundException('Promotion non trouvée.');
  }

  // Validation des dates
  if (data.dateDebut && data.dateFin && data.dateDebut >= data.dateFin) {
    throw new BadRequestException("La date de début doit être antérieure à la date de fin.");
  }

  const isOwner = await this.checkOfferOwnership(promotion.offre.id_Offre, userId);
  if (!isOwner) {
    throw new ForbiddenException("Vous n'êtes pas autorisé à mettre à jour cette promotion.");
  }

  const prixPromotionnel = promotion.offre.prixOffre - (promotion.offre.prixOffre * data.pourcentage) / 100;

  // Enregistrer l'historique du changement de prix
  try {
    await this.historiquePrixService.enregistrerHistoriquePrix(
      promotion.offre.id_Offre,
      promotion.offre.prixOffre,
      prixPromotionnel,
      TypePrixEnum.PROMOTION,
      userId // Ajout de l'utilisateur
    );
  } catch (error) {
    throw new InternalServerErrorException(
      `Erreur lors de l’enregistrement de l’historique des prix : ${error.message}`,
    );
  }

  // Enregistrer la modification du Promotion
  try {
    const updatedPromotion = await this.prisma.promotion.update({
      where: { id_Promotion: id },
      data: {
        ...data,
        prixPromotionnel,
      },
    });

    const photoCouverture = promotion.offre.produit.photos[0]?.url;

    return {
      message: 'Promotion mise à jour avec succès',
      promotionId: updatedPromotion.id_Promotion,
      prixPromotionnel: updatedPromotion.prixPromotionnel,
      offre: {
        produitNom: promotion.offre.produit.nom_Produit,
        photoCouverture,
        utilisateurNom: promotion.offre.utilisateur.nom_user,
      },
    };
  } catch (error) {
    throw new Error(`Erreur lors de la mise à jour de la promotion: ${error.message}`);
  }
}

  // Supprimer une promotion
  async remove(id: string, userId: string) {
    const isOwner = await this.checkPromotionOwnership(id, userId);
    if (!isOwner) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette promotion.");
    }

    try {
      await this.prisma.promotion.delete({
        where: { id_Promotion: id },
      });
      return { message: 'Promotion supprimée avec succès', promotionId: id };
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de la promotion: ${error.message}`);
    }
  }

  // Vérifier si l'utilisateur est propriétaire de l'offre pour une création de promotion
  async checkOfferOwnership(offreId: string, userId: string): Promise<boolean> {
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: offreId },
      select: { utilisateurId: true },
    });
    console.log("Offre utilisateurId:", offre?.utilisateurId, "User ID:", userId);
    return offre && offre.utilisateurId === userId;
  }

  // Vérifier si l'utilisateur est propriétaire de la promotion pour une modification/suppression
  async checkPromotionOwnership(promotionId: string, userId: string): Promise<boolean> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id_Promotion: promotionId },
      include: {
        offre: {
          select: { utilisateurId: true },
        },
      },
    });

    // Vérifiez si au moins une des offres est liée à l'utilisateur
    // return promotion && promotion.offre.some((offre) => offre.utilisateurId === userId)
    return promotion && promotion.offre.utilisateurId === userId;
  }
}