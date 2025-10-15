import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Enable CORS with configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Guest-Token', 'x-guest-token'],
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable global validation for all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      forbidNonWhitelisted: true, // throws error on unknown properties
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // enable type conversion based on TS type
      },
    }),
  );

  // Swagger setup with enhanced configuration
  const config = new DocumentBuilder()
    .setTitle('Pantry Registration API')
    .setDescription(
      'API documentation for user registration and authentication in the Pantry system',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Guest-Token',
        in: 'header',
        description: 'Guest token header for non-authenticated users',
      },
      'Guest-Token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Apply HTTP exception filter to format error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Get port from environment or use default
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
