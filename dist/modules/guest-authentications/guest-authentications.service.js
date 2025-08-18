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
exports.GuestAuthenticationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const authentication_entity_1 = require("../../entities/authentication.entity");
const crypto_1 = require("crypto");
let GuestAuthenticationsService = class GuestAuthenticationsService {
    constructor(userRepo, authRepo) {
        this.userRepo = userRepo;
        this.authRepo = authRepo;
    }
    async createGuest(createGuestDto) {
        let identification_code;
        do {
            identification_code = (0, crypto_1.randomBytes)(3).toString('hex').slice(0, 6).toUpperCase();
        } while (await this.userRepo.findOne({ where: { identification_code } }));
        const user = this.userRepo.create({
            identification_code,
            user_type: 'guest',
            phone: createGuestDto.phone,
        });
        await this.userRepo.save(user);
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
};
exports.GuestAuthenticationsService = GuestAuthenticationsService;
exports.GuestAuthenticationsService = GuestAuthenticationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(authentication_entity_1.Authentication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], GuestAuthenticationsService);
//# sourceMappingURL=guest-authentications.service.js.map