// src/promotion/dto/create-promotion.dto.ts
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, Min, Max, IsString } from 'class-validator';

export class CreatePromotionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  pourcentage: number;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date) // Transforme la chaîne de caractères en instance de Date
  dateDebut: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date) // Transforme la chaîne de caractères en instance de Date
  dateFin: Date;

  @IsString()
  @IsNotEmpty()
  offreId: string;
}