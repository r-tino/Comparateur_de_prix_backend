// src/utilisateur/dto/update-utilisateur.dto.ts

import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class UpdateUtilisateurDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Le nom d\'utilisateur doit comporter au moins 3 caractères' })
  @MaxLength(20, { message: 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères' })
  nom_user?: string;

  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Le mot de passe doit comporter au moins 6 caractères' })
  motDePasse?: string;

  @IsEnum(RoleEnum, { message: 'Le rôle doit être Admin, Vendeur ou Visiteur' })
  @IsOptional()
  role?: RoleEnum;

  @IsOptional()
  @IsDateString()
  derniereConnexion?: string; // Ajoutez cette ligne
  
  @IsOptional()
  @IsString()
  photoProfil?: string; // Ajout de cette propriété pour résoudre l'erreur

   
  @IsOptional()
  @IsString()
  photoPublicId?: string; // Ajout de cette propriété pour résoudre l'erreur
}
