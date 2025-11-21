import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../../config/database.config';
import * as entities from '../../entities';

@Module({
  imports: [
    // Load env-based config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    // Register DB connection dynamically
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = process.env.NODE_ENV === 'test';
        return {
          type: 'mysql',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          entities: Object.values(entities), // Explicitly register all entities
          // In test, auto-sync and drop schema to ensure a fresh DB visible to the Nest connection
          synchronize: isTest ? true : false,
          dropSchema: isTest ? true : false,
          logging: process.env.NODE_ENV === 'development', // Only log in development
        } as any;
      },
    }),
  ],
})
export class DatabaseModule {}
