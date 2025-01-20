// src/attribut/dto/create-attribut.dto.ts

import { IsString, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateAttributDto {
  @IsString({ message: "Le nom de l'attribut doit être une chaîne de caractères." })
  @MinLength(2, { message: "Le nom de l'attribut doit contenir au moins 2 caractères." })
  @MaxLength(50, { message: "Le nom de l'attribut ne doit pas dépasser 50 caractères." })
  nomAttribut: string;

  @IsBoolean({ message: "Le champ 'estObligatoire' doit être un booléen." })
  estObligatoire: boolean;

  @IsString({ message: "Le type de l'attribut doit être une chaîne de caractères." })
  @MinLength(2, { message: "Le type de l'attribut doit contenir au moins 2 caractères." })
  typeAttribut: string;

  @IsString({ message: "L'ID de la catégorie doit être une chaîne de caractères." })
  categorieId: string;
}