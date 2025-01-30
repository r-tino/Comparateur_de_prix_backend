// src/utilisateur/utilisateur.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Utilisateur, RoleEnum } from '@prisma/client';
import * as fs from 'fs'; // Import de fs pour utiliser existsSync
import { promises as fsPromises } from 'fs'; // Import pour les méthodes asynchrones
import * as path from 'path';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';

@Injectable() 
export class UtilisateurService {
  constructor(private readonly prisma: PrismaService, private readonly cloudinaryService: CloudinaryService) {
    this.ensureUploadsDirectoryExists();
  }

  // Vérifier et créer le répertoire 'uploads/profiles' si nécessaire
  private async ensureUploadsDirectoryExists() {
    const directoryPath = path.join('uploads', 'profiles');
    try {
      await fsPromises.mkdir(directoryPath, { recursive: true });
      console.log('Le dossier uploads/profiles a été créé avec succès.');
    } catch (error) {
      console.error('Erreur lors de la création du dossier uploads/profiles:', error);
    }
  }

  // Téléverse la photo locale sur Cloudinary et retourne l'URL mise à jour
  async handlePhoto(photo: string | Express.Multer.File): Promise<{ url: string; public_id: string }> {
    if (typeof photo === 'string') {
      if (photo.startsWith('http')) {
        return { url: photo, public_id: '' }; // Si c'est une URL distante
      } else {
        // Téléversement de la photo locale sur Cloudinary
        console.log(`Téléversement du fichier local: ${photo}`);
        const uploadResult = await this.cloudinaryService.uploadLocalImage(photo, 'users/profiles');
        console.log(`Téléversement réussi: URL - ${uploadResult.url}, Public ID - ${uploadResult.public_id}`);
        return { url: uploadResult.url, public_id: uploadResult.public_id };
      }
    } else if (photo && photo.path) {
      const uploadResult = await this.cloudinaryService.uploadLocalImage(photo.path, 'users/profiles');
      return { url: uploadResult.url, public_id: uploadResult.public_id };
    }
    return { url: '', public_id: '' }; // Retourner des valeurs vides si aucune photo n'est fournie
  }

  // Méthode pour nettoyer l'ancienne photo
  private async nettoyerAnciennePhoto(photoUrl: string | null, publicId: string | null): Promise<void> {
    try {
      if (publicId) {
        console.log(`Suppression de l'image sur Cloudinary avec Public ID : ${publicId}`);
        await this.cloudinaryService.deleteImage(publicId);
        console.log(`Image supprimée avec succès de Cloudinary.`);
      }

      if (photoUrl && photoUrl.startsWith('uploads/') && fs.existsSync(photoUrl)) {
        console.log(`Suppression du fichier local : ${photoUrl}`);
        await fsPromises.unlink(photoUrl); // Utilisation de fsPromises.unlink pour éviter des erreurs de callback
        console.log(`Fichier local supprimé avec succès.`);
      }
    } catch (error) {
      console.error(`Erreur lors du nettoyage de l'ancienne photo : ${error.message}`);
    }
  }

  // Méthode de validation de mot de passe et évaluation de sa force
  private validatePassword(password: string): string {
    const minLength = 6;
  
    // Vérification obligatoire : longueur minimale
    if (password.length < minLength) {
      throw new BadRequestException('Le mot de passe doit contenir au moins six caractères.');
    }
  
    // Vérification facultative pour évaluer la force
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
    // Évaluer la force du mot de passe
    let strength = 0;
    if (hasUpperCase) strength++;
    if (hasLowerCase) strength++;
    if (hasNumber) strength++;
    if (hasSpecialChar) strength++;
  
    // Retourner la force
    return strength >= 3 ? 'fort' : 'faible';
  }

