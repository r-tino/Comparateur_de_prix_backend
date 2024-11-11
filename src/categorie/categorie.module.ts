import { Module } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { CategorieController } from './categorie.controller';
import { PrismaService } from '../prisma/prisma.service'; // Assurez-vous que PrismaService est correctement importé
import { AuthModule } from '../auth/auth.module'; // Importez AuthModule

@Module({
  imports: [AuthModule], // Ajoutez AuthModule ici
  controllers: [CategorieController],
  providers: [CategorieService, PrismaService], // N'oubliez pas d'ajouter PrismaService pour l'accès à la base de données
  exports: [CategorieService] // Vous pouvez exporter le service si nécessaire pour d'autres modules
})
export class CategorieModule {}
