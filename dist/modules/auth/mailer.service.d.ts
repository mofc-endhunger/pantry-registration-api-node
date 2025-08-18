export declare class MailerService {
    private transporter;
    constructor();
    sendResetEmail(to: string, token: string): Promise<void>;
}
