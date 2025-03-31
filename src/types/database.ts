export interface Profile {
  id: string;
  user_name: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  pin_hash?: string;
  encrypted_credentials?: string;
} 