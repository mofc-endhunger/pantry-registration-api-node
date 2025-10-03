import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../../config/database.config';
import * as entities from '../../entities';
import { HouseholdAddress } from '../../entities/household-address.entity';

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
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [...Object.values(entities), HouseholdAddress], // Explicitly register all entities
        synchronize: false, // NEVER enable - will modify database schema!
        logging: process.env.NODE_ENV === 'development', // Only log in development
      }),
    }),
  ],
})
export class DatabaseModule {}
