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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return {
          type: 'mysql',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          entities: [],
          autoLoadEntities: true,
          // In test, auto-sync the schema; rely on test helpers to truncate between tests
          synchronize: isTest ? true : false,
          dropSchema: false,
          logging: process.env.NODE_ENV === 'development' || isTest,
        } as any;
      },
    }),
  ],
})
export class DatabaseModule {}
