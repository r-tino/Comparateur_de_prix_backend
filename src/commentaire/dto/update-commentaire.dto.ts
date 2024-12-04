// src/commentaire/dto/update-commentaire.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCommentaireDto } from './create-commentaire.dto';

export class UpdateCommentaireDto extends PartialType(CreateCommentaireDto) {}