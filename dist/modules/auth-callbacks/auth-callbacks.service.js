"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthCallbacksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const identity_entity_1 = require("../../entities/identity.entity");
const user_entity_1 = require("../../entities/user.entity");
const authentication_entity_1 = require("../../entities/authentication.entity");
const crypto_1 = require("crypto");
let AuthCallbacksService = class AuthCallbacksService {
    constructor(identityRepo, userRepo, authRepo) {
        this.identityRepo = identityRepo;
        this.userRepo = userRepo;
        this.authRepo = authRepo;
    }
    async facebookCallback(facebookDto) {
        const isValid = await this.verifyFacebookToken(facebookDto.accessToken, facebookDto.userID);
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid Facebook token');
        let identity = await this.identityRepo.findOne({ where: { provider_uid: facebookDto.userID } });
        let user;
        if (identity) {
            const foundUser = await this.userRepo.findOne({ where: { id: identity.user_id } });
            if (!foundUser) {
                throw new common_1.UnauthorizedException('User not found for identity');
            }
            user = foundUser;
        }
        else {
            user = this.userRepo.create({
                user_type: 'customer',
                identification_code: await this.generateUniqueCode(),
            });
            await this.userRepo.save(user);
            identity = this.identityRepo.create({
                user_id: user.id,
                provider_uid: facebookDto.userID,
                provider_type: facebookDto.graphDomain,
                auth_hash: facebookDto.accessToken,
                user,
            });
            await this.identityRepo.save(identity);
        }
        const token = (0, crypto_1.randomBytes)(16).toString('hex');
        const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const authentication = this.authRepo.create({
            user_id: user.id,
            token,
            expires_at,
            user,
        });
        await this.authRepo.save(authentication);
        return authentication;
    }
    async verifyFacebookToken(accessToken, userID) {
        return true;
    }
    async generateUniqueCode() {
        let code;
        do {
            code = (0, crypto_1.randomBytes)(3).toString('hex').slice(0, 6).toUpperCase();
        } while (await this.userRepo.findOne({ where: { identification_code: code } }));
        return code;
    }
};
exports.AuthCallbacksService = AuthCallbacksService;
exports.AuthCallbacksService = AuthCallbacksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(identity_entity_1.Identity)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(authentication_entity_1.Authentication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthCallbacksService);
//# sourceMappingURL=auth-callbacks.service.js.map