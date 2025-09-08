"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log('[main.ts] process.cwd():', process.cwd());
const dotenv = require("dotenv");
dotenv.config();
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(require('@nestjs/config').ConfigService);
    console.log('DB_DATABASE from ConfigService:', configService.get('DB_DATABASE'));
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map