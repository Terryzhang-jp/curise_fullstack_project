export interface Product {
  id: number;
  name: string;
  code: string;
  category_id: number;
  country_id: number;
  supplier_id?: number;
  unit: string;
  price: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    name: string | null;
  } | null;
  country?: {
    name: string | null;
  } | null;
  supplier?: {
    name: string | null;
  } | null;
  effective_from?: string;
  effective_to?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Country {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface TableRow {
  original: Product;
} 