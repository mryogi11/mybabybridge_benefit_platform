import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organization_approved_emails, users, userRoleEnum } from '@/lib/db/schema';
import type { Database } from '@/types/supabase'; // Assuming you have this type
import { createActivityLog } from '@/lib/actions/loggingActions';

// Helper to authorize admin (using the corrected version)
async function authorizeAdmin(request: NextRequest) {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value; },
                // Set/remove not needed for simple auth check
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

// Schema for POST request body
const AddApprovedEmailSchema = z.object({
    organizationId: z.string().uuid("Invalid Organization ID."),
    email: z.string().email("Invalid email format."),
});

// POST handler for /api/admin/organizations/emails
export async function POST(request: NextRequest) {
    let orgId = '';
    let email = '';
    try {
        await authorizeAdmin(request); 
        const reqBody = await request.json();
        const validation = AddApprovedEmailSchema.safeParse(reqBody);
        if (!validation.success) {
            await createActivityLog({
                actionType: 'ORG_APPROVED_EMAIL_ADD_VALIDATION_FAILURE',
                status: 'FAILURE',
                description: 'Validation failed for adding approved email.',
                details: { errors: validation.error.format(), reqBody }
            });
            return NextResponse.json({ success: false, message: "Invalid request data", errors: validation.error.format() }, { status: 400 });
        }
        orgId = validation.data.organizationId;
        email = validation.data.email;
        const newEmail = await db.insert(organization_approved_emails).values({
            organization_id: orgId,
            email: email.toLowerCase(), 
        }).returning();
        await createActivityLog({
            actionType: 'ORG_APPROVED_EMAIL_ADD',
            status: 'SUCCESS',
            description: `Approved email ${email} added to org ${orgId}.`,
            details: { orgId, email, newEmail }
        });
        return NextResponse.json({ success: true, data: newEmail[0], message: "Approved email added successfully." }, { status: 201 });
    } catch (error) {
        console.error(`[API /admin/orgs/emails POST] Error for org ${orgId}:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : 500;
        if (message.includes('duplicate key value violates unique constraint')) {
            await createActivityLog({
                actionType: 'ORG_APPROVED_EMAIL_ADD_DUPLICATE',
                status: 'FAILURE',
                description: `Attempted to add duplicate approved email for org ${orgId}.`,
                details: { orgId, email }
            });
            return NextResponse.json({ success: false, message: "This email address is already approved for this organization." }, { status: 409 });
        }
        await createActivityLog({
            actionType: 'ORG_APPROVED_EMAIL_ADD_FAILURE',
            status: 'FAILURE',
            description: `Failed to add approved email for org ${orgId}. Error: ${message}`,
            details: { orgId, error: message }
        });
        return NextResponse.json({ success: false, message: `Failed to add approved email: ${message}` }, { status });
    }
}

// --- NEW DELETE Handler --- 

// Schema for DELETE request body
const DeleteApprovedEmailSchema = z.object({
    organizationId: z.string().uuid("Invalid Organization ID."), // Keep orgId for context/safety
    emailId: z.string().uuid("Invalid Email Record ID."), // Use the unique ID of the email record
});

export async function DELETE(request: NextRequest) {
    let orgId = '';
    let emailId = '';
    try {
        await authorizeAdmin(request);
        
        // DELETE request might have body (though often uses query params or path params)
        // Let's assume body for consistency here
        const reqBody = await request.json();
        const validation = DeleteApprovedEmailSchema.safeParse(reqBody);
        
        if (!validation.success) {
            await createActivityLog({
                actionType: 'ORG_APPROVED_EMAIL_DELETE_VALIDATION_FAILURE',
                status: 'FAILURE',
                description: 'Validation failed for deleting approved email.',
                details: { errors: validation.error.format(), reqBody }
            });
            return NextResponse.json({ success: false, message: "Invalid request data for deletion", errors: validation.error.format() }, { status: 400 });
        }
        
        orgId = validation.data.organizationId;
        emailId = validation.data.emailId;

        // Perform deletion using the unique email record ID
        const deletedEmail = await db.delete(organization_approved_emails)
            .where(eq(organization_approved_emails.id, emailId))
            // Optional extra safety check: Ensure it belongs to the correct org? 
            // .where(and(eq(organization_approved_emails.id, emailId), eq(organization_approved_emails.organization_id, orgId)))
            .returning({ id: organization_approved_emails.id });
            
        if (deletedEmail.length === 0) {
            await createActivityLog({
                actionType: 'ORG_APPROVED_EMAIL_DELETE_NOT_FOUND',
                status: 'FAILURE',
                description: `Approved email record ${emailId} not found for org ${orgId}.`,
                details: { orgId, emailId }
            });
            return NextResponse.json({ success: false, message: "Approved email record not found." }, { status: 404 });
        }

        await createActivityLog({
            actionType: 'ORG_APPROVED_EMAIL_DELETE',
            status: 'SUCCESS',
            description: `Approved email ${emailId} deleted from org ${orgId}.`,
            details: { orgId, emailId, deletedEmail }
        });
        return NextResponse.json({ success: true, message: "Approved email deleted successfully." });

    } catch (error) {
        console.error(`[API /admin/orgs/emails DELETE] Error for org ${orgId}, email ${emailId}:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        const status = message === "User is not authenticated." ? 401 : message === "User is not authorized." ? 403 : 500;
        await createActivityLog({
            actionType: 'ORG_APPROVED_EMAIL_DELETE_FAILURE',
            status: 'FAILURE',
            description: `Failed to delete approved email ${emailId} for org ${orgId}. Error: ${message}`,
            details: { orgId, emailId, error: message }
        });
        return NextResponse.json({ success: false, message: `Failed to delete approved email: ${message}` }, { status });
    }
}

// TODO: Add GET handler if needed 