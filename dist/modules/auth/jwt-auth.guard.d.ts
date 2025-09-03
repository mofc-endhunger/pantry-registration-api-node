declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    constructor();
    handleRequest(err: any, user: any, info: any, context: any): any;
}
export {};
