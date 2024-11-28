import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryConfigService } from './cloudinary.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  constructor(private readonly cloudinaryConfig: CloudinaryConfigService) {}

  /**
   * Télécharge une image locale sur Cloudinary.
   * @param localPath Chemin local du fichier.
   * @param folder Nom du dossier sur Cloudinary.
   * @returns URL et ID public de l'image.
   */
  async uploadLocalImage(localPath: string, folder: string): Promise<{ url: string; public_id: string }> {
    console.log(`Début de l'upload de l'image locale...`);
    console.log(`Chemin fourni : ${localPath}`);
    console.log(`Dossier cible sur Cloudinary : ${folder}`);
  
    if (!fs.existsSync(localPath)) {
      console.error(`Erreur : Le fichier "${localPath}" n'existe pas.`);
      throw new Error(`Le fichier "${localPath}" n'existe pas.`);
    }
  
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        localPath,
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            console.error('Erreur lors du téléchargement sur Cloudinary :', error);
            return reject(error);
          }
          console.log(`Téléversement réussi sur Cloudinary.`);
          console.log(`URL : ${result.secure_url}`);
          console.log(`Public ID : ${result.public_id}`);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
    });
  }

  /**
   * Télécharge une image depuis un appareil mobile sur Cloudinary.
   * @param photoUrl URI de l'image sur l'appareil mobile (par exemple file://).
   * @param folder Nom du dossier sur Cloudinary.
   * @returns URL et ID public de l'image.
   */
  async uploadMobileImage(photoUrl: string, folder: string): Promise<{ url: string; public_id: string }> {
    console.log(`Début de l'upload de l'image mobile...`);
    console.log(`URI fournie : ${photoUrl}`);
    console.log(`Dossier cible sur Cloudinary : ${folder}`);

    // Vérification du type d'URI et traitement
    const fileData = await this.getFileFromUri(photoUrl);

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        fileData,
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            console.error('Erreur lors du téléchargement sur Cloudinary :', error);
            return reject(error);
          }
          console.log(`Téléversement réussi sur Cloudinary.`);
          console.log(`URL : ${result.secure_url}`);
          console.log(`Public ID : ${result.public_id}`);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
    });
  }

  /**
   * Récupère le fichier depuis une URI mobile (par exemple file://).
   * @param uri URI du fichier sur l'appareil mobile.
   * @returns Le chemin du fichier ou les données à envoyer à Cloudinary.
   */
  private async getFileFromUri(uri: string): Promise<string> {
    if (uri.startsWith('file://')) {
      const filePath = uri.replace('file://', '');
      console.log(`Chargement du fichier à partir du chemin local : ${filePath}`);
      return fs.promises.readFile(filePath, 'base64'); // Exemple de lecture du fichier en base64
    } else if (uri.startsWith('content://')) {
      // Pour Android, vous pourriez avoir besoin d'une librairie comme react-native-fs ou rn-fetch-blob
      // Traitement spécifique pour récupérer le fichier depuis un URI Android (content://)
      throw new Error('URI Android content:// n\'est pas supporté dans cet environnement.');
    } else {
      throw new Error('URI non supporté');
    }
  }

  // Méthode `getPublicIdFromUrl` dans `CloudinaryService`
  getPublicIdFromUrl(url: string): string | null {
    const regex = /\/([^\/]+)\.(jpg|jpeg|png|gif|webp|svg)$/; // RegExp pour extraire le nom de fichier sans extension
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Supprime une image de Cloudinary.
   * @param publicId ID public de l'image à supprimer.
   * @returns Une promesse résolue si la suppression est réussie.
   */
  async deleteImage(publicId: string): Promise<void> {
    console.log(`Début de la suppression de l'image avec Public ID : ${publicId}`);

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error(`Erreur lors de la suppression de l'image dans Cloudinary : ${error.message}`);
          return reject(new Error(`Échec de la suppression de l'image dans Cloudinary : ${error.message}`));
        }

        if (result.result === 'ok') {
          console.log(`Image supprimée avec succès dans Cloudinary. Public ID : ${publicId}`);
          resolve();
        } else if (result.result === 'not found') {
          console.warn(`Image non trouvée dans Cloudinary. Public ID : ${publicId}`);
          resolve(); // Considérer comme résolu pour éviter un blocage.
        } else {
          console.error(`Résultat inattendu lors de la suppression : ${result.result}`);
          return reject(new Error(`Résultat inattendu lors de la suppression de l'image : ${result.result}`));
        }
      });
    });
  }
}