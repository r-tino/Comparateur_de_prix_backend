// src/offres/dto/create-offre.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateOffreDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0.01, { message: 'Le prix doit être supérieur à zéro' })
  prixOffre: number;

  @IsNotEmpty()
  @IsNumber()
  stock: number;

  @IsOptional()
  dateExpiration?: Date;

  @IsString()
  @IsNotEmpty()
  produitId: string;

  // @IsOptional()
  // promotionId?: string;
}
