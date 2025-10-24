// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './providers/database/database.module';
import { PublicDatabaseModule } from './providers/database/public-database.module';
import { FeatureModules } from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PublicDatabaseModule,
    ...FeatureModules,
  ],
})
export class AppModule {}
