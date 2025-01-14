// src/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { TypeNotifEnum } from '@prisma/client'; // Importer l'énumération

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return await this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  async findAll() {
    return await this.prisma.notification.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.notification.findUnique({
      where: { id_Notification: id },
    });
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    return await this.prisma.notification.update({
      where: { id_Notification: id },
      data: updateNotificationDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.notification.delete({
      where: { id_Notification: id },
    });
  }

  // Méthode pour notifier un utilisateur
  async notify(utilisateurId: string, typeNotif: TypeNotifEnum, message: string) {
    return await this.prisma.notification.create({
      data: {
        utilisateurId,
        typeNotif,
        message,
      },
    });
  }
}

