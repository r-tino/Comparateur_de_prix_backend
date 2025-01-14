// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UtilisateurModule } from './utilisateur/utilisateur.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { ConfigModule } from '@nestjs/config';
import { CategorieModule } from './categorie/categorie.module';
import { ProduitModule } from './produit/produit.module';
import { OffreModule } from './offre/offre.module';
import { PromotionModule } from './promotion/promotion.module';
import { ImageGeneratorService } from './utils/image-generator.service'; // Nouvel import
import { NoteModule } from './note/note.module'; // Import du module Note
import { CommentaireModule } from './commentaire/commentaire.module'; // Import du module Note
import { NotificationModule } from './notification/notification.module';
import { ComparateurModule } from './comparateur/comparateur.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UtilisateurModule,
    PrismaModule,
    CategorieModule,
    ProduitModule,
    OffreModule,
    PromotionModule,
    NoteModule,   // Ajoutez NoteModule ici
    CommentaireModule,
    NotificationModule,
    ComparateurModule,
  ],
  controllers: [],
  providers: [
    // { provide: APP_GUARD, useClass: JwtAuthGuard },
    // { provide: APP_GUARD, useClass: RolesGuard },
    ImageGeneratorService, // Ajout du service
  ],
  exports: [ImageGeneratorService], // Exportation pour les autres modules
})
export class AppModule {}