  // Méthode de création d'un utilisateur avec chiffrement du mot de passe et rôle par défaut
  async createUser(data: CreateUtilisateurDto, photoFile?: Express.Multer.File): Promise<{ message: string }> {
    console.log("Début de création utilisateur:", { data, photoFile });
  
    const utilisateurExistant = await this.prisma.utilisateur.findUnique({
      where: { email: data.email },
    });
  
    if (utilisateurExistant) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
  
    if (!data.email || !data.nom_user) {
      console.error("Email ou nom d'utilisateur manquant !");
      throw new BadRequestException("Les champs email et nom d'utilisateur sont obligatoires.");
    }
  
    try {
      // Définir le rôle par défaut et s'assurer qu'il est bien formaté
      const role = (data.role || RoleEnum.Visiteur) as RoleEnum;

      // Vérifier que les mots de passe correspondent
      if (data.motDePasse !== data.confirmPassword) {
        throw new BadRequestException("Le mot de passe et sa confirmation ne correspondent pas.");
      }
  
      // Valider la force du mot de passe
      const passwordStrength = this.validatePassword(data.motDePasse);
      if (passwordStrength === 'faible') {
        throw new BadRequestException(
          "Le mot de passe est trop faible. Utilisez au moins 3 des éléments suivants : une majuscule, une minuscule, un chiffre ou un caractère spécial."
        );
      }
  
      // Hacher le mot de passe après validation
      const hashedPassword = await bcrypt.hash(data.motDePasse, 10);
  
      // Gestion de la photo de profil
      let photoProfil = ''; // Pas de photo par défaut
  
      if (photoFile) {
        const uploadResult = await this.cloudinaryService.uploadLocalImage(photoFile.path, 'users/profiles');
        photoProfil = uploadResult.url;
      } else if (data.photoProfil) {
        if (data.photoProfil.startsWith('http')) {
          photoProfil = data.photoProfil;
        } else {
          const uploadResult = await this.cloudinaryService.uploadLocalImage(data.photoProfil, 'users/profiles');
          photoProfil = uploadResult.url;
        }
      }
  
      // Création de l'utilisateur dans la base de données
      await this.prisma.utilisateur.create({
        data: {
          nom_user: data.nom_user,
          adress: data.adress,
          contact: data.contact,
          email: data.email,
          motDePasse: hashedPassword,
          role: role,
          photoProfil: photoProfil || null, // Stocker null si aucune photo de profil n'est définie
        },
      });
  
      return { message: 'Utilisateur créé avec succès' };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Échec de la création de l’utilisateur');
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
  async updateUser(
    id: string,
    data: UpdateUtilisateurDto,
    photo?: Express.Multer.File
  ): Promise<{ message: string }> {
    console.log(`Début de la mise à jour de l'utilisateur avec ID: ${id}`);
    console.log(`Données reçues pour la mise à jour :`, { data });
  
    try {
      const existingUser = await this.prisma.utilisateur.findUnique({
        where: { id_User: id },
      });
  
      if (!existingUser) {
        throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé.`);
      }
      console.log(`Utilisateur existant trouvé :`, existingUser);
  
      // Gestion du mot de passe
      let updatedPassword = existingUser.motDePasse;
      if (data.motDePasse) {
        console.log(`Validation et hachage du mot de passe...`);
        const passwordStrength = this.validatePassword(data.motDePasse);
        if (passwordStrength === 'faible') {
          throw new BadRequestException(
            "Le mot de passe est trop faible. Utilisez au moins 3 des éléments suivants : une majuscule, une minuscule, un chiffre ou un caractère spécial."
          );
        }
        updatedPassword = await bcrypt.hash(data.motDePasse, 10);
        console.log(`Mot de passe mis à jour avec succès.`);
      }
  
      // Gestion de la photo de profil
      let photoProfil = existingUser.photoProfil;
      let photoPublicId = existingUser.photoPublicId;

      if (photo) {
        console.log(`Téléversement de la nouvelle photo depuis Multer : ${photo.path}`);

        // Nettoyer l'ancienne photo
        await this.nettoyerAnciennePhoto(existingUser.photoProfil, existingUser.photoPublicId);

        const uploadResult = await this.cloudinaryService.uploadLocalImage(photo.path, 'users/profiles');
        photoProfil = uploadResult.url; // Mise à jour de l'URL uniquement
        console.log(`Photo téléversée avec succès : ${photoProfil}`);
        photoPublicId = uploadResult.public_id;
      }  else if (data.photoProfil) {
        console.log(`Gestion de la photoProfil fournie dans le corps de la requête : ${data.photoProfil}`);

        // Nettoyer l'ancienne photo si nouvelle photo uploadée
        if (data.photoProfil !== existingUser.photoProfil) {
          await this.nettoyerAnciennePhoto(existingUser.photoProfil, existingUser.photoPublicId);
        }
        
        const uploadResult = await this.handlePhoto(data.photoProfil);
        photoProfil = uploadResult.url;
        console.log(`Photo mise à jour avec Cloudinary : ${photoProfil}`);
        photoPublicId = uploadResult.public_id;
      }
  
      // Mise à jour des données dans la base de données
      console.log(`Enregistrement des nouvelles données dans la base de données...`);
      await this.prisma.utilisateur.update({
        where: { id_User: id },
        data: {
          nom_user: data.nom_user || existingUser.nom_user,
          email: data.email || existingUser.email,
          motDePasse: updatedPassword,
          role: data.role || existingUser.role,
          derniereConnexion: data.derniereConnexion || existingUser.derniereConnexion,
          photoProfil: photoProfil || null, // Stocker null si aucune photo de profil n'est définie
          photoPublicId,
        },
      });
  
      console.log(`Mise à jour réussie. URL de la nouvelle photo : ${photoProfil}`);
      return { message: 'Utilisateur mis à jour avec succès' };
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'utilisateur :`, error);
      throw new InternalServerErrorException(`Échec de la mise à jour de l'utilisateur : ${error.message}`);
    }
  }

  // Méthode de suppression d'un utilisateur avec nettoyage des relations
  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const result = await this.getUserById(id); // Récupération des données de l'utilisateur
      const user = result.user; // Extraction de la clé 'user'
  
      if (!user) throw new NotFoundException(`Utilisateur avec ID ${id} non trouvé.`);
  
      // Supprimer la photo dans Cloudinary si elle n'est pas par défaut
      if (user.photoPublicId) {
        console.log(`Suppression de la photo sur Cloudinary avec public_id: ${user.photoPublicId}`);
        await this.nettoyerAnciennePhoto(user.photoProfil, user.photoPublicId);
      }
  
      // Supprimer les relations associées
      await this.prisma.commentaire.deleteMany({ where: { utilisateurId: id } });
      await this.prisma.notification.deleteMany({ where: { utilisateurId: id } });
      await this.prisma.note.deleteMany({ where: { utilisateurId: id } });
  
      // Supprimer l'utilisateur
      await this.prisma.utilisateur.delete({ where: { id_User: id } });
  
      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      console.error(error);
      throw new BadRequestException("Échec de la suppression de l'utilisateur.");
    }
  }
}