// src/produit/dto/create-produit.dto.ts

import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, ArrayMinSize, IsObject, Min } from 'class-validator';
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

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsOptional()
  file?: any; // Ajoutez cette ligne pour définir la propriété file
}

export class CreateProduitDto {
  @IsString()
  nom_Produit: string;

  @IsString()
  description: string;

  @IsNumber()
  prixInitial: number;

  @IsNumber()
  @Min(0, { message: 'Le stock ne peut pas être inférieur à zéro.' })
  @IsOptional()
  stock?: number = 0; // Nouveau champ pour le stock

  @IsBoolean()
  @IsOptional()
  disponibilite?: boolean = true; // Champ optionnel avec valeur par défaut

  @IsString()
  @IsOptional()
  categorieId?: string; // Utilisation de categorieId

  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @ArrayMinSize(1, { message: 'Le produit doit avoir au moins une photo.' })
  photos: PhotoDto[];

  @IsOptional()
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide.' })
  valeursAttributs?: Record<string, any>;
}