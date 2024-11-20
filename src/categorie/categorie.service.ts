// src/categorie/categorie.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Assurez-vous que PrismaService est configuré
import { Categorie, Prisma } from '@prisma/client';
import { CreateCategorieDto } from './dto/create-categorie.dto';

@Injectable()
export class CategorieService {
  constructor(private prisma: PrismaService) {}

  // Création d'une nouvelle catégorie (Administrateur uniquement)
  async createCategorie(nomCategorie: string): Promise<{ message: string }> {
    try {
      await this.prisma.categorie.create({
        data: { nomCategorie },
      });
      return { message: 'Catégorie créée avec succès' };
    } catch (error) {
      return { message: 'Échec de la création de la catégorie' };
    }
  }

  async getCategories( page: number, limit: number, nomCategorie?: string, adminView: boolean = false): Promise<{ message: string; data?: Categorie[]; total?: number }> {
    try {
      page = Number(page) > 0 ? Number(page) : 1;
      limit = Number(limit) > 0 ? Number(limit) : 10;
      const skip = (page - 1) * limit;
  
      // Utilisation de la clause where avec filtre pour les catégories actives, sauf si adminView est true
      const whereClause: any = adminView ? {} : { isActive: true };
      if (nomCategorie) {
        whereClause.nomCategorie = { contains: nomCategorie, mode: Prisma.QueryMode.insensitive };
      }
  
      // Transaction pour récupérer les catégories filtrées et le total
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
      console.error(error);
      return { message: 'Échec de la récupération des catégories' };
    }
  }
  


  // Mise à jour d'une catégorie (Administrateur uniquement)
  async updateCategorie(id: string, createCategorieDto: CreateCategorieDto) {
    try {
      await this.prisma.categorie.update({
        where: { id_Categorie: id },
        data: {
          nomCategorie: createCategorieDto.nomCategorie,
          isActive: createCategorieDto.isActive ?? true, // Utilisation de isActive si fourni
        },
      });
      return { message: 'Catégorie mise à jour avec succès' };
    } catch (error) {
      console.error(error);
      return { message: 'Échec de la mise à jour de la catégorie' };
    }
  }
  

  // Suppression d'une catégorie (Administrateur uniquement)
  async deleteCategorie(id: string): Promise<{ message: string }> {
    try {
      await this.prisma.categorie.delete({
        where: { id_Categorie: id },
      });
      return { message: 'Catégorie supprimée avec succès' };
    } catch (error) {
      return { message: 'Échec de la suppression de la catégorie' };
    }
  }

    // Nouvelle méthode: Récupération des statistiques de catégorie
    async getCategorieStatistics(): Promise<{ message: string; data?: any }> {
      try {
        const statistics = await this.prisma.categorie.findMany({
          select: {
            nomCategorie: true,
            _count: {
              select: { produits: true }, // assuming `produits` is the relation field
            },
          },
        });


      // Ajout d'un message pour les catégories sans produits
      const statsWithMessages = statistics.map((stat) => ({
        nomCategorie: stat.nomCategorie,
        nombreProduits: stat._count.produits,
        message: stat._count.produits > 0 ? 'Produits associés à cette catégorie' : 'Il n\'y a pas encore de produit associé à cette catégorie',
      }));


        return { message: 'Statistiques des catégories', data: statsWithMessages };
      } catch (error) {
        console.error(error);
        return { message: 'Échec de la récupération des statistiques des catégories' };
      }
    }
}
