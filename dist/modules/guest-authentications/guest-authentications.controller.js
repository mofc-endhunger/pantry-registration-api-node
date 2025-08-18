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
exports.GuestAuthenticationsController = void 0;
const common_1 = require("@nestjs/common");
const guest_authentications_service_1 = require("./guest-authentications.service");
const create_guest_authentication_dto_1 = require("./dto/create-guest-authentication.dto");
let GuestAuthenticationsController = class GuestAuthenticationsController {
    constructor(guestAuthenticationsService) {
        this.guestAuthenticationsService = guestAuthenticationsService;
    }
    async create(createGuestAuthenticationDto) {
        return this.guestAuthenticationsService.createGuest(createGuestAuthenticationDto);
    }
};
exports.GuestAuthenticationsController = GuestAuthenticationsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_guest_authentication_dto_1.CreateGuestAuthenticationDto]),
    __metadata("design:returntype", Promise)
], GuestAuthenticationsController.prototype, "create", null);
exports.GuestAuthenticationsController = GuestAuthenticationsController = __decorate([
    (0, common_1.Controller)('guest-authentications'),
    __metadata("design:paramtypes", [guest_authentications_service_1.GuestAuthenticationsService])
], GuestAuthenticationsController);
//# sourceMappingURL=guest-authentications.controller.js.map