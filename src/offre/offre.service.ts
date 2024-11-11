// src/offre/offre.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOffreDto } from './dto/create-offre.dto';
import { UpdateOffreDto } from './dto/update-offre.dto';

@Injectable()
export class OffreService {
  constructor(private readonly prisma: PrismaService) {}

  async createOffre(createOffreDto: CreateOffreDto, utilisateurId: string) {
    try {
      console.log('Données reçues pour la création de l\'offre:', {
        prix: createOffreDto.prix,
        stock: createOffreDto.stock,
        dateExpiration: createOffreDto.dateExpiration,
        produitId: createOffreDto.produitId,
        utilisateurId: utilisateurId,
      });
  
      // Créer l'offre dans la base de données
      const offre = await this.prisma.offre.create({
        data: {
          prix: createOffreDto.prix,
          stock: createOffreDto.stock,
          dateExpiration: createOffreDto.dateExpiration,
          produitId: createOffreDto.produitId,
          utilisateurId: utilisateurId,
        },
        include: {
          produit: {
            select: {
              nom_Produit: true, // Retourner uniquement le nom du produit
            },
          },
          utilisateur: {
            select: {
              nom_user: true, // Retourner uniquement le nom de l'utilisateur
            },
          },
        },
      });
  
      return {
        message: 'Offre créée avec succès',
        offre: {
          id_Offre: offre.id_Offre,
          prix: offre.prix,
          stock: offre.stock,
          dateExpiration: offre.dateExpiration,
          nom_Produit: offre.produit.nom_Produit, // Afficher nom_Produit à la place de produitId
          nom_user: offre.utilisateur.nom_user,   // Afficher nom_user à la place de utilisateurId
          promotionId: offre.promotionId,
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
      prix: {
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
        produit: { select: { nom_Produit: true } },
        utilisateur: { select: { nom_user: true } },
      },
    });

    const totalCount = await this.prisma.offre.count({ where: whereConditions });

    return {
      total: totalCount,
      page,
      pageCount: Math.ceil(totalCount / limit),
      data: offres.map((offre) => ({
        id_Offre: offre.id_Offre,
        prix: offre.prix,
        stock: offre.stock,
        dateExpiration: offre.dateExpiration,
        nom_Produit: offre.produit.nom_Produit,
        nom_user: offre.utilisateur.nom_user,
        promotionId: offre.promotionId,
      })),
    };
  }

  async findOneOffre(id: string) {
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: id },
      include: {
        produit: { select: { nom_Produit: true } },
        utilisateur: { select: { nom_user: true } },
      },
    });

    if (!offre) {
      throw new NotFoundException('Offre non trouvée');
    }

    return {
      id_Offre: offre.id_Offre,
      prix: offre.prix,
      stock: offre.stock,
      dateExpiration: offre.dateExpiration,
      nom_Produit: offre.produit.nom_Produit,
      nom_user: offre.utilisateur.nom_user,
      promotionId: offre.promotionId,
    };
  }

  async updateOffre(id: string, updateOffreDto: UpdateOffreDto, utilisateurId: string) {
    // Récupère l'offre et vérifie le propriétaire
    const offre = await this.prisma.offre.findUnique({
      where: { id_Offre: id },
      select: { utilisateurId: true },
    });

    if (!offre) throw new NotFoundException("Offre non trouvée");
    if (offre.utilisateurId !== utilisateurId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette offre");
    }

    // Met à jour l'offre si l'utilisateur est le propriétaire
    const updatedOffre = await this.prisma.offre.update({
      where: { id_Offre: id },
      data: updateOffreDto,
      include: {
        produit: { select: { nom_Produit: true } },
        utilisateur: { select: { nom_user: true } },
      },
    });

    return {
      message: 'Offre mise à jour avec succès',
      offre: {
        id_Offre: updatedOffre.id_Offre,
        prix: updatedOffre.prix,
        stock: updatedOffre.stock,
        dateExpiration: updatedOffre.dateExpiration,
        nom_Produit: updatedOffre.produit.nom_Produit,
        nom_user: updatedOffre.utilisateur.nom_user,
        promotionId: updatedOffre.promotionId,
      },
    };
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

    // Supprime l'offre si l'utilisateur est le propriétaire
    await this.prisma.offre.delete({ where: { id_Offre: id } });
    return { message: 'Offre supprimée avec succès', offreId: id };
  }
}