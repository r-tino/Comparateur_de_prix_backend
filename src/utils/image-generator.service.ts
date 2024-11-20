// src/utils/image-generator.service.ts
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageGeneratorService {
  /**
   * Génère une image localement avec du contenu personnalisé.
   * @param fileName Nom du fichier généré.
   * @param folder Dossier cible où enregistrer le fichier.
   * @param content Contenu à écrire dans l'image (exemple : texte, données brutes, etc.).
   * @returns Chemin complet du fichier généré.
   */
  generateImage(fileName: string, folder: string, content: Buffer): string {
    const folderPath = path.resolve(process.cwd(), folder);

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.resolve(folderPath, fileName);

    // Écriture du fichier
    fs.writeFileSync(filePath, content);

    return filePath;
  }
}