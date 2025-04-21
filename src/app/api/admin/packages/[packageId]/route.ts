import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { packages, packageTierEnum, organization_packages, organizations } from '@/lib/db/schema';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { eq } from 'drizzle-orm';

// Define an interface for the route context parameters
interface PackageRouteContext {
    params: {
        packageId: string;
    };
}

// Zod schema for updating a package (all fields optional)
const UpdatePackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').optional(),
  tier: z.enum(packageTierEnum.enumValues).optional(),
  monthly_cost: z.number().min(0, 'Monthly cost cannot be negative').optional(),
  description: z.string().optional().nullable(), // Allow explicitly setting to null
  key_benefits: z.array(z.string()).optional().nullable(), // Allow setting to null or empty array
  is_base_employer_package: z.boolean().optional(),
  organization_id: z.string().uuid('Invalid Organization ID format').optional(), // Add optional organization_id
});

// PUT handler to update a specific package
export async function PUT(req: NextRequest, { params }: { params: { packageId: string } }) {
    const packageId = params.packageId;
    try {
        // Authorize Admin using the imported helper
        const { authorized, user, error: authError } = await authorizeAdmin(req);
        if (!authorized) {
            console.warn(`[API PUT /admin/packages/${packageId}] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ message: authError || 'Unauthorized' }, { status });
        }

        const body = await req.json();
        console.log(`[API PUT /admin/packages/${packageId}] User ${user?.id} attempting to update package with data:`, body);

        // Validate request body
        const validationResult = UpdatePackageSchema.safeParse(body);
        if (!validationResult.success) {
            console.error(`[API PUT /admin/packages/${packageId}] Validation failed:`, validationResult.error.errors);
            return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.errors }, { status: 400 });
        }
        const data = validationResult.data;

        // Prevent empty update object
        if (Object.keys(data).length === 0) {
             return NextResponse.json({ message: 'No update fields provided' }, { status: 400 });
        }

        // Validate new organization_id if provided
        if (data.organization_id) {
            const orgExists = await db.select({id: organizations.id}).from(organizations).where(eq(organizations.id, data.organization_id)).limit(1);
            if (!orgExists || orgExists.length === 0) {
                return NextResponse.json({ message: 'Invalid Organization ID provided' }, { status: 400 });
            }
        }

        // Use transaction for consistency
        const updatedPackageResult = await db.transaction(async (tx) => {
            // Prepare data for package update (excluding org id)
            const updateData: Partial<typeof packages.$inferInsert> = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.tier !== undefined) updateData.tier = data.tier;
            if (data.monthly_cost !== undefined) updateData.monthly_cost = data.monthly_cost.toFixed(2); 
            if (data.description !== undefined) updateData.description = data.description;
            if (data.key_benefits !== undefined) updateData.key_benefits = data.key_benefits;
            if (data.is_base_employer_package !== undefined) {
                 updateData.is_base_employer_package = data.is_base_employer_package;
                // Special handling: If setting this as the base package, unset others
                if (data.is_base_employer_package === true) {
                    console.log(`[API PUT /admin/packages/${packageId}] Unsetting is_base_employer_package on other packages.`);
                    await tx.update(packages)
                        .set({ is_base_employer_package: false })
                        .where(eq(packages.is_base_employer_package, true));
                    // TODO: Consider scoping base package to organization?
                }
            }

            let updatedPackage: (typeof packages.$inferSelect)[] = [];
            
            // Only update package table if there's relevant data
            if (Object.keys(updateData).length > 0) {
                 updateData.updated_at = new Date(); // Manually set updated_at
                 updatedPackage = await tx.update(packages)
                    .set(updateData)
                    .where(eq(packages.id, packageId))
                    .returning();
                
                 if (!updatedPackage || updatedPackage.length === 0) {
                    // Check if the only update was organization_id, in which case package might not be found here yet
                    if (!data.organization_id) {
                         throw new Error('Package not found during update.');
                    }
                }
                 console.log(`[API PUT /admin/packages/${packageId}] Package table updated.`);
            }
            

            // If organization_id is provided, update the link in junction table
            if (data.organization_id) {
                 console.log(`[API PUT /admin/packages/${packageId}] Updating organization link to ${data.organization_id}.`);
                 // Delete existing links for this package
                await tx.delete(organization_packages)
                    .where(eq(organization_packages.package_id, packageId));
                
                // Insert the new link
                await tx.insert(organization_packages).values({
                    organization_id: data.organization_id,
                    package_id: packageId,
                });
                 console.log(`[API PUT /admin/packages/${packageId}] Organization link updated.`);
            }
            
            // If we didn't update the package table, fetch the package to return it
            if (updatedPackage.length === 0) {
                const currentPackage = await tx.select().from(packages).where(eq(packages.id, packageId)).limit(1);
                 if (!currentPackage || currentPackage.length === 0) {
                     throw new Error('Package not found after operations.');
                 }
                 return currentPackage[0];
            } else {
                 return updatedPackage[0];
            }
        });

        // Check if the result is valid (should be after transaction)
        if (!updatedPackageResult) {
             return NextResponse.json({ message: 'Package not found or update failed' }, { status: 404 });
        }

        console.log(`[API PUT /admin/packages/${packageId}] Package update transaction successful.`);
        return NextResponse.json(updatedPackageResult, { status: 200 });

    } catch (error) {
        console.error(`[API PUT /admin/packages/${packageId}] Error:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        if (errorMessage === 'Unauthorized') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }
        return NextResponse.json({ message: 'Failed to update package', error: errorMessage }, { status: 500 });
    }
}

// DELETE handler to remove a specific package
export async function DELETE(req: NextRequest, { params }: { params: { packageId: string } }) {
    const packageId = params.packageId;
    try {
        // Authorize Admin using the imported helper
        const { authorized, user, error: authError } = await authorizeAdmin(req);
        if (!authorized) {
            console.warn(`[API DELETE /admin/packages/${packageId}] Authorization failed: ${authError}`);
            const status = authError === "User is not authenticated." ? 401 : 403;
            return NextResponse.json({ message: authError || 'Unauthorized' }, { status });
        }

        console.log(`[API DELETE /admin/packages/${packageId}] User ${user?.id} attempting to delete package.`);

        // TODO: Add check - should we prevent deleting the last `is_base_employer_package`?
        // TODO: Add check - what happens if users are currently assigned this packageId?
        // (Current schema has onDelete: 'set null' for users.selected_package_id)

        const deletedPackage = await db.delete(packages)
            .where(eq(packages.id, packageId))
            .returning();

        if (!deletedPackage || deletedPackage.length === 0) {
            return NextResponse.json({ message: 'Package not found' }, { status: 404 });
        }

        console.log(`[API DELETE /admin/packages/${packageId}] Package deleted successfully.`);
        return NextResponse.json({ message: 'Package deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error(`[API DELETE /admin/packages/${packageId}] Error:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        if (errorMessage === 'Unauthorized') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }
        // Handle potential foreign key constraint errors if onDelete isn't set up properly
        return NextResponse.json({ message: 'Failed to delete package', error: errorMessage }, { status: 500 });
    }
} 