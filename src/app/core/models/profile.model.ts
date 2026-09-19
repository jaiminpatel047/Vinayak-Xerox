export interface Profile {
  id: string;
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileChanges = Pick<Profile, 'full_name' | 'shop_name' | 'phone'>;
