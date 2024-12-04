// src/note/dto/create-note.dto.ts
import { Type } from 'class-transformer';
import { IsInt, Min, Max, IsNotEmpty, IsString, IsOptional, IsDate } from 'class-validator';

export class CreateNoteDto {
  @IsInt()
  @Min(1)
  @Max(10)
  valeur: number;

  @IsString()
  @IsOptional() // Rend le champ facultatif
  utilisateurId: string;

  @IsString()
  @IsNotEmpty()
  produitId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date) // Transforme automatiquement la valeur en Date
  dateNote?: Date;
}