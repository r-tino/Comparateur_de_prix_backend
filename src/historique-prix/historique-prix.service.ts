// src/historique-prix/historique-prix.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypePrixEnum } from '@prisma/client';

@Injectable()
export class HistoriquePrixService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre un historique de changement de prix.
   * @param sourceId ID de la source (produit, offre ou promotion).
   * @param ancienPrix Ancien prix.
   * @param nouveauPrix Nouveau prix.
   * @param typePrix Type de prix (produit, offre ou promotion).
   * @param utilisateurId ID de l'utilisateur ayant modifié le prix.
   */
  async enregistrerHistoriquePrix(
    sourceId: string,
    ancienPrix: number,
    nouveauPrix: number,
    typePrix: TypePrixEnum,
    utilisateurId: string // Ajout du champ utilisateurId
  ): Promise<void> {
    // Validation des données
    if (!sourceId || ancienPrix < 0 || nouveauPrix < 0) {
      throw new BadRequestException('Données invalides pour l’historique de prix.');
    }

    // Vérification : le prix a-t-il changé ?
    if (ancienPrix === nouveauPrix) {
      console.warn('Aucun changement enregistré : ancienPrix et nouveauPrix sont identiques.');
      return; // Pas de changement
    }


    try {
      await this.prisma.historiquePrix.create({
        data: {
          sourceId,
          ancienPrix, // Correction : stockage explicite de l'ancien prix
          prixModif: nouveauPrix,
          typePrix,
          dateChangement: new Date(),
          utilisateurId, // Enregistrer l'utilisateur ayant modifié le prix
        },
      });
    } catch (error) {
      console.error('Erreur lors de l’enregistrement de l’historique des prix:', error.message);
      throw new InternalServerErrorException('Erreur lors de l’enregistrement de l’historique des prix.');
    }
  }

  /**
   * Récupère l'historique des prix avec pagination.
   * @param sourceId ID de la source.
   * @param typePrix Type de prix.
   * @param page Numéro de la page.
   * @param limit Nombre d'éléments par page.
   */
  async lireHistoriquePrix(
    sourceId: string,
    typePrix: TypePrixEnum,
    page: number = 1,
    limit: number = 10
  ) {
    console.log(`Début de lireHistoriquePrix: sourceId=${sourceId}, typePrix=${typePrix}, page=${page}, limit=${limit}`);
  
    if (!sourceId) {
      console.error('Erreur: L’ID de la source est manquant.');
      throw new BadRequestException('L’ID de la source est requis.');
    }
  
    const skip = (page - 1) * limit;
  
    try {
      // Étape 1 : Récupération des données avec Prisma
      console.log('Récupération des données depuis Prisma...');
      const [historique, total] = await Promise.all([
        this.prisma.historiquePrix.findMany({
          where: { sourceId, typePrix },
          skip,
          take: limit,
          orderBy: { dateChangement: 'desc' },
          include: {
            produit: true, // Inclure la relation produit
            offre: { include: { produit: true } }, // Inclure produit via offre
            promotion: { include: { offre: { include: { produit: true } } } }, // Inclure produit via promotion
            utilisateur: true, // Inclure la relation utilisateur
          },
        }),
        this.prisma.historiquePrix.count({ where: { sourceId, typePrix } }),
      ]);
  
      console.log(`Données récupérées: historique=${historique.length}, total=${total}`);

      // Étape 2 : Transformation des données d'historique
      const data = historique.map((item, index) => ({
        id: item.id_HistoriquePrix,
        sourceId: item.sourceId,
        ancienPrix: item.ancienPrix, // Utilisation directe de l'ancien prix stocké
        nouveauPrix: item.prixModif,
        typePrix: item.typePrix,
        dateChangement: item.dateChangement,
        nom_produit:
          typePrix === TypePrixEnum.PRODUIT
            ? item.produit?.nom_Produit || null
            : typePrix === TypePrixEnum.OFFRE
            ? item.offre?.produit?.nom_Produit || null
            : item.promotion?.offre?.produit?.nom_Produit || null,
        modifiePar: item.utilisateur?.nom_user || 'Inconnu',
      }));

      console.log('Transformation des données terminée.');
  
        // Étape 3 : Retour avec pagination
      return {
        total,
        page,
        pageCount: Math.ceil(total / limit),
        data,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error.message);
      throw new InternalServerErrorException('Erreur lors de la récupération de l’historique des prix.');
    }
  }  
}
