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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const dns = require("dns");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let UsersController = class UsersController {
    getPublic() {
        return { status: 'ok' };
    }
    async dnsTest() {
        return new Promise((resolve) => {
            dns.lookup('cognito-idp.us-east-2.amazonaws.com', (err, address) => {
                resolve({ err: err ? err.message : null, address });
            });
        });
    }
    constructor(usersService) {
        this.usersService = usersService;
    }
    async show(req) {
        console.log('GET /api/user req.user:', req.user);
        if (!req.user)
            throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.UNAUTHORIZED);
        return req.user;
    }
    async create(req, createUserDto) {
        console.log('POST /api/user req.user:', req.user);
        return this.usersService.create(createUserDto);
    }
    async findById(req, id) {
        console.log('GET /api/user/:id req.user:', req.user);
        return this.usersService.findById(id);
    }
    async findByIdentificationCode(req, identification_code) {
        console.log('GET /api/user/identification/:identification_code req.user:', req.user);
        return this.usersService.findByIdentificationCode(identification_code);
    }
    async update(req, updateUserDto) {
        console.log('PATCH /api/user req.user:', req.user);
        const userId = updateUserDto.id || 1;
        return this.usersService.update(userId, updateUserDto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('test-public'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getPublic", null);
__decorate([
    (0, common_1.Get)('dns-test'),
    (0, swagger_1.ApiOperation)({ summary: 'Test DNS resolution for Cognito endpoint' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "dnsTest", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Current user profile' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "show", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Created user' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by id' }),
    (0, swagger_1.ApiOkResponse)({ description: 'User by id' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findById", null);
__decorate([
    (0, common_1.Get)('identification/:identification_code'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by identification code' }),
    (0, swagger_1.ApiOkResponse)({ description: 'User by identification code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('identification_code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findByIdentificationCode", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Updated user profile' }),
    (0, swagger_1.ApiUnauthorizedResponse)({ description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('user'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.Controller)('api/user'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map