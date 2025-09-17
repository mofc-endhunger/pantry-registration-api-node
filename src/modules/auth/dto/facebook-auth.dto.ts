import { ApiProperty } from '@nestjs/swagger';

export class FacebookAuthDto {
  @ApiProperty()
  userID!: string;

  @ApiProperty()
  graphDomain!: string;

  @ApiProperty()
  accessToken!: string;
}
