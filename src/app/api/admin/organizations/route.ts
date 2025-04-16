import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase'; // Assuming you have this type

// Schema for POST request body (using Zod)
const AddOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters."),
    domain: z.string().optional(),
});

// POST handler for /api/admin/organizations
export async function POST(request: NextRequest) {
    // Await the cookie store
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // Use the awaited cookieStore
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    // Use the awaited cookieStore
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    // Use the awaited cookieStore
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );

    try {
        // 1. Authorize Admin using getUser() for stronger verification
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("[API /admin/organizations POST] Auth Error:", userError);
            return NextResponse.json({ success: false, message: "User is not authenticated." }, { status: 401 });
        }
        
        // Fetch user role from DB using the verified user ID
        const userRecord = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
        if (!userRecord.length || userRecord[0].role !== userRoleEnum.enumValues[0]) { // Check if role is 'admin'
            return NextResponse.json({ success: false, message: "User is not authorized." }, { status: 403 });
        }

        // 2. Parse Request Body
        const reqBody = await request.json();
        const validation = AddOrganizationSchema.safeParse(reqBody);

        if (!validation.success) {
            // Use .format() for more detailed Zod errors
            return NextResponse.json({ success: false, message: "Invalid request data", errors: validation.error.format() }, { status: 400 });
        }
        const { name, domain } = validation.data;

        // 3. Insert into Database
        const newOrg = await db.insert(organizations).values({
            name: name,
            domain: domain || null, // Ensure null is inserted if domain is empty/undefined
        }).returning();

        // Note: revalidatePath does not work reliably in API Routes.
        // Frontend relies on optimistic update or full refresh.

        return NextResponse.json({ success: true, data: newOrg[0], message: "Organization added successfully." }, { status: 201 });

    } catch (error) {
        console.error("[API /admin/organizations POST] Error:", error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        // Handle specific DB errors if needed (e.g., unique constraint)
        return NextResponse.json({ success: false, message: `Failed to add organization: ${message}` }, { status: 500 });
    }
}

// You can add other methods like GET if needed
// export async function GET(request: NextRequest) {
//    // ... implementation ...
// }
