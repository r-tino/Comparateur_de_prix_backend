// src/categorie/dto/create-categorie.dto.ts
import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategorieDto {
  @IsString({ message: 'Le nom de la catégorie doit être une chaîne de caractères.' })
  @MinLength(2, { message: 'Le nom de la catégorie doit contenir au moins 2 caractères.' })
  @MaxLength(50, { message: 'Le nom de la catégorie ne doit pas dépasser 50 caractères.' })
  nomCategorie: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Nouveau champ pour activer/désactiver la catégorie
}
