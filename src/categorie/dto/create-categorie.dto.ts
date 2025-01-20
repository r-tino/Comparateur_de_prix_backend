// src/categorie/dto/create-categorie.dto.ts
import { IsArray, ValidateNested, IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAttributDto } from '../../attribut/dto/create-attribut.dto';

export class CreateCategorieDto {
  @IsString({ message: 'Le nom de la catégorie doit être une chaîne de caractères.' })
  @MinLength(2, { message: 'Le nom de la catégorie doit contenir au moins 2 caractères.' })
  @MaxLength(50, { message: 'Le nom de la catégorie ne doit pas dépasser 50 caractères.' })
  nomCategorie: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Le type de la catégorie doit être une chaîne de caractères.' })
  @MinLength(1, { message: 'Veuillez sélectionner un type' })
  typeCategory?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributDto)
  attributs?: CreateAttributDto[];
}