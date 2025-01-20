// src/produit/dto/create-produit.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, IsEnum, IsObject } from 'class-validator';
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