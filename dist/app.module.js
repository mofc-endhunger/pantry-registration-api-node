"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const user_entity_1 = require("./entities/user.entity");
const user_detail_entity_1 = require("./entities/user-detail.entity");
const authentication_entity_1 = require("./entities/authentication.entity");
const identity_entity_1 = require("./entities/identity.entity");
const credential_entity_1 = require("./entities/credential.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST'),
                    port: Number(configService.get('DB_PORT')),
                    username: configService.get('DB_USERNAME'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_DATABASE'),
                    entities: [user_entity_1.User, user_detail_entity_1.UserDetail, authentication_entity_1.Authentication, identity_entity_1.Identity, credential_entity_1.Credential, password_reset_token_entity_1.PasswordResetToken],
                    synchronize: false,
                    autoLoadEntities: true,
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map