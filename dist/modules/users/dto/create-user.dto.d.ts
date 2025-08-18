export declare class CreateUserDto {
    user_type: string;
    identification_code: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    suffix?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    license_plate?: string;
    seniors_in_household?: number;
    adults_in_household?: number;
    children_in_household?: number;
    permission_to_email?: boolean;
    permission_to_text?: boolean;
    date_of_birth?: string;
    credential_id?: number;
    user_detail_id?: number;
}
