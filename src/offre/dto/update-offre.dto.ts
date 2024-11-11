// src/offre/dto/update-offre.dto.ts
import { IsOptional, IsNumber, IsPositive, IsDateString } from 'class-validator';

export class UpdateOffreDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  prix?: number;

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