import { Type } from 'class-transformer';
import { IsDate, IsNumber, Min, Max, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdatePromotionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  pourcentage?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date) // Transforme la chaîne de caractères en instance de Date
  dateDebut?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date) // Transforme la chaîne de caractères en instance de Date
  dateFin?: Date;
  
  @IsString()
  @IsNotEmpty()
  @IsOptional() // Rend `offreId` optionnel
  offreId?: string;
}