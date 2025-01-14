// src/categorie/dto/update-categorie.dto.ts

import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateCategorieDto {
  @IsOptional()
  @IsString({ message: 'Le nom de la catégorie doit être une chaîne de caractères.' })
  @MinLength(2, { message: 'Le nom de la catégorie doit contenir au moins 2 caractères.' })
  @MaxLength(50, { message: 'Le nom de la catégorie ne doit pas dépasser 50 caractères.' })
  nomCategorie?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide.' })
  attributs?: Record<string, any>;

  @IsOptional()
  @IsString({ message: 'Le type de la catégorie doit être une chaîne de caractères.' })
  @MinLength(1, { message: 'Veuillez sélectionner un type' })
  typeCategory?: string; // Use the correct field name
}