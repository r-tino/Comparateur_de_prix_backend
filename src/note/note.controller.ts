// src/note/note.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/notes') // Préfixe pour les routes des notes
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  /**
   * Création d'une note (accessible uniquement aux utilisateurs connectés)
   */
  @Post()
  @Roles('Visiteur', 'Vendeur', 'Admin') // Autorisé pour les clients et administrateurs
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() createNoteDto: CreateNoteDto, @Request() req) {
    try {
      const utilisateurId = req.user.userId; // Récupération de l'utilisateur connecté
      createNoteDto.utilisateurId = utilisateurId; // Assignation de l'utilisateur à la note

      // Création de la note et mise à jour de la qualité moyenne du produit
      const note = await this.noteService.create(createNoteDto);
      await this.noteService.updateProductAverage(createNoteDto.produitId);

      return note;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la création de la note.',
      );
    }
  }

  /**
   * Récupération de toutes les notes
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll() {
    return await this.noteService.findAll();
  }

  /**
   * Récupération d'une note spécifique par ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard) // Protégé, mais accessible à tous les utilisateurs connectés
  async findOne(@Param('id') id: string) {
    const note = await this.noteService.findOne(id);
    if (!note) {
      throw new NotFoundException(`Note avec l'ID "${id}" non trouvée.`);
    }
    return note;
  }

  /**
   * Mise à jour d'une note (par son créateur ou un admin)
   */
  @Patch(':id')
  @Roles('Visiteur', 'Vendeur', 'Admin') // Accessible par le créateur de la note ou un admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req,
  ) {
    const utilisateurId = req.user.userId;
    const role = req.user.role;

    const note = await this.noteService.findOne(id);

    // Vérification des droits
    if (!note) {
      throw new NotFoundException(`Note avec l'ID "${id}" non trouvée.`);
    }

    // Vérification si l'utilisateur connecté est soit le créateur, soit un admin
    if (note.data.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à modifier cette note.",
      );
    }

    const updatedNote = await this.noteService.update(id, updateNoteDto);

    // Mise à jour de la qualité moyenne du produit
    await this.noteService.updateProductAverage(note.data.produitId);

    return updatedNote;
  }

  /**
   * Suppression d'une note (par son créateur ou un admin)
   */
  @Delete(':id')
  @Roles('Visiteur', 'Vendeur', 'Admin') // Accessible par le créateur ou un admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: string, @Request() req) {
    const utilisateurId = req.user.userId;
    const role = req.user.role;

    const note = await this.noteService.findOne(id);

    // Vérification des droits
    if (!note) {
      throw new NotFoundException(`Note avec l'ID "${id}" non trouvée.`);
    }

    if (note.data.utilisateurId !== utilisateurId && role !== 'Admin') {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à supprimer cette note.",
      );
    }

    const deletedNote = await this.noteService.remove(id);


  // Mise à jour de la qualité moyenne du produit
  await this.noteService.updateProductAverage(note.data.produitId);

    return deletedNote;
  }
}
