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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const password_reset_token_entity_1 = require("../../entities/password-reset-token.entity");
const mailer_service_1 = require("./mailer.service");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    constructor(userRepository, resetTokenRepository, mailerService, jwtService) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.mailerService = mailerService;
        this.jwtService = jwtService;
    }
    async login(loginDto) {
        const user = await this.userRepository.findOne({
            where: [
                { email: loginDto.username },
                { identification_code: loginDto.username },
            ],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(loginDto.password, user.password_digest);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { username: user.email, sub: user.id };
        const access_token = this.jwtService.sign(payload);
        return { access_token };
    }
    async register(registerDto) {
        const existing = await this.userRepository.findOne({
            where: [
                { email: registerDto.username },
                { identification_code: registerDto.username },
            ],
        });
        if (existing) {
            throw new common_1.BadRequestException('User already exists');
        }
        const saltRounds = 12;
        const password_digest = await bcrypt.hash(registerDto.password, saltRounds);
        const user = this.userRepository.create({
            email: registerDto.username,
            identification_code: registerDto.username,
            user_type: registerDto.user_type || 'customer',
            password_digest,
        });
        return this.userRepository.save(user);
    }
    async requestPasswordReset(dto) {
        const user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) {
            return { message: 'If the email exists, a reset link will be sent.' };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 1000 * 60 * 60);
        await this.resetTokenRepository.save({ user_id: user.id, token, expires_at, user });
        await this.mailerService.sendResetEmail(user.email, token);
        return { message: 'If the email exists, a reset link will be sent.' };
    }
    async resetPassword(dto) {
        const resetToken = await this.resetTokenRepository.findOne({ where: { token: dto.token } });
        if (!resetToken || resetToken.expires_at < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        const user = await this.userRepository.findOne({ where: { id: resetToken.user_id } });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const saltRounds = 12;
        user.password_digest = await bcrypt.hash(dto.newPassword, saltRounds);
        await this.userRepository.save(user);
        await this.resetTokenRepository.delete({ id: resetToken.id });
        return { message: 'Password reset successful' };
    }
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, mailer_service_1.MailerService, typeof (_c = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _c : Object])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map