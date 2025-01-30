// src/produit/dto/create-produit.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PhotoUpdateDto {
  @IsString()
  url: string;

  @IsBoolean()
  couverture: boolean = false;
}

export class UpdateProduitDto {
  @IsString()
  @IsOptional()
  nom_Produit?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  prixInitial?: number;

  @IsNumber()
  @Min(0, { message: 'Le stock ne peut pas être inférieur à zéro.' })
  @IsOptional()
  stock?: number;

  @IsBoolean()
  @IsOptional()
  disponibilite?: boolean;

  @IsString()
  @IsOptional()
  categorieId?: string;

  @ValidateNested({ each: true })
  @Type(() => PhotoUpdateDto)
  @IsOptional()
  photosToAdd?: PhotoUpdateDto[];

  @IsOptional()
  photosToDelete?: string[];

  @IsOptional()
  @IsObject({ message: 'Les attributs doivent être un objet JSON valide.' })
  attributs?: Record<string, any>;
}