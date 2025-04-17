import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase'; // Assuming you have this type

// Helper to authorize admin (reusing the one from dynamic route, ensure it's correct)
// NOTE: This relies on the db instance being initialized correctly based on process.env.DATABASE_URL
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

// Schema for POST request body (using Zod)
const AddOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters."),
    domain: z.string().optional(),
});

// POST handler for /api/admin/organizations
export async function POST(request: NextRequest): Promise<NextResponse> {
    // Log the DATABASE_URL value seen by the function runtime
    console.log(`[API /admin/organizations POST] Runtime DATABASE_URL: ${process.env.DATABASE_URL}`);

    try {
        await authorizeAdmin(request);

        // 2. Parse Request Body
        const reqBody = await request.json();
        const validation = AddOrganizationSchema.safeParse(reqBody);

        if (!validation.success) {
            // Use .format() for more detailed Zod errors
            return NextResponse.json({ success: false, message: "Invalid request data", errors: validation.error.format() }, { status: 400 });
        }
        const { name, domain } = validation.data;

        // Check if organization name already exists
        const existingOrg = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, name)).limit(1);
        if (existingOrg.length > 0) {
            return NextResponse.json({ success: false, message: `Organization name '${name}' already exists.` }, { status: 409 }); // 409 Conflict
        }

        // 3. Insert into Database
        const newOrg = await db.insert(organizations).values({
            name: name,
            domain: domain || null, // Ensure null is inserted if domain is empty/undefined
        }).returning();

        // Note: revalidatePath does not work reliably in API Routes.
        // Frontend relies on optimistic update or full refresh.

        return NextResponse.json({ success: true, data: newOrg[0], message: "Organization added successfully." }, { status: 201 });

    } catch (error) {
        console.error(`[API /admin/organizations POST] Error:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : message.includes('already exists') ? 409 : 500;
        return NextResponse.json({ success: false, message: `Failed to add organization: ${message}` }, { status });
    }
}

// You can add other methods like GET if needed
// export async function GET(request: NextRequest) {
//    // ... implementation ...
// }
