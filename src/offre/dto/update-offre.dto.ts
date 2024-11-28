// src/offre/dto/update-offre.dto.ts
import { IsOptional, IsNumber, IsPositive, IsDateString, Min } from 'class-validator';

export class UpdateOffreDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.01, { message: 'Le prix doit être supérieur à zéro' })
  prixOffre?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  stock?: number;

  @IsOptional()
  @IsDateString()
  dateExpiration?: Date;

  @IsOptional()
  promotionId?: string;
}