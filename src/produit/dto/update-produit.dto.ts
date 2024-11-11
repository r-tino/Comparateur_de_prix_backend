import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

// Ajoutez l'importation de l'enum si nécessaire
import { PhotoTypeEnum } from '@prisma/client'; // Assurez-vous d'importer votre enum ici

  class PhotoUpdateDto {
    @IsString()
    url: string;

    @IsBoolean()
    couverture: boolean = false;

    @IsEnum(PhotoTypeEnum)
    type: PhotoTypeEnum;
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
  }