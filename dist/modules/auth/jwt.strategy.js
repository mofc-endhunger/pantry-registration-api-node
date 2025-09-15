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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const constants_1 = require("./constants");
const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor() {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request, rawJwtToken, done) => {
                try {
                    const decoded = jwt.decode(rawJwtToken, { complete: true });
                    if (decoded && decoded.payload && decoded.payload.iss && decoded.payload.iss.startsWith('https://cognito-idp')) {
                        const kid = decoded.header.kid;
                        this.jwks.getSigningKey(kid, (err, key) => {
                            if (err)
                                return done(err);
                            if (!key)
                                return done(new Error('No signing key found'));
                            const signingKey = key.getPublicKey();
                            return done(null, signingKey);
                        });
                    }
                    else {
                        return done(null, constants_1.jwtConstants.secret);
                    }
                }
                catch (err) {
                    return done(err);
                }
            },
        });
        this.cognitoIssuer = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
        this.jwksUri = `${this.cognitoIssuer}/.well-known/jwks.json`;
        this.jwks = jwksClient({ jwksUri: this.jwksUri });
    }
    async validate(payload) {
        console.log('JwtStrategy.validate called with payload:', payload);
        if (!payload) {
            console.log('JwtStrategy.validate: payload is undefined or null');
            return null;
        }
        if (payload.role === 'guest') {
            return { id: payload.sub, role: 'guest' };
        }
        if (payload.iss && payload.iss.startsWith('https://cognito-idp')) {
            return { id: payload.sub, email: payload.email, username: payload.username, cognito: true };
        }
        if (!payload.sub) {
            console.log('JwtStrategy.validate: payload.sub is missing');
            return null;
        }
        return { id: payload.sub, email: payload.email };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map