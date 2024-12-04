// src/note/note.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  public async updateProductAverage(productId: string): Promise<void> {
    const notes = await this.prisma.note.findMany({
      where: { produitId: productId },
      select: { valeur: true },
    });

    const moyenne =
      notes.reduce((total, note) => total + note.valeur, 0) / notes.length || 0;

    await this.prisma.produit.update({
      where: { id_Produit: productId },
      data: { qualiteMoyenne: moyenne },
    });
  }

  async create(createNoteDto: CreateNoteDto) {
    try {
      const { utilisateurId, produitId, dateNote, valeur } = createNoteDto;

      // Vérification de l'existence de l'utilisateur
      const utilisateur = await this.prisma.utilisateur.findUnique({
        where: { id_User: utilisateurId },
      });
      if (!utilisateur) {
        throw new NotFoundException(`Utilisateur avec l'ID "${utilisateurId}" non trouvé.`);
      }

      // Vérification de l'existence du produit
      const produit = await this.prisma.produit.findUnique({
        where: { id_Produit: produitId },
      });
      if (!produit) {
        throw new NotFoundException(`Produit avec l'ID "${produitId}" non trouvé.`);
      }

      // Création de la note
      const note = await this.prisma.note.create({
        data: {
          valeur,
          utilisateurId,
          produitId,
          dateNote: dateNote || new Date(),
        },
        include: {
          utilisateur: true,
          produit: true,
        },
      });

      // Mise à jour de la qualité moyenne
      await this.updateProductAverage(produitId);

      // Retourner uniquement les noms et les informations nécessaires
      return {
        message: 'Note créée avec succès.',
        data: {
          valeur: note.valeur,
          dateNote: note.dateNote,
          utilisateurId: note.utilisateurId, // Ajout de l'ID de l'utilisateur
          produitId: note.produitId,         // Ajout de l'ID du produit
          nom_User: note.utilisateur.nom_user,
          nom_Produit: note.produit.nom_Produit,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll() {
    try {
      const notes = await this.prisma.note.findMany({
        include: {
          utilisateur: true,
          produit: true,
        },
      });

      return {
        message: 'Liste des notes récupérée avec succès.',
        data: notes.map(note => ({
          valeur: note.valeur,
          dateNote: note.dateNote,
          nom_User: note.utilisateur.nom_user,
          nom_Produit: note.produit.nom_Produit,
        })),
      };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la récupération des notes.');
    }
  }

  async findOne(id: string) {
    try {
      const note = await this.prisma.note.findUnique({
        where: { id_Note: id },
        include: {
          utilisateur: true,
          produit: true,
        },
      });

      if (!note) {
        throw new NotFoundException(`Note avec l'ID "${id}" non trouvée.`);
      }
      
      return {
        message: 'Note récupérée avec succès.',
        data: {
          valeur: note.valeur,
          dateNote: note.dateNote,
          nom_User: note.utilisateur.nom_user,
          nom_Produit: note.produit.nom_Produit,
          utilisateurId: note.utilisateurId,  // Assurez-vous que ce champ existe
          produitId: note.produitId,  // Assurez-vous que ce champ existe
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    try {
      const existingNote = await this.prisma.note.findUnique({
        where: { id_Note: id },
      });
      if (!existingNote) throw new NotFoundException('Note non trouvée.');

      const updatedNote = await this.prisma.note.update({
        where: { id_Note: id },
        data: updateNoteDto,
        include: {
          utilisateur: true,
          produit: true,
        },
      });

      await this.updateProductAverage(existingNote.produitId);

      return {
        message: 'Note mise à jour avec succès.',
        data: {
          valeur: updatedNote.valeur,
          dateNote: updatedNote.dateNote,
          nom_User: updatedNote.utilisateur.nom_user,
          nom_Produit: updatedNote.produit.nom_Produit,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      const existingNote = await this.prisma.note.findUnique({
        where: { id_Note: id },
      });
      if (!existingNote) throw new NotFoundException('Note non trouvée.');

      const deletedNote = await this.prisma.note.delete({
        where: { id_Note: id },
        include: {
          utilisateur: true,
          produit: true,
        },
      });

      await this.updateProductAverage(existingNote.produitId);

      return {
        message: 'Note supprimée avec succès.',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
