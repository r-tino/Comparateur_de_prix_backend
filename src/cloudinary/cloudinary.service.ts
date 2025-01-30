// src/cloudinary/cloudinary.service.ts

import { Injectable, BadRequestException, InternalServerErrorException } from "@nestjs/common"
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryConfigService } from './cloudinary.config';
import * as fs from 'fs';
import * as stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

@Injectable()
export class CloudinaryService {
  constructor(private readonly cloudinaryConfig: CloudinaryConfigService) {}

  async uploadImage(file: string, folder: string): Promise<{ url: string; public_id: string }> {
    try {
      if (fs.existsSync(file)) {
        return this.uploadLocalImage(file, folder)
      } else {
        return this.uploadMobileImage(file, folder)
      }
    } catch (error) {
      throw new InternalServerErrorException(`Erreur lors du téléversement de l'image : ${error.message}`)
    }
  }

  async uploadLocalImage(localPath: string, folder: string): Promise<{ url: string; public_id: string }> {
    console.log(`Début de l'upload de l'image locale...`)
    console.log(`Chemin fourni : ${localPath}`)
    console.log(`Dossier cible sur Cloudinary : ${folder}`)

    if (!fs.existsSync(localPath)) {
      throw new BadRequestException(`Le fichier "${localPath}" n'existe pas.`)
    }

    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload(localPath, { folder, resource_type: "image" }, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
      })

      console.log(`Téléversement réussi sur Cloudinary.`)
      console.log(`URL: ${result.secure_url}`)
      console.log(`Public ID: ${result.public_id}`)

      return { url: result.secure_url, public_id: result.public_id }
    } finally {
      // Nettoyage du fichier temporaire
      fs.unlink(localPath, (err) => {
        if (err) console.error(`Erreur lors de la suppression du fichier temporaire : ${err.message}`)
      })
    }
  }
  
  async uploadMobileImage(photoUrl: string, folder: string): Promise<{ url: string; public_id: string }> {
    console.log(`Début de l'upload de l'image mobile...`)
    console.log(`URI fournie: ${photoUrl}`)
    console.log(`Dossier cible sur Cloudinary: ${folder}`)

    const fileData = await this.getFileFromUri(photoUrl)

    return new Promise((resolve, reject) => {
      const writeStream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
        if (error) {
          reject(new InternalServerErrorException(`Erreur lors du téléchargement sur Cloudinary: ${error.message}`))
        } else {
          console.log(`Téléversement réussi sur Cloudinary.`)
          console.log(`URL: ${result.secure_url}`)
          console.log(`Public ID: ${result.public_id}`)
          resolve({ url: result.secure_url, public_id: result.public_id })
        }
      })

      const readStream = stream.Readable.from(fileData)
      pipeline(readStream, writeStream).catch((error) => {
        reject(new InternalServerErrorException(`Erreur lors du téléchargement du stream: ${error.message}`))
      })
    })
  }

  private async getFileFromUri(uri: string): Promise<Buffer> {
    if (uri.startsWith("file://")) {
      const filePath = uri.replace("file://", "")
      console.log(`Chargement du fichier à partir du chemin local: ${filePath}`)
      return fs.promises.readFile(filePath)
    } else if (uri.startsWith("blob:")) {
      console.log(`Chargement du fichier à partir de l'URI blob: ${uri}`)
      const response = await fetch(uri)
      return Buffer.from(await response.arrayBuffer())
    } else {
      throw new BadRequestException("URI non supporté")
    }
  }

  getPublicIdFromUrl(url: string): string | null {
    const regex = /\/([^/]+)\.(jpg|jpeg|png|gif|webp|svg)$/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  async deleteImage(publicId: string): Promise<void> {
    console.log(`Début de la suppression de l'image avec Public ID: ${publicId}`)
    try {
      const result = await new Promise<{ result: string }>((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
      })

      if (result.result === "ok") {
        console.log(`Image supprimée avec succès dans Cloudinary. Public ID: ${publicId}`)
      } else if (result.result === "not found") {
        console.warn(`Image non trouvée dans Cloudinary. Public ID: ${publicId}`)
      } else {
        throw new Error(`Résultat inattendu lors de la suppression de l'image: ${result.result}`)
      }
    } catch (error) {
      throw new InternalServerErrorException(`Échec de la suppression de l'image dans Cloudinary: ${error.message}`)
    }
  }
}