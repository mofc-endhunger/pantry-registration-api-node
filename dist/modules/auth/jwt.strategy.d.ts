import { Strategy } from 'passport-jwt';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private cognitoIssuer;
    private jwksUri;
    private jwks;
    constructor();
    validate(payload: any): Promise<{
        id: any;
        role: string;
        email?: undefined;
        username?: undefined;
        cognito?: undefined;
    } | {
        id: any;
        email: any;
        username: any;
        cognito: boolean;
        role?: undefined;
    } | {
        id: any;
        email: any;
        role?: undefined;
        username?: undefined;
        cognito?: undefined;
    } | null>;
}
export {};
