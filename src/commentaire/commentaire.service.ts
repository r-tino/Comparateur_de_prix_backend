// src/commentaire/commentaire.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Si vous utilisez Prisma
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { UpdateCommentaireDto } from './dto/update-commentaire.dto';
import { NotificationService } from '../notification/notification.service'; 

@Injectable()
export class CommentaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService, 
  ) {}

  async create(createCommentaireDto: CreateCommentaireDto, utilisateurId: string) {
    try {
      // Créer le commentaire dans la base de données
      const commentaire = await this.prisma.commentaire.create({
      data: {
        contenu: createCommentaireDto.contenu,
        produitId: createCommentaireDto.produitId,
        utilisateurId,
        dateCommentaire: new Date(),
      },
    });

    // Récupérer le produit pour obtenir le propriétaire
    const produit = await this.prisma.produit.findUnique({
      where: { id_Produit: createCommentaireDto.produitId },
    });

    if (produit) {
      // Envoi de la notification au propriétaire du produit
      const message = `Votre produit "${produit.nom_Produit}" a reçu un nouveau commentaire.`;
      await this.notificationService.notify(produit.utilisateurId, 'Commentaire', message);
    }
    
      return { message: 'Commentaire créé avec succès', commentaire };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la création du commentaire.',
      );
    }
  }

  async findAll() {
    try {
      return await this.prisma.commentaire.findMany();
    } catch (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la récupération des commentaires.');
    }
  }

  async findOne(id: string) {
    try {
      const commentaire = await this.prisma.commentaire.findUnique({ 
        where: { id_Commentaire: id } 
      });
      if (!commentaire) {
        throw new BadRequestException(`Commentaire avec l'ID "${id}" non trouvé.`);
      }
      return commentaire;
    } catch (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la récupération du commentaire.');
    }
  }


  async update(id: string, updateCommentaireDto: UpdateCommentaireDto) {
    try {
      const commentaire = await this.prisma.commentaire.update({
        where: { id_Commentaire: id },
        data: updateCommentaireDto,
      });
      return { message: 'Commentaire mis à jour avec succès', commentaire };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la mise à jour du commentaire.',
      );
    }
  }

  async remove(id: string) {
    try {
      const commentaire = await this.prisma.commentaire.delete({
        where: { id_Commentaire: id },
      });
      return { message: 'Commentaire supprimé avec succès', commentaire };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la suppression du commentaire.',
      );
    }
  }
}
