export interface Fragrance {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface FragranceInput {
  name: string;
  description: string;
  category: string;
}
