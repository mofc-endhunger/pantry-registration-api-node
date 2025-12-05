import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import publicDatabaseConfig from '../../config/public-database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [publicDatabaseConfig] }),
    TypeOrmModule.forRootAsync({
      name: 'public',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = process.env.NODE_ENV === 'test';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return {
          name: 'public',
          type: 'mysql',
          host: configService.get<string>('publicDatabase.host'),
          port: configService.get<number>('publicDatabase.port'),
          username: configService.get<string>('publicDatabase.username'),
          password: configService.get<string>('publicDatabase.password'),
          database: configService.get<string>('publicDatabase.database'),
          entities: [],
          autoLoadEntities: true,
          synchronize: isTest ? true : false,
          dropSchema: false,
          logging: process.env.NODE_ENV === 'development',
        } as any;
      },
    }),
  ],
})
export class PublicDatabaseModule {}
