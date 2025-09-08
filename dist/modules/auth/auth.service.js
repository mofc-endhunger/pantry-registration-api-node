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
exports.AuthService = void 0;
const credential_entity_1 = require("../../entities/credential.entity");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const authentication_entity_1 = require("../../entities/authentication.entity");
const cognito_service_1 = require("./cognito.service");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const password_reset_token_entity_1 = require("../../entities/password-reset-token.entity");
const mailer_service_1 = require("./mailer.service");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    constructor(userRepository, resetTokenRepository, mailerService, jwtService, authenticationRepository, credentialRepository, cognitoService) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.mailerService = mailerService;
        this.jwtService = jwtService;
        this.authenticationRepository = authenticationRepository;
        this.credentialRepository = credentialRepository;
        this.cognitoService = cognitoService;
    }
    async registerGuest() {
        const guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const payload = {
            sub: guestId,
            role: 'guest',
            iat: Math.floor(Date.now() / 1000),
        };
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
        return {
            guestId,
            token,
            type: 'guest',
        };
    }
    async login(loginDto) {
        const user = await this.userRepository.findOne({
            where: [
                { email: loginDto.email },
                { identification_code: loginDto.email },
            ],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const credential = await this.credentialRepository.findOne({ where: { user_id: user.id } });
        if (!credential || !credential.secret) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(loginDto.password, credential.secret);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { email: user.email, sub: user.id };
        const access_token = this.jwtService.sign(payload);
        return { access_token };
    }
    async register(registerDto) {
        const existing = await this.userRepository.findOne({
            where: [
                { email: registerDto.email },
                { identification_code: registerDto.email },
            ],
        });
        if (existing) {
            throw new common_1.BadRequestException('User already exists');
        }
        if (registerDto.password) {
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);
            const user = this.userRepository.create({
                email: registerDto.email,
                identification_code: registerDto.email,
                user_type: registerDto.user_type || 'customer',
            });
            const savedUser = await this.userRepository.save(user);
            const credential = this.credentialRepository.create({
                user_id: savedUser.id,
                secret: passwordHash,
            });
            await this.credentialRepository.save(credential);
            return savedUser;
        }
        return { success: true, message: 'Appointment registered, no user created.' };
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
        const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
        let credential = await this.credentialRepository.findOne({ where: { user_id: user.id } });
        if (!credential) {
            credential = this.credentialRepository.create({ user_id: user.id });
        }
        credential.secret = passwordHash;
        await this.credentialRepository.save(credential);
        await this.resetTokenRepository.delete({ id: resetToken.id });
        return { message: 'Password reset successful' };
    }
    async facebookAuth(dto) {
        return { message: 'Facebook auth not yet implemented', received: dto };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __param(4, (0, typeorm_1.InjectRepository)(authentication_entity_1.Authentication)),
    __param(5, (0, typeorm_1.InjectRepository)(credential_entity_1.Credential)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mailer_service_1.MailerService,
        jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        cognito_service_1.CognitoService])
], AuthService);
//# sourceMappingURL=auth.service.js.map