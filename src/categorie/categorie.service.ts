// src/categorie/categorie.service.ts

import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Categorie, Prisma } from '@prisma/client';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import merge from 'lodash.merge';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  // Création d'une nouvelle catégorie
  async createCategorie(createCategorieDto: CreateCategorieDto): Promise<{ message: string }> {
    try {
      const { nomCategorie, isActive, attributs, typeCategory } = createCategorieDto;
  
      // Étape 1 : Création de la catégorie
      const categorie = await this.prisma.categorie.create({
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
          estObligatoire: attr.estObligatoire, // Assurez-vous que ce champ est fourni
          categorieId: categorie.id_Categorie,
        }));
  
        await this.prisma.attribut.createMany({ data: attributsToCreate });
      }
  
      return { message: 'Catégorie créée avec succès' };
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      throw new InternalServerErrorException('Échec de la création de la catégorie');
    }
  }
  

  // Mise à jour d'une catégorie
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
        for (const attr of attributs) {
          if (attr.id_Attribut) {
            // Mise à jour des attributs existants
            await this.prisma.attribut.update({
              where: { id_Attribut: attr.id_Attribut },
              data: {
                ...(attr.nomAttribut && { nomAttribut: attr.nomAttribut }),
                ...(attr.typeAttribut && { typeAttribut: attr.typeAttribut }),
                ...(attr.estObligatoire !== undefined && { estObligatoire: attr.estObligatoire }),
              },
            });
          } else {
            // Ajout de nouveaux attributs
            await this.prisma.attribut.create({
              data: {
                nomAttribut: attr.nomAttribut,
                typeAttribut: attr.typeAttribut,
                estObligatoire: attr.estObligatoire,
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
    page: number,
    limit: number,
    nomCategorie?: string,
    adminView: boolean = false,
  ): Promise<{ message: string; data?: any[]; total?: number }> {
    try {
      page = Number(page) > 0 ? Number(page) : 1;
      limit = Number(limit) > 0 ? Number(limit) : 10;
      const skip = (page - 1) * limit;
  
      const whereClause: any = adminView ? {} : { isActive: true };
      if (nomCategorie) {
        whereClause.nomCategorie = { contains: nomCategorie, mode: Prisma.QueryMode.insensitive };
      }
  
      const [categories, total] = await this.prisma.$transaction([
        this.prisma.categorie.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: { attributs: true }, // Inclure les attributs liés
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
      console.error('Error fetching categories:', error);
      throw new InternalServerErrorException('Échec de la récupération des catégories');
    }
  }

  // Suppression d'une catégorie
  async deleteCategorie(id: string): Promise<{ message: string }> {
    try {
      // Vérification si la catégorie existe
      const existingCategorie = await this.prisma.categorie.findUnique({
        where: { id_Categorie: id },
      });
  
      if (!existingCategorie) {
        throw new ForbiddenException("La catégorie spécifiée n'existe pas");
      }
  
      // Suppression des attributs associés à la catégorie
      await this.prisma.attribut.deleteMany({
        where: { categorieId: id },
      });
  
      // Suppression de la catégorie
      await this.prisma.categorie.delete({
        where: { id_Categorie: id },
      });
  
      return { message: 'Catégorie et attributs associés supprimés avec succès' };
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie :', error);
      throw new InternalServerErrorException('Échec de la suppression de la catégorie');
    }
  }  

  // Récupération des statistiques de catégorie
  async getCategorieStatistics(
    page: number = 1, // Page actuelle
    limit: number = 10, // Nombre de catégories par page
    adminView: boolean = false // Vue administrateur ou utilisateur
  ): Promise<{ message: string; data?: any; total?: number }> {
    try {
      const skip = (page - 1) * limit;
  
      // Condition de filtrage (toutes les catégories pour les admins, seulement actives pour les utilisateurs)
      const whereClause = adminView ? {} : { isActive: true };
  
      // Exécuter les requêtes avec Prisma en transaction
      const [statistics, total] = await this.prisma.$transaction([
        this.prisma.categorie.findMany({
          where: whereClause,
          skip,
          take: limit,
          select: {
            nomCategorie: true,
            createdAt: true,
            _count: {
              select: {
                produits: true, // Nombre de produits associés
                attributs: true, // Nombre d'attributs associés
              },
            },
          },
        }),
        this.prisma.categorie.count({
          where: whereClause, // Total des catégories en fonction du filtre
        }),
      ]);
  
      // Transformation des données pour enrichir la réponse
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
  
      return {
        message: 'Statistiques des catégories',
        data: statsWithMessages,
        total, // Total des catégories (utile pour la pagination côté client)
      };
    } catch (error) {
      // Gestion des erreurs
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Erreur Prisma :', error.message);
        throw new InternalServerErrorException('Erreur au niveau de la base de données');
      }
      console.error('Erreur inconnue :', error.message);
      throw new InternalServerErrorException('Échec de la récupération des statistiques des catégories');
    }
  }  
}