import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

console.log('[route.ts] >>> STARTING MODULE LOAD <<<');
console.log('[route.ts] Attempting to import db...');
import { db } from '@/lib/db'; // This should trigger logs in db/index.ts
console.log('[route.ts] Successfully imported db.');

import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase'; // Assuming you have this type

console.log('[route.ts] All imports completed.');

// Helper to authorize admin
async function authorizeAdmin(request: NextRequest) {
    console.log('[authorizeAdmin] Starting authorization...');
    let supabase;
    try {
        supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        const cookieValue = request.cookies.get(name)?.value;
                        // console.log(`[authorizeAdmin] Getting cookie: ${name}, Value found: ${!!cookieValue}`); // Potentially too verbose
                        return cookieValue;
                    },
                },
            }
        );
        console.log('[authorizeAdmin] Supabase client created.');
    } catch(err) {
        console.error('[authorizeAdmin] CRITICAL: Failed to create Supabase client:', err);
        throw new Error('Failed to initialize auth client.');
    }

    console.log('[authorizeAdmin] Attempting to get user from Supabase...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error('[authorizeAdmin] Supabase getUser error:', userError);
        throw new Error("Authentication error checking user.");
    }
     if (!user) {
        console.warn('[authorizeAdmin] No authenticated user found.');
        throw new Error("User is not authenticated.");
    }
    console.log(`[authorizeAdmin] User found: ${user.id}`);

    console.log(`[authorizeAdmin] Checking user role in DB for user: ${user.id}`);
    let userRecord;
    try {
        console.log(`[authorizeAdmin] Attempting db.select for user ${user.id}...`); 
        userRecord = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
        console.log(`[authorizeAdmin] DB check completed. Records found: ${userRecord.length}`);
    } catch (dbError) {
        console.error(`[authorizeAdmin] CRITICAL: Database error checking user role for ${user.id}:`, dbError);
        throw new Error("Database error during authorization.");
    }

    if (!userRecord.length || userRecord[0].role !== userRoleEnum.enumValues[0]) { // 'admin'
        console.warn(`[authorizeAdmin] User ${user.id} is not an admin. Role found: ${userRecord[0]?.role}`);
        throw new Error("User is not authorized.");
    }
    console.log(`[authorizeAdmin] SUCCESS: User ${user.id} authorized as admin.`);
    return user;
}

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
        await authorizeAdmin(request);
        console.log('[POST /api/admin/organizations] authorizeAdmin succeeded.');

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
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : message.includes('already exists') ? 409 : 500;
        console.log(`[POST /api/admin/organizations] Returning error response. Status: ${status}, Message: ${message}`);
        return NextResponse.json({ success: false, message: `Failed to create organization: ${message}` }, { status });
    }
}
console.log('[route.ts] >>> MODULE LOAD COMPLETE <<<');

// You can add other methods like GET if needed
// export async function GET(request: NextRequest) {
//    // ... implementation ...
// }
