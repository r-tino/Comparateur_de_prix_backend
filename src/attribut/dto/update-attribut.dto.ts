// src/attribut/dto/update-attribut.dto.ts

import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateAttributDto {
  @IsString({ message: "L'ID de l'attribut doit être une chaîne de caractères." })
  id_Attribut: string;

  @IsOptional()
  @IsString({ message: "Le nom de l'attribut doit être une chaîne de caractères." })
  @MinLength(2, { message: "Le nom de l'attribut doit contenir au moins 2 caractères." })
  @MaxLength(50, { message: "Le nom de l'attribut ne doit pas dépasser 50 caractères." })
  nomAttribut?: string;

  @IsOptional()
  @IsBoolean({ message: "Le champ 'estObligatoire' doit être un booléen." })
  estObligatoire?: boolean;

  @IsOptional()
  @IsString({ message: "Le type de l'attribut doit être une chaîne de caractères." })
  @MinLength(2, { message: "Le type de l'attribut doit contenir au moins 2 caractères." })
  typeAttribut?: string;
}