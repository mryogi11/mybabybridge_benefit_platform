import { NextRequest, NextResponse } from 'next/server';
// Remove cookies import if not used directly here
// import { cookies } from 'next/headers';
// Remove createServerClient import, it's used within authorizeAdmin
// import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema'; // Removed users, userRoleEnum as they were only used in the deleted local authorizeAdmin
// Remove Database type import if not used directly here
// import type { Database } from '@/types/supabase';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';

// Schema for updating an organization
const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional().nullable(),
});

// GET handler to fetch a single organization
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
    // Await the params object
    const { orgId } = await params;
    console.log(`GET /api/admin/organizations/${orgId} request received`);

    if (!orgId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Authorize admin
    const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
    console.log(`GET Auth Result for org ${orgId}: authorized=${authorized}, error=${authError}`);
    if (!authorized || !adminUser) {
        console.error(`Authorization failed: ${authError}`);
        return NextResponse.json({ error: authError || 'Forbidden' }, { status: authError === 'User not authenticated' ? 401 : 403 });
    }

    try {
        const orgData = await db.query.organizations.findFirst({
            where: eq(organizations.id, orgId),
        });

        if (!orgData) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        console.log(`Organization ${orgId} fetched successfully by admin ${adminUser.email}.`);
        return NextResponse.json({ success: true, data: orgData });

    } catch (error: any) {
        console.error(`Error fetching organization ${orgId}:`, error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// PUT handler to update an organization
export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
    // Await the params object
    const { orgId } = await params;
    console.log(`PUT /api/admin/organizations/${orgId} request received`);

    if (!orgId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Authorize admin
    const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
    console.log(`PUT Auth Result for org ${orgId}: authorized=${authorized}, error=${authError}, user=${adminUser?.email}`);
    if (!authorized || !adminUser) {
        console.error(`Authorization failed: ${authError}`);
        return NextResponse.json({ error: authError || 'Forbidden' }, { status: authError === 'User not authenticated' ? 401 : 403 });
    }
    console.log(`Admin ${adminUser.email} authorized for PUT on org ${orgId}`);

    let updatedData;
    try {
        updatedData = await req.json();
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate payload
    const validation = UpdateOrganizationSchema.safeParse(updatedData);
    if (!validation.success) {
        console.error('Organization update validation failed:', validation.error.flatten());
        return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
    }

    const dataToUpdate = validation.data;
    if (Object.keys(dataToUpdate).length === 0) {
         return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }
    console.log('Validated data for update:', dataToUpdate);

    try {
        // Check if org exists first
        const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
        if (existingOrg.length === 0) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const result = await db
            .update(organizations)
            .set({
                ...dataToUpdate,
                updated_at: new Date(),
            })
            .where(eq(organizations.id, orgId))
            .returning();

        if (result.length === 0) {
            console.error(`Failed to update organization ${orgId} after validation.`);
            return NextResponse.json({ error: 'Update failed after validation. Organization might have been deleted concurrently.' }, { status: 404 });
        }

        console.log(`Organization ${orgId} updated successfully by admin ${adminUser.email}.`);
        return NextResponse.json({ success: true, data: result[0] });

    } catch (error: any) {
        console.error(`Error updating organization ${orgId}:`, error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// DELETE handler to remove an organization
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
    // Await the params object
    const { orgId } = await params;
    console.log(`DELETE /api/admin/organizations/${orgId} request received`);

    if (!orgId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Authorize admin
    const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
    console.log(`DELETE Auth Result for org ${orgId}: authorized=${authorized}, error=${authError}`);
    if (!authorized || !adminUser) {
        console.error(`Authorization failed: ${authError}`);
        return NextResponse.json({ error: authError || 'Forbidden' }, { status: authError === 'User not authenticated' ? 401 : 403 });
    }
    console.log(`Admin ${adminUser.email} authorized for DELETE on org ${orgId}`);

    try {
        // Check if the organization exists before attempting delete
        const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
        if (existingOrg.length === 0) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Perform deletion
        const result = await db.delete(organizations).where(eq(organizations.id, orgId)).returning({ id: organizations.id });

        if (result.length === 0) {
            console.warn(`Organization ${orgId} not found during delete operation, possibly deleted concurrently.`);
            return NextResponse.json({ error: 'Organization not found, may have been deleted already' }, { status: 404 });
        }

        console.log(`Organization ${orgId} deleted successfully by admin ${adminUser.email}.`);
        return NextResponse.json({ success: true, message: `Organization ${orgId} deleted successfully` });

    } catch (error: any) {
        console.error(`Error deleting organization ${orgId}:`, error);
        if (error.code === '23503') { // Foreign key violation
             console.error(`Attempted to delete organization ${orgId} with associated records (e.g., users, approved emails).`);
             return NextResponse.json({ error: 'Cannot delete organization with associated records. Please remove them first.' }, { status: 409 }); // 409 Conflict
        }
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}