import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    create(createUserDto: CreateUserDto): Promise<User>;
    findById(id: number): Promise<User>;
    findByIdentificationCode(identification_code: string): Promise<User>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<User>;
}
