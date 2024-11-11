import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

// Ajoutez l'importation de l'enum si nécessaire
import { PhotoTypeEnum } from '@prisma/client'; // Assurez-vous d'importer votre enum ici

class PhotoDto {
  @IsString()
  url: string;

  @IsBoolean()
  couverture: boolean = false; // Assurez-vous que 'couverture' est toujours défini

  @IsEnum(PhotoTypeEnum)
  type: PhotoTypeEnum;
}

export class CreateProduitDto {
  @IsString()
  nom_Produit: string;

  @IsString()
  description: string;

  @IsNumber()
  prixInitial: number;

  @IsBoolean()
  disponibilite: boolean;

  @IsString()
  categorieId: string;

  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @ArrayMinSize(1, { message: 'Le produit doit avoir au moins une photo.' })
  photos: PhotoDto[];
}