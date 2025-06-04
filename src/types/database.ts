
export interface Profile {
  id: string;
  user_name: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  is_core?: boolean;
  pin_hash?: string;
  encrypted_credentials?: string;
}

export interface PaymentRequest {
  id: string;
  day_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
}
