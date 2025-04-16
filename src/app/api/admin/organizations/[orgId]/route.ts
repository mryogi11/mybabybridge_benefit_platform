import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr'; // Restore import
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase';

// Helper to authorize admin (Simplified for Route Handlers)
// Restore authorizeAdmin function
async function authorizeAdmin(request: NextRequest) {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
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

// Schema for PUT request body - REMOVE THIS AS WELL
/*
const UpdateOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters.").optional(),
    domain: z.string().optional(),
    // Add other editable fields here if needed
});
*/

// REMOVE ENTIRE PUT HANDLER
/*
// PUT handler for /api/admin/organizations/[orgId]
// Suppress persistent type error during build (Attempt 3 - using ts-ignore)
// @ts-ignore
export async function PUT(
    request: NextRequest, 
    { params }: { params: { orgId: string } }
): Promise<NextResponse> { 
    const orgId = params.orgId;

    try {
        await authorizeAdmin(request); // Restore authorization call
        
        // Remove basic check added for debugging
        
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
        // Restore original error handling
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : 500;
        return NextResponse.json({ success: false, message: `Failed to update organization: ${message}` }, { status });
    }
}
*/

// No handlers defined in this file anymore