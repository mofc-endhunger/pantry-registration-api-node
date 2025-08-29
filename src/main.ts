import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Log DB_DATABASE from ConfigService after config is loaded
  const configService = app.get(require('@nestjs/config').ConfigService);
  console.log('DB_DATABASE from ConfigService:', configService.get('DB_DATABASE'));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Pantry Registration API')
    .setDescription('API documentation for Pantry Registration')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      in: 'header',
    }, 'JWT')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
