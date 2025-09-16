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
exports.Identity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let Identity = class Identity {
};
exports.Identity = Identity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Identity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], Identity.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Identity.prototype, "provider_uid", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Identity.prototype, "provider_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Identity.prototype, "auth_hash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Identity.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Identity.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.identities),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Identity.prototype, "user", void 0);
exports.Identity = Identity = __decorate([
    (0, typeorm_1.Entity)('identities')
], Identity);
//# sourceMappingURL=identity.entity.js.map