import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Generate a URL-safe slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}

// Generate a unique slug by appending numbers if needed
async function getUniqueSlug(supabase: any, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    // Safety check
    if (counter > 100) {
      // Use random suffix
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      break;
    }
  }
  
  return slug;
}

// GET: Get user's organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization membership
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization:organizations (
          id,
          name,
          slug,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ organization: null });
    }

    return NextResponse.json({
      organization: membership.organization,
      role: membership.role
    });

  } catch (error: any) {
    console.error('Get organization error:', error);
    return NextResponse.json(
      { error: 'Failed to get organization' },
      { status: 500 }
    );
  }
}

// POST: Create a new organization
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has an organization
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You already belong to an organization' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Organization name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Organization name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = generateSlug(name.trim());
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Organization name must contain valid characters' },
        { status: 400 }
      );
    }
    
    const slug = await getUniqueSlug(supabase, baseSlug);

    // Create organization
    const { data: org, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        slug
      })
      .select()
      .single();

    if (createError) {
      console.error('Create org error:', createError);
      throw new Error('Failed to create organization');
    }

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'admin',
        invited_by: user.id,
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Add member error:', memberError);
      // Try to clean up the org we just created
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error('Failed to add you to the organization');
    }

    return NextResponse.json({
      organization: org,
      message: 'Organization created successfully'
    });

  } catch (error: any) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}

// PATCH: Update organization
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not belong to an organization' },
        { status: 400 }
      );
    }

    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update organization settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug: newSlug } = body;

    const updates: any = { updated_at: new Date().toISOString() };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Organization name must be at least 2 characters' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (newSlug !== undefined) {
      const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (cleanSlug.length < 2) {
        return NextResponse.json(
          { error: 'Slug must be at least 2 characters' },
          { status: 400 }
        );
      }
      
      // Check if slug is available
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', membership.organization_id)
        .single();
      
      if (existingOrg) {
        return NextResponse.json(
          { error: 'This slug is already taken' },
          { status: 400 }
        );
      }
      
      updates.slug = cleanSlug;
    }

    const { data: org, error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', membership.organization_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      organization: org,
      message: 'Organization updated successfully'
    });

  } catch (error: any) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// DELETE: Delete organization (danger zone)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not belong to an organization' },
        { status: 400 }
      );
    }

    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete the organization' },
        { status: 403 }
      );
    }

    // Delete organization (will cascade to members, invites, etc.)
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', membership.organization_id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Organization deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete organization' },
      { status: 500 }
    );
  }
}























