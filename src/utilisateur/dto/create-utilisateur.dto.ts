import { IsString, IsEmail, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { RoleEnum } from '@prisma/client';

export class CreateUtilisateurDto {
  @IsString()
  @MinLength(3, { message: 'Le nom d\'utilisateur doit comporter au moins 3 caractères' })
  @MaxLength(20, { message: 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères' })
  nom_user: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit comporter au moins 6 caractères' })
  motDePasse: string;

  @IsString()
  confirmPassword: string;

  @IsEnum(RoleEnum, { message: 'Le rôle doit être Admin, Vendeur ou Visiteur' })
  @IsOptional()
  role?: RoleEnum;
}
