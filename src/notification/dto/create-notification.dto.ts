// src/notification/dto/create-notification.dto.ts
import { TypeNotifEnum } from '@prisma/client';

export class CreateNotificationDto {
  utilisateurId: string;
  typeNotif: TypeNotifEnum;
  message: string;
}