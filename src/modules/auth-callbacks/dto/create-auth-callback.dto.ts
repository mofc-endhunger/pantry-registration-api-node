export class CreateAuthCallbackDto {
  // Placeholder for callback data
  // Add fields as needed for the callback payload
  provider: string;
  code?: string;
  state?: string;
  accessToken?: string;
}
