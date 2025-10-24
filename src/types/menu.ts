export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  theme?: {
    primary_color?: string;
    secondary_color?: string;
  };
  contact?: {
    phone?: string;
    address?: string;
  };
}

export interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description?: string;
  price: number;
  allergens?: string[];
  image_url?: string;
}

export interface MenuSection {
  id: string;
  name: string;
  position: number;
  items: MenuItem[];
}