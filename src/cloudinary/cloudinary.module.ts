// src/cloudinary/cloudinary.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryConfigService } from './cloudinary.config';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [ConfigModule], // Importation de ConfigModule pour la gestion des variables d'environnement
  providers: [CloudinaryConfigService, CloudinaryService], // Fournir les services Cloudinary
  exports: [CloudinaryConfigService, CloudinaryService], // Exporter CloudinaryService pour l'utiliser dans d'autres modules
})
export class CloudinaryModule {}