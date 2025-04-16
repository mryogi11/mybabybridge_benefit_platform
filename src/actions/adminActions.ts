'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq, asc, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations, organization_approved_emails, users } from '@/lib/db/schema';

// --- Organization Actions ---

export async function getOrganizations() {
    try {
        const orgs = await db.select().from(organizations).orderBy(asc(organizations.name));
        return { success: true, data: orgs };
    } catch (error) {
        console.error("[AdminActions] Error fetching organizations:", error);
        return { success: false, message: "Failed to fetch organizations." };
    }
}

// --- Approved Email Actions ---

export async function getApprovedEmailsForOrg(organizationId: string) {
    try {
        if (!organizationId) throw new Error("Organization ID is required.");

        const emails = await db.select()
            .from(organization_approved_emails)
            .where(eq(organization_approved_emails.organization_id, organizationId))
            .orderBy(asc(organization_approved_emails.email));
            
        const orgData = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        const orgName = orgData[0]?.name || 'Unknown Organization';

        return { success: true, data: emails, orgName: orgName };
    } catch (error) {
        console.error(`[AdminActions] Error fetching approved emails for org ${organizationId}:`, error);
        return { success: false, message: "Failed to fetch approved emails." };
    }
}

// TODO: Add actions for deleting organizations and emails if needed. 