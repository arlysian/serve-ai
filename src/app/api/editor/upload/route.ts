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

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurant_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'No restaurant ID provided' }, { status: 400 });
    }

    // 3. Verify Ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_ids, slug')
      .eq('id', restaurantId)
      .single();

    if (!restaurant || !restaurant.owner_ids?.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Validate File
    const validTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images and videos are allowed.' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit (increased for videos)
      return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 });
    }

    // 5. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Use restaurant slug as bucket name
    const BUCKET_NAME = restaurant.slug;

    // Check if bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === BUCKET_NAME)) {
        await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: validTypes
        });
    }

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload. Ensure bucket "${BUCKET_NAME}" exists.` }, { status: 500 });
    }

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

