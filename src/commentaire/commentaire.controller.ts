// src/commentaire/commentaire.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CommentaireService } from './commentaire.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { UpdateCommentaireDto } from './dto/update-commentaire.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/commentaires') // Préfixe pour les routes des commentaires
export class CommentaireController {
  constructor(private readonly commentaireService: CommentaireService) {}

  /**
   * Création d'un commentaire (accessible uniquement aux utilisateurs connectés)
   */
  @Post()
  @Roles('Visiteur', 'Vendeur', 'Admin') // Autorisé pour les clients et administrateurs
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() createCommentaireDto: CreateCommentaireDto, @Request() req) {
    try {
      const utilisateurId = req.user.userId; // Récupération de l'utilisateur connecté
      createCommentaireDto.utilisateurId = utilisateurId; // Assignation de l'utilisateur au commentaire

      const commentaire = await this.commentaireService.create(createCommentaireDto, utilisateurId);
      return commentaire;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la création du commentaire.',
      );
    }
  }

  /**
   * Récupération de tous les commentaires
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll() {
    try {
      return await this.commentaireService.findAll();
    } catch (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la récupération des commentaires.');
    }
  }

  /**
   * Récupération d'un commentaire spécifique par ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard) // Protégé, mais accessible à tous les utilisateurs connectés
  async findOne(@Param('id') id: string) {
    try {
      return await this.commentaireService.findOne(id);
    } catch (error) {
      throw new BadRequestException(
        error.message || `Erreur lors de la récupération du commentaire avec l'ID "${id}".`,
      );
    }
  }

  /**
   * Mise à jour d'un commentaire (par son créateur ou un admin)
   */
  @Patch(':id')
  @Roles('Visiteur', 'Vendeur', 'Admin') // Accessible par le créateur du commentaire ou un admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() updateCommentaireDto: UpdateCommentaireDto,
    @Request() req,
  ) {
    try {
      const utilisateurId = req.user.userId;
      const commentaire = await this.commentaireService.findOne(id);

      // Vérification si l'utilisateur connecté est soit le créateur, soit un admin
      if (commentaire.utilisateurId !== utilisateurId && req.user.role !== 'Admin') {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à modifier ce commentaire.",
        );
      }

      const updatedCommentaire = await this.commentaireService.update(id, updateCommentaireDto);
      return updatedCommentaire;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la mise à jour du commentaire.',
      );
    }
  }

  /**
   * Suppression d'un commentaire (par son créateur ou un admin)
   */
  @Delete(':id')
  @Roles('Visiteur', 'Vendeur', 'Admin') // Accessible par le créateur ou un admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const utilisateurId = req.user.userId;
      const commentaire = await this.commentaireService.findOne(id);

      // Vérification des droits
      if (commentaire.utilisateurId !== utilisateurId && req.user.role !== 'Admin') {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à supprimer ce commentaire.",
        );
      }

      const deletedCommentaire = await this.commentaireService.remove(id);
      return deletedCommentaire;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la suppression du commentaire.',
      );
    }
  }
}