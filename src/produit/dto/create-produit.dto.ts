// src/produit/dto/create-produit.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, ArrayMinSize, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class PhotoDto {
  @IsString()
  url: string;

  @IsBoolean()
  @IsOptional()
  couverture?: boolean = false; // Défini comme optionnel avec une valeur par défaut

  @IsString()
  @IsOptional()
  localPath?: string; // Propriété optionnelle pour gérer les chemins locaux
}

export class CreateProduitDto {
  @IsString()
  nom_Produit: string;

  @IsString()
  description: string;

  @IsNumber()
  prixInitial: number;

  @IsBoolean()
  @IsOptional()
  disponibilite?: boolean = true; // Champ optionnel avec valeur par défaut

  @IsString()
  @IsOptional()
  categorieId?: string;

  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @ArrayMinSize(1, { message: 'Le produit doit avoir au moins une photo.' })
  photos: PhotoDto[];

  @IsOptional()
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide.' })
  attributs?: Record<string, any>;
}