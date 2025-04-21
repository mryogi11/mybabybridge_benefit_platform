import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';

// Schema for POST request body (using Zod)
const AddOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters."),
    domain: z.string().optional(),
});

// POST handler for /api/admin/organizations
export async function POST(request: NextRequest): Promise<NextResponse> {
    console.log('[POST /api/admin/organizations] Handler invoked.');
    // Log the DATABASE_URL value seen by the function runtime
    console.log(`[POST /api/admin/organizations] Runtime DATABASE_URL length: ${process.env.DATABASE_URL?.length ?? 0}`);

    try {
        console.log('[POST /api/admin/organizations] Calling authorizeAdmin...');
        // Call the imported helper and check the result
        const { authorized, user, error: authError } = await authorizeAdmin(request);
        if (!authorized) {
            console.warn(`[POST /api/admin/organizations] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ success: false, message: authError || 'Unauthorized' }, { status });
        }
        console.log(`[POST /api/admin/organizations] authorizeAdmin succeeded for user ${user?.id}.`);

        console.log('[POST /api/admin/organizations] Parsing request body...');
        const reqBody = await request.json();
        console.log('[POST /api/admin/organizations] Parsing complete. Validating schema...');
        const validation = AddOrganizationSchema.safeParse(reqBody);

        if (!validation.success) {
            console.warn('[POST /api/admin/organizations] Schema validation failed:', validation.error.format());
            return NextResponse.json({ success: false, message: "Invalid request data", errors: validation.error.format() }, { status: 400 });
        }
        const { name, domain } = validation.data;
        console.log(`[POST /api/admin/organizations] Validation succeeded. Name: ${name}, Domain: ${domain}`);

        console.log(`[POST /api/admin/organizations] Checking for existing organization with name: ${name}`);
        const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, name)).limit(1);
        if (existingOrg.length > 0) {
             console.warn(`[POST /api/admin/organizations] Conflict: Organization name '${name}' already exists.`);
            return NextResponse.json({ success: false, message: `Organization name '${name}' already exists.` }, { status: 409 }); // 409 Conflict
        }
        console.log(`[POST /api/admin/organizations] No existing organization found. Proceeding with insert...`);

        const newOrg = await db.insert(organizations).values({
            name: name,
            domain: domain || null, // Ensure null is inserted if domain is empty/undefined
        }).returning();

        if (newOrg.length === 0) {
             console.error('[POST /api/admin/organizations] CRITICAL: Insert seemed successful but returned no record.');
            throw new Error("Failed to create organization record after insert.")
        }
        console.log(`[POST /api/admin/organizations] SUCCESS: Organization created with ID: ${newOrg[0].id}`);

        return NextResponse.json({ success: true, data: newOrg[0], message: "Organization created successfully." }, { status: 201 });

    } catch (error) {
        console.error(`[POST /api/admin/organizations] CRITICAL ERROR in handler:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message.includes('already exists') ? 409 : 500;
        console.log(`[POST /api/admin/organizations] Returning error response. Status: ${status}, Message: ${message}`);
        return NextResponse.json({ success: false, message: `Failed to create organization: ${message}` }, { status });
    }
}

// GET handler for /api/admin/organizations
export async function GET(request: NextRequest): Promise<NextResponse> {
    console.log('[GET /api/admin/organizations] Handler invoked.');
    try {
        const { authorized, user, error: authError } = await authorizeAdmin(request);
        if (!authorized) {
            console.warn(`[GET /api/admin/organizations] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ success: false, message: authError || 'Unauthorized' }, { status });
        }
        console.log(`[GET /api/admin/organizations] User ${user?.id} authorized. Fetching organizations...`);

        const orgs = await db.select().from(organizations).orderBy(organizations.name);
        console.log(`[GET /api/admin/organizations] Found ${orgs.length} organizations.`);
        return NextResponse.json({ success: true, data: orgs }, { status: 200 });

    } catch (error) {
        console.error(`[GET /api/admin/organizations] CRITICAL ERROR in handler:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ success: false, message: `Failed to fetch organizations: ${message}` }, { status: 500 });
    }
}

// You can add other methods like GET if needed
// export async function GET(request: NextRequest) {
//    // ... implementation ...
// }
