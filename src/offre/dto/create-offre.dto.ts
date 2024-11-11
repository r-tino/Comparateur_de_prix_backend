// src/offres/dto/create-offre.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOffreDto {
  @IsNotEmpty()
  @IsNumber()
  prix: number;

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
