// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryConfigService } from './cloudinary.config';
import * as fs from 'fs';

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

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }
}
