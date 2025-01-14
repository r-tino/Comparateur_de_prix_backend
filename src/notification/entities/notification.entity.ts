// src/notification/entities/notification.entity.ts
export class Notification {
    id_Notification: string;
    typeNotif: string;
    message: string;
    dateNotif: Date;
    lu: boolean;
    utilisateurId: string;
  }  