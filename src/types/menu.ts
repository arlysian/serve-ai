export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  owner_ids?: string[];
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    text_color?: string;
    card_color?: string;
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
  // Note: menu_items table doesn't have name_native, only menu_sections does
  description?: string;
  description_native?: string;
  price: number;
  allergens?: string[];
  allergens_native?: string[];
  tags?: string[];
  tags_native?: string[];
  image_url?: string;
}

export interface MenuSection {
  id: string;
  name: string;
  name_native?: string;
  position: number;
  items: MenuItem[];
}
