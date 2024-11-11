import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Utilisateur, RoleEnum } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';

@Injectable() 
export class UtilisateurService {
  constructor(private readonly prisma: PrismaService) {
    this.ensureUploadsDirectoryExists();
  }

  private async ensureUploadsDirectoryExists() {
    const directoryPath = path.join('uploads', 'profiles');
    try {
      await fs.mkdir(directoryPath, { recursive: true });
      console.log('Le dossier uploads/profiles a été créé avec succès.');
    } catch (error) {
      console.error('Erreur lors de la création du dossier uploads/profiles:', error);
    }
  }

  // Méthode de validation de mot de passe et évaluation de sa force
  private validatePassword(password: string): string {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins six caractères, incluant une lettre majuscule, une lettre minuscule, un chiffre, et un caractère spécial.'
      );
    }

    let strength = 0;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumber) strength++;
    if (hasSpecialChar) strength++;

    return strength >= 3 ? 'fort' : 'faible';
  }

  // Méthode de création d'un utilisateur avec chiffrement du mot de passe et rôle par défaut
  async createUser(data: CreateUtilisateurDto, photoFile?: Express.Multer.File): Promise<{ message: string }> {
    try {
      const role = data.role || RoleEnum.Visiteur;
      if (data.motDePasse !== data.confirmPassword) {
        throw new BadRequestException("Le mot de passe et sa confirmation ne correspondent pas.");
      }

      const passwordStrength = this.validatePassword(data.motDePasse);
      if (passwordStrength === 'faible') {
        throw new BadRequestException("Le mot de passe est trop faible.");
      }

      const hashedPassword = await bcrypt.hash(data.motDePasse, 10);
      
     // Gestion du fichier de photo
     let photoProfil = 'uploads/profiles/default.jpg';
     if (photoFile) {
       const fileName = `${Date.now()}-${photoFile.originalname}`;
       const filePath = path.join('uploads', 'profiles', fileName);
       await fs.writeFile(filePath, photoFile.buffer);
       photoProfil = filePath;
     }

      const utilisateur = await this.prisma.utilisateur.create({
        data: {
          nom_user: data.nom_user,
          email: data.email,
          motDePasse: hashedPassword,
          role,
          photoProfil
        },
      });
      return { message: 'Utilisateur créé avec succès' };
    } catch (error) {
      console.error(error);
      return { message: 'Échec de la création de l’utilisateur' };
    }
  }

  // Méthode pour récupérer tous les utilisateurs
  async getAllUsers(): Promise<{ users: Utilisateur[], message: string }> {
    try {
      const users = await this.prisma.utilisateur.findMany({
        include: { commentaire: true, notification: true, note: true },
      });
      return { users, message: 'Utilisateurs récupérés avec succès' };
    } catch (error) {
      return { users: [], message: 'Échec de la récupération des utilisateurs' };
    }
  }

  // Méthode pour récupérer un utilisateur par son ID
  async getUserById(id: string): Promise<{ user: Utilisateur | null, message: string }> {
    try {
      const user = await this.prisma.utilisateur.findUnique({
        where: { id_User: id },
        include: { commentaire: true, notification: true, note: true },
      });
      if (!user) throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé.`);
      return { user, message: 'Utilisateur récupéré avec succès' };
    } catch (error) {
      return { user: null, message: `Échec de la récupération de l'utilisateur avec ID ${id}` };
    }
  }

  // Méthode pour récupérer un utilisateur par email
  async getUserByEmail(email: string): Promise<Utilisateur | null> {
    console.log('Recherche de l\'utilisateur par email:', email); // Ajout du log
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: email },
    });

    if (!user) {
       console.log(`Utilisateur avec l'email ${email} non trouvé.`);
      throw new NotFoundException(`Utilisateur avec l'email ${email} non trouvé.`);
    }

    return user;
  }

  // Méthode de mise à jour d'un utilisateur avec gestion du hachage de mot de passe si modifié
  async updateUser(id: string, data: UpdateUtilisateurDto, photoFile?: Express.Multer.File): Promise<{ message: string }> {
    try {
      const existingUser = await this.prisma.utilisateur.findUnique({
        where: { id_User: id },
      });
      if (!existingUser) throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé.`);

        // Si le mot de passe est fourni, appliquez le hachage
      let updatedPassword = existingUser.motDePasse;
      if (data.motDePasse) {
        this.validatePassword(data.motDePasse);
        updatedPassword = await bcrypt.hash(data.motDePasse, 10);
      } else {
        updatedPassword = existingUser.motDePasse;
      }

      let photoProfil = existingUser.photoProfil || 'uploads/profiles/default.jpg';
      if (photoFile) {
        const fileName = `${Date.now()}-${photoFile.originalname}`;
        const filePath = path.join('uploads', 'profiles', fileName);

        if (existingUser.photoProfil && existingUser.photoProfil !== 'uploads/profiles/default.jpg') {
          await fs.unlink(existingUser.photoProfil).catch(() => null);
        }

        await fs.writeFile(filePath, photoFile.buffer);
        photoProfil = filePath;
      }

      await this.prisma.utilisateur.update({
        where: { id_User: id },
        data: {
          nom_user: data.nom_user || existingUser.nom_user,
          email: data.email || existingUser.email,
          motDePasse: updatedPassword,
          role: data.role || existingUser.role,
          derniereConnexion: data.derniereConnexion || existingUser.derniereConnexion,
          photoProfil, // Mise à jour directe de la photo de profil
        },
      });
      return { message: 'Utilisateur mis à jour avec succès' };
    } catch (error) {
      return { message: `Échec de la mise à jour de l'utilisateur` };
    }
  }

  // Méthode de suppression d'un utilisateur avec nettoyage des relations
  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const result = await this.getUserById(id);
      const user = result.user; // Accéder à l'utilisateur depuis la réponse de getUserById
      if (!user) throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé.`);

      if (user.photoProfil && user.photoProfil !== 'uploads/profiles/default.jpg') {
        await fs.unlink(user.photoProfil).catch(() => null);
      }
    
      await this.prisma.commentaire.deleteMany({ where: { utilisateurId: id } });
      await this.prisma.notification.deleteMany({ where: { utilisateurId: id } });
      await this.prisma.note.deleteMany({ where: { utilisateurId: id } });
      await this.prisma.utilisateur.delete({ where: { id_User: id } });

      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      return { message: `Échec de la suppression de l'utilisateur avec ID ${id}` };
    }
  }
}
