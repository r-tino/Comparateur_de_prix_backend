// src/categorie/categorie.service.ts

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Categorie, Prisma } from '@prisma/client';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  // Création d'une nouvelle catégorie
  async createCategorie(createCategorieDto: CreateCategorieDto): Promise<{ message: string }> {
    try {
      const { nomCategorie, isActive, attributs, typeCategory } = createCategorieDto;

      const validAttributs = attributs && typeof attributs === 'object' ? attributs : {};

      await this.prisma.categorie.create({
        data: {
          nomCategorie,
          isActive: isActive ?? true,
          attributs: validAttributs,
          typeCategory, // Use the correct field name
        },
      });
      return { message: 'Catégorie créée avec succès' };
    } catch (error) {
      console.error(error);
      throw new Error('Échec de la création de la catégorie');
    }
  }

  // Mise à jour d'une catégorie
  async updateCategorie(id: string, updateCategorieDto: UpdateCategorieDto) {
    try {
      const { nomCategorie, isActive, attributs, typeCategory } = updateCategorieDto;

      const existingCategorie = await this.prisma.categorie.findUnique({
        where: { id_Categorie: id },
      });

      if (!existingCategorie) {
        throw new Error("La catégorie spécifiée n'existe pas");
      }

      const existingAttributs = 
        existingCategorie.attributs && typeof existingCategorie.attributs === 'object'
          ? existingCategorie.attributs
          : {};

      const validAttributs = 
        attributs && typeof attributs === 'object'
          ? attributs
          : {};

      const updatedAttributs = { ...existingAttributs, ...validAttributs };

      await this.prisma.categorie.update({
        where: { id_Categorie: id },
        data: {
          ...(nomCategorie && { nomCategorie }),
          ...(isActive !== undefined && { isActive }),
          attributs: updatedAttributs,
          ...(typeCategory && { typeCategory }), // Use the correct field name
        },
      });

      return { message: 'Catégorie mise à jour avec succès' };
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Échec de la mise à jour de la catégorie');
    }
  }

  // Récupération des catégories
  async getCategories(
    page: number,
    limit: number,
    nomCategorie?: string,
    adminView: boolean = false,
  ): Promise<{ message: string; data?: Categorie[]; total?: number }> {
    try {
      page = Number(page) > 0 ? Number(page) : 1;
      limit = Number(limit) > 0 ? Number(limit) : 10;
      const skip = (page - 1) * limit;

      const whereClause: any = adminView ? {} : { isActive: true };
      if (nomCategorie) {
        whereClause.nomCategorie = { contains: nomCategorie, mode: Prisma.QueryMode.insensitive };
      }

      const [data, total] = await this.prisma.$transaction([
        this.prisma.categorie.findMany({
          where: whereClause,
          skip,
          take: limit,
        }),
        this.prisma.categorie.count({ where: whereClause }),
      ]);

      return { message: 'Liste des Catégories', data, total };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Échec de la récupération des catégories');
    }
  }

  // Suppression d'une catégorie
  async deleteCategorie(id: string): Promise<{ message: string }> {
    try {
      await this.prisma.categorie.delete({
        where: { id_Categorie: id },
      });
      return { message: 'Catégorie supprimée avec succès' };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Échec de la suppression de la catégorie');
    }
  }

  // Récupération des statistiques de catégorie
  async getCategorieStatistics(): Promise<{ message: string; data?: any }> {
    try {
      const statistics = await this.prisma.categorie.findMany({
        select: {
          nomCategorie: true,
          _count: {
            select: { produits: true },
          },
        },
      });

      const statsWithMessages = statistics.map((stat) => ({
        nomCategorie: stat.nomCategorie,
        nombreProduits: stat._count.produits,
        message:
          stat._count.produits > 0
            ? 'Produits associés à cette catégorie'
            : "Il n'y a pas encore de produit associé à cette catégorie",
      }));

      return { message: 'Statistiques des catégories', data: statsWithMessages };
    } catch (error) {
      console.error('Error fetching category statistics:', error);
      throw new Error('Échec de la récupération des statistiques des catégories');
    }
  }
}