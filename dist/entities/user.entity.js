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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const user_detail_entity_1 = require("./user-detail.entity");
const authentication_entity_1 = require("./authentication.entity");
const identity_entity_1 = require("./identity.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "identification_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "credential_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: ['guest', 'customer'] }),
    __metadata("design:type", String)
], User.prototype, "user_type", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_detail_entity_1.UserDetail, (detail) => detail.user),
    (0, typeorm_1.JoinColumn)({ name: 'user_detail_id' }),
    __metadata("design:type", user_detail_entity_1.UserDetail)
], User.prototype, "user_detail", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => authentication_entity_1.Authentication, (auth) => auth.user),
    __metadata("design:type", Array)
], User.prototype, "authentications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => identity_entity_1.Identity, (identity) => identity.user),
    __metadata("design:type", Array)
], User.prototype, "identities", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updated_at", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map