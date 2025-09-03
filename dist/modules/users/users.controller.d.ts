import { AuthenticatedRequest } from '../../types/authenticated-request';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    getPublic(): {
        status: string;
    };
    constructor(usersService: UsersService);
    show(req: AuthenticatedRequest): Promise<import("../../entities").User>;
    create(req: AuthenticatedRequest, createUserDto: CreateUserDto): Promise<import("../../entities").User>;
    findById(req: AuthenticatedRequest, id: number): Promise<import("../../entities").User>;
    findByIdentificationCode(req: AuthenticatedRequest, identification_code: string): Promise<import("../../entities").User>;
    update(req: AuthenticatedRequest, updateUserDto: UpdateUserDto): Promise<import("../../entities").User>;
}
