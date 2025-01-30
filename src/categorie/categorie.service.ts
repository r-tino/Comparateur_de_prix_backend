// src/categorie/categorie.service.ts

import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  // Création d'une nouvelle catégorie
  async createCategorie(
    createCategorieDto: CreateCategorieDto,
  ): Promise<{ message: string }> {
    const { nomCategorie, isActive, attributs, typeCategory } =
      createCategorieDto;

    return this.prisma.$transaction(async (transaction) => {
      try {
        // Étape 1 : Création de la catégorie
        const categorie = await transaction.categorie.create({
          data: {
            nomCategorie,
            isActive: isActive ?? true,
            typeCategory,
            createdAt: new Date(),
          },
        });

        // Étape 2 : Ajout des attributs liés à la catégorie
        if (attributs && Array.isArray(attributs)) {
          const attributsToCreate = attributs.map((attr) => ({
            nomAttribut: attr.nomAttribut,
            typeAttribut: attr.typeAttribut,
            estObligatoire: attr.estObligatoire,
            categorieId: categorie.id_Categorie,
          }));

          await transaction.attribut.createMany({ data: attributsToCreate });
        }

        return { message: 'Catégorie créée avec succès' };
      } catch (error) {
        console.error('Erreur lors de la création de la catégorie :', error);
        throw new InternalServerErrorException(
          'Échec de la création de la catégorie',
        );
      }
    });
  }

  async updateCategorie(id: string, updateCategorieDto: UpdateCategorieDto) {
    try {
      const { nomCategorie, isActive, attributs, typeCategory } = updateCategorieDto;
  
      // Vérifiez si la catégorie existe
      const existingCategorie = await this.prisma.categorie.findUnique({
        where: { id_Categorie: id },
      });
  
      if (!existingCategorie) {
        throw new InternalServerErrorException("La catégorie spécifiée n'existe pas");
      }
  
      // Mise à jour de la catégorie
      const updatedCategorie = await this.prisma.categorie.update({
        where: { id_Categorie: id },
        data: {
          ...(nomCategorie && { nomCategorie }),
          ...(isActive !== undefined && { isActive }),
          ...(typeCategory && { typeCategory }),
          updatedAt: new Date(),
        },
      });
  
      // Gestion des attributs
      if (attributs && attributs.length > 0) {
        for (const { id_Attribut, nomAttribut, typeAttribut, estObligatoire } of attributs) {
          if (id_Attribut) {
            // Mise à jour des attributs existants
            await this.prisma.attribut.update({
              where: { id_Attribut },
              data: {
                ...(nomAttribut && { nomAttribut }),
                ...(typeAttribut && { typeAttribut }),
                ...(estObligatoire !== undefined && { estObligatoire }),
              },
            });
          } else {
            // Ajout de nouveaux attributs
            await this.prisma.attribut.create({
              data: {
                nomAttribut,
                typeAttribut,
                estObligatoire,
                categorieId: id,
              },
            });
          }
        }
      }
  
      return { message: 'Catégorie mise à jour avec succès', updatedCategorie };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie :', error);
      throw new InternalServerErrorException('Échec de la mise à jour de la catégorie');
    }
  }
  

  // Récupération des catégories
  async getCategories(
    page = 1,
    limit = 10,
    nomCategorie?: string,
    adminView = false,
  ): Promise<{ message: string; data?: any[]; total?: number }> {
    try {
      page = Math.max(page, 1);
      limit = Math.max(limit, 1);
      const skip = (page - 1) * limit;

      const whereClause: Prisma.CategorieWhereInput = adminView
        ? {}
        : { isActive: true };

      if (nomCategorie) {
        whereClause.nomCategorie = {
          contains: nomCategorie,
          mode: Prisma.QueryMode.insensitive,
        };
      }

      const [categories, total] = await this.prisma.$transaction([
        this.prisma.categorie.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: { attributs: true },
        }),
        this.prisma.categorie.count({ where: whereClause }),
      ]);

      const formattedCategories = categories.map((cat) => ({
        ...cat,
        attributs: cat.attributs.map((attr) => ({
          id: attr.id_Attribut,
          nomAttribut: attr.nomAttribut,
          typeAttribut: attr.typeAttribut,
          estObligatoire: attr.estObligatoire,
        })),
      }));

      return { message: 'Liste des Catégories', data: formattedCategories, total };
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories :', error);
      throw new InternalServerErrorException(
        'Échec de la récupération des catégories',
      );
    }
  }

  // Suppression d'une catégorie
  async deleteCategorie(id: string): Promise<{ message: string }> {
    return this.prisma.$transaction(async (transaction) => {
      try {
        // Vérification si la catégorie existe
        const existingCategorie = await transaction.categorie.findUnique({
          where: { id_Categorie: id },
        });

        if (!existingCategorie) {
          throw new ForbiddenException("La catégorie spécifiée n'existe pas");
        }

        // Suppression des attributs associés à la catégorie
        await transaction.attribut.deleteMany({
          where: { categorieId: id },
        });

        // Suppression de la catégorie
        await transaction.categorie.delete({
          where: { id_Categorie: id },
        });

        return { message: 'Catégorie et attributs associés supprimés avec succès' };
      } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie :', error);
        throw new InternalServerErrorException(
          'Échec de la suppression de la catégorie',
        );
      }
    });
  }

  // Récupération des statistiques de catégorie
  async getCategorieStatistics(
    page = 1,
    limit = 10,
    adminView = false,
  ): Promise<{ message: string; data?: any; total?: number }> {
    try {
      page = Math.max(page, 1);
      limit = Math.max(limit, 1);
      const skip = (page - 1) * limit;

      const whereClause = adminView ? {} : { isActive: true };

      const [statistics, total] = await this.prisma.$transaction([
        this.prisma.categorie.findMany({
          where: whereClause,
          skip,
          take: limit,
          select: {
            nomCategorie: true,
            createdAt: true,
            _count: {
              select: { produits: true, attributs: true },
            },
          },
        }),
        this.prisma.categorie.count({ where: whereClause }),
      ]);

      const statsWithMessages = statistics.map((stat) => ({
        nomCategorie: stat.nomCategorie,
        dateCreation: stat.createdAt,
        nombreProduits: stat._count.produits,
        nombreAttributs: stat._count.attributs,
        message:
          stat._count.produits > 0
            ? 'Produits associés à cette catégorie'
            : "Il n'y a pas encore de produit associé à cette catégorie",
      }));

      return { message: 'Statistiques des catégories', data: statsWithMessages, total };
    } catch (error) {
      console.error(
        'Erreur lors de la récupération des statistiques des catégories :',
        error,
      );
      throw new InternalServerErrorException(
        'Échec de la récupération des statistiques des catégories',
      );
    }
  }
}
