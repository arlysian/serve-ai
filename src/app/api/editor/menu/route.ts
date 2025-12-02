import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // 2. Verify Ownership
    // const restaurantId = data.restaurant_id || data.section_id; // Depends on action context
    
    // We need to find the restaurant_id differently based on what we are operating on
    let targetRestaurantId = '';

    if (action.includes('section')) {
       if (action === 'create_section') {
          targetRestaurantId = data.restaurant_id;
       } else {
          // For update/delete section, we need to fetch the section to get the restaurant_id
          const { data: section } = await supabase
            .from('menu_sections')
            .select('restaurant_id')
            .eq('id', data.id)
            .single();
          targetRestaurantId = section?.restaurant_id;
       }
    } else if (action.includes('item')) {
       if (action === 'create_item') {
          // We have section_id, need to get restaurant_id
          const { data: section } = await supabase
             .from('menu_sections')
             .select('restaurant_id')
             .eq('id', data.section_id)
             .single();
          targetRestaurantId = section?.restaurant_id;
       } else {
          // For update/delete item
          const { data: item } = await supabase
            .from('menu_items')
            .select('menu_sections(restaurant_id)')
            .eq('id', data.id)
            .single();
            // @ts-expect-error - Supabase type inference for nested relations can be tricky
          targetRestaurantId = item?.menu_sections?.restaurant_id;
       }
    }

    if (!targetRestaurantId) {
       return NextResponse.json({ error: 'Could not determine restaurant context' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_ids')
      .eq('id', targetRestaurantId)
      .single();

    if (!restaurant || !restaurant.owner_ids?.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Perform Action
    let result;
    let error;

    switch (action) {
      case 'create_section':
        ({ data: result, error } = await supabase
          .from('menu_sections')
          .insert({
            restaurant_id: data.restaurant_id,
            name: data.name,
            name_native: data.name_native,
            position: data.position,
          })
          .select()
          .single());
        break;

      case 'update_section':
        ({ error } = await supabase
          .from('menu_sections')
          .update({
            name: data.name,
            name_native: data.name_native,
          })
          .eq('id', data.id));
        break;

      case 'delete_section':
        ({ error } = await supabase
          .from('menu_sections')
          .delete()
          .eq('id', data.id));
        break;

      case 'create_item':
        ({ data: result, error } = await supabase
          .from('menu_items')
          .insert({
            section_id: data.section_id,
            name: data.name,
            description: data.description,
            description_native: data.description_native,
            price: data.price,
            image_url: data.image_url,
            allergens: data.allergens,
            tags: data.tags,
          })
          .select()
          .single());
        break;

      case 'update_item':
        ({ error } = await supabase
          .from('menu_items')
          .update({
            name: data.name,
            description: data.description,
            description_native: data.description_native,
            price: data.price,
            image_url: data.image_url,
            allergens: data.allergens,
            tags: data.tags,
          })
          .eq('id', data.id));
        break;

      case 'delete_item':
        ({ error } = await supabase
          .from('menu_items')
          .delete()
          .eq('id', data.id));
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save changes. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (err: unknown) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}

