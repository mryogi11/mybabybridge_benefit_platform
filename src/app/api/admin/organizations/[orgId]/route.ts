import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase';

// Helper to authorize admin (Simplified for Route Handlers)
async function authorizeAdmin(request: NextRequest) {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                // set and remove are handled by the route handler if needed
            },
        }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error("User is not authenticated.");
    }
    const userRecord = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!userRecord.length || userRecord[0].role !== userRoleEnum.enumValues[0]) { // 'admin'
        throw new Error("User is not authorized.");
    }
    return user;
}

// Schema for PUT request body
const UpdateOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters.").optional(),
    domain: z.string().optional(),
    // Add other editable fields here if needed
});

// PUT handler for /api/admin/organizations/[orgId]
export async function PUT(request: NextRequest, { params }: { params: { orgId: string } }) {
    const orgId = params.orgId;

    try {
        await authorizeAdmin(request);
        
        const reqBody = await request.json();
        const validation = UpdateOrganizationSchema.safeParse(reqBody);

        if (!validation.success) {
            return NextResponse.json({ success: false, message: "Invalid request data", errors: validation.error.format() }, { status: 400 });
        }
        const { name, domain } = validation.data;

        // Build update object only with provided fields
        const updateData: Partial<typeof organizations.$inferInsert> = {};
        if (name !== undefined) updateData.name = name;
        if (domain !== undefined) updateData.domain = domain || null; // Store null if empty string provided
        
        if (Object.keys(updateData).length === 0) {
             return NextResponse.json({ success: false, message: "No fields provided for update."}, { status: 400 });
        }

        updateData.updated_at = new Date(); // Update timestamp

        const updatedOrg = await db.update(organizations)
            .set(updateData)
            .where(eq(organizations.id, orgId))
            .returning();

        if (updatedOrg.length === 0) {
            return NextResponse.json({ success: false, message: "Organization not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedOrg[0], message: "Organization updated successfully." });

    } catch (error) {
        console.error(`[API /admin/organizations PUT ${orgId}] Error:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : 500;
        return NextResponse.json({ success: false, message: `Failed to update organization: ${message}` }, { status });
    }
}

// DELETE handler for /api/admin/organizations/[orgId]
export async function DELETE(request: NextRequest, { params }: { params: { orgId: string } }) {
    const orgId = params.orgId;

    try {
        await authorizeAdmin(request);

        // Add checks here if needed: e.g., cannot delete org with active users/contracts
        // You might need to query related tables first.

        // Perform deletion
        const deletedOrg = await db.delete(organizations)
            .where(eq(organizations.id, orgId))
            .returning({ id: organizations.id }); // Return ID to confirm deletion
            
        if (deletedOrg.length === 0) {
            return NextResponse.json({ success: false, message: "Organization not found." }, { status: 404 });
        }

        // TODO: Consider cascading deletes or cleanup for related records 
        // (e.g., organization_approved_emails, users linked to this org)
        console.log(`[API /admin/organizations DELETE] Successfully deleted org ${orgId}`);

        return NextResponse.json({ success: true, message: "Organization deleted successfully." });

    } catch (error) {
        console.error(`[API /admin/organizations DELETE ${orgId}] Error:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : 500;
        // Handle potential foreign key constraint errors if delete fails due to dependencies
        if (message.includes('violates foreign key constraint')) {
             return NextResponse.json({ success: false, message: `Cannot delete organization: It is still referenced by other records (e.g., users, emails).` }, { status: 409 }); // 409 Conflict
        }
        return NextResponse.json({ success: false, message: `Failed to delete organization: ${message}` }, { status });
    }
} 