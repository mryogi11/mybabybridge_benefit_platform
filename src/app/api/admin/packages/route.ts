import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { packages, packageTierEnum, organization_packages, organizations } from '@/lib/db/schema';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { eq, and, leftJoin } from 'drizzle-orm';

// Zod schema for creating a package
const CreatePackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  tier: z.enum(packageTierEnum.enumValues), // Validate against the enum values
  monthly_cost: z.number().min(0, 'Monthly cost cannot be negative'),
  description: z.string().optional(),
  key_benefits: z.array(z.string()).optional().default([]), // Array of strings, default to empty
  is_base_employer_package: z.boolean().default(false),
  organization_id: z.string().uuid('Valid Organization ID is required'), // Add organization_id
});

// GET handler to fetch all packages with their linked organization
export async function GET(req: NextRequest) {
    try {
        // Authorize Admin using the imported helper
        const { authorized, user, error: authError } = await authorizeAdmin(req);
        if (!authorized) {
            console.warn(`[API GET /admin/packages] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ message: authError || 'Unauthorized' }, { status });
        }

        console.log(`[API GET /admin/packages] User ${user?.id} fetching all packages with org links.`);

        // Perform a left join to include organization data
        const results = await db
            .select({
                // Select all fields from packages
                package: packages,
                // Select organization ID and name (might be null if no link)
                organization_id: organization_packages.organization_id,
                organization_name: organizations.name,
            })
            .from(packages)
            .leftJoin(organization_packages, eq(packages.id, organization_packages.package_id))
            .leftJoin(organizations, eq(organization_packages.organization_id, organizations.id))
            .orderBy(packages.name); // Order by package name

        // Format the results
        const formattedPackages = results.map(r => ({
            ...r.package, // Spread package fields
            monthly_cost: parseFloat(r.package.monthly_cost || '0'),
            key_benefits: r.package.key_benefits || [],
            organization_id: r.organization_id, // Add organization ID
            organization_name: r.organization_name, // Add organization name
        }));

        return NextResponse.json(formattedPackages, { status: 200 });

    } catch (error) {
        console.error("[API GET /admin/packages] Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        // Auth errors handled above
        return NextResponse.json({ message: 'Failed to fetch packages', error: errorMessage }, { status: 500 });
    }
}

// POST handler to create a new package
export async function POST(req: NextRequest) {
    try {
        // Authorize Admin using the imported helper
        const { authorized, user, error: authError } = await authorizeAdmin(req);
         if (!authorized) {
            console.warn(`[API POST /admin/packages] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ message: authError || 'Unauthorized' }, { status });
        }

        const body = await req.json();
        console.log(`[API POST /admin/packages] User ${user?.id} attempting to create package with data:`, body);

        // Validate request body
        const validationResult = CreatePackageSchema.safeParse(body);
        if (!validationResult.success) {
            console.error("[API POST /admin/packages] Validation failed:", validationResult.error.errors);
            return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.errors }, { status: 400 });
        }
        const data = validationResult.data;

        // Optional: Verify organization_id exists?
        const orgExists = await db.select({id: organizations.id}).from(organizations).where(eq(organizations.id, data.organization_id)).limit(1);
        if (!orgExists || orgExists.length === 0) {
             return NextResponse.json({ message: 'Invalid Organization ID provided' }, { status: 400 });
        }

        // Use a transaction to ensure both inserts succeed or fail together
        const result = await db.transaction(async (tx) => {
            // Special handling: If setting this as the base package, unset others
            if (data.is_base_employer_package) {
                console.log("[API POST /admin/packages] Unsetting is_base_employer_package on other packages.");
                await tx.update(packages)
                    .set({ is_base_employer_package: false })
                    .where(eq(packages.is_base_employer_package, true));
                // Consider adding: .where(eq(packages.organization_id, data.organization_id)) if base package is per-org?
            }

            // 1. Insert new package
            const newPackage = await tx.insert(packages).values({
                name: data.name,
                tier: data.tier,
                monthly_cost: data.monthly_cost.toFixed(2), 
                description: data.description,
                key_benefits: data.key_benefits,
                is_base_employer_package: data.is_base_employer_package,
            }).returning();

            if (!newPackage || newPackage.length === 0) {
                throw new Error("Failed to create package record after insert.");
            }
            const createdPackage = newPackage[0];
            console.log(`[API POST /admin/packages] Package created: ${createdPackage.id}`);

            // 2. Insert link into junction table
            await tx.insert(organization_packages).values({
                organization_id: data.organization_id,
                package_id: createdPackage.id,
            });
            console.log(`[API POST /admin/packages] Linked package ${createdPackage.id} to organization ${data.organization_id}`);
            
            return createdPackage; // Return the created package data from transaction
        });

        console.log(`[API POST /admin/packages] Transaction successful. Package created and linked.`);
        return NextResponse.json(result, { status: 201 }); // Return created package

    } catch (error) {
        console.error("[API POST /admin/packages] Error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        // Consider more specific error codes (e.g., 409 Conflict if link already exists?)
        return NextResponse.json({ message: 'Failed to create package', error: errorMessage }, { status: 500 });
    }
} 