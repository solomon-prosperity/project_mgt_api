export interface IJwtPayload {
  user_id: string;
  org_id: string;
  role_id: string;
  role_name: string;
  jti: string;
  env: string;
  iat: number;
}

export interface IValidatePasswordResetToken {
  is_token_valid: boolean;
  user_id: string;
}
