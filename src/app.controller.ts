import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('test-db')
  async testDb() {
    const users = await this.prisma.utilisateur.findMany();
    return users;
  }
}

