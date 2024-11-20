// src/promotion/promotion.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  // Créer une promotion avec calcul automatique du prix promotionnel
  async create(data: CreatePromotionDto, userId: string) {
    const isOwner = await this.checkOfferOwnership(data.offreId, userId);
    if (!isOwner) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à créer une promotion pour cette offre.");
    }

    // Récupération du prix initial de l'offre pour le calcul de la promotion
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: data.offreId },
      select: {
        prix: true,
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
    const prixPromotionnel = offre.prix - (offre.prix * data.pourcentage) / 100;

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
      throw new Error(`Erreur lors de la création de la promotion: ${error.message}`);
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
 // Mettre à jour une promotion avec recalcul automatique du prix promotionnel
 async update(id: string, data: UpdatePromotionDto, userId: string) {
  const promotion = await this.prisma.promotion.findUnique({
    where: { id_Promotion: id },
    include: {
      offre: {
        select: {
          id_Offre: true,
          prix: true,
          produit: { select: { nom_Produit: true, photos: { select: { url: true } } } },
          utilisateur: { select: { nom_user: true } },
        },
      },
    },
  });

  if (!promotion) {
    throw new NotFoundException('Promotion non trouvée.');
  }

  const isOwner = await this.checkOfferOwnership(promotion.offre.id_Offre, userId);
  if (!isOwner) {
    throw new ForbiddenException("Vous n'êtes pas autorisé à mettre à jour cette promotion.");
  }

  const prixPromotionnel = promotion.offre.prix - (promotion.offre.prix * data.pourcentage) / 100;

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