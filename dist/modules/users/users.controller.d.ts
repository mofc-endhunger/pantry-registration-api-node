import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<import("../../entities").User>;
    findById(id: number): Promise<import("../../entities").User>;
    findByIdentificationCode(identification_code: string): Promise<import("../../entities").User>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<import("../../entities").User>;
}
