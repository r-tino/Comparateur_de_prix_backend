// src/commentaire/dto/create-commentaire.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentaireDto {
  @IsNotEmpty()
  @IsString()
  contenu: string; // Contenu du commentaire

  @IsOptional()
  @IsString()
  produitId: string; // Identifiant du produit

  @IsOptional()
  @IsString()
  utilisateurId: string; // Identifiant de l'utilisateur (ajouté)
}