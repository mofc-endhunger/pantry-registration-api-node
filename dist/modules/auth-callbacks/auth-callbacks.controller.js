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
exports.AuthCallbacksController = void 0;
const common_1 = require("@nestjs/common");
const auth_callbacks_service_1 = require("./auth-callbacks.service");
const facebook_auth_callback_dto_1 = require("./dto/facebook-auth-callback.dto");
let AuthCallbacksController = class AuthCallbacksController {
    constructor(authCallbacksService) {
        this.authCallbacksService = authCallbacksService;
    }
    async facebookCallback(facebookAuthCallbackDto) {
        return this.authCallbacksService.facebookCallback(facebookAuthCallbackDto);
    }
};
__decorate([
    (0, common_1.Post)('facebook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [facebook_auth_callback_dto_1.FacebookAuthCallbackDto]),
    __metadata("design:returntype", Promise)
], AuthCallbacksController.prototype, "facebookCallback", null);
AuthCallbacksController = __decorate([
    (0, common_1.Controller)('auth-callbacks'),
    __metadata("design:paramtypes", [auth_callbacks_service_1.AuthCallbacksService])
], AuthCallbacksController);
exports.AuthCallbacksController = AuthCallbacksController;
//# sourceMappingURL=auth-callbacks.controller.js.map