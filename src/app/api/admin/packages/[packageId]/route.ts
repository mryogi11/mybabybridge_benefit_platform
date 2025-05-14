import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { packages, packageTierEnum, organization_packages, organizations } from '@/lib/db/schema';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { eq, and, inArray, sql } from 'drizzle-orm'; // Added inArray and sql for potential subqueries
import { createActivityLog } from '@/lib/actions/loggingActions';

// Define an interface for the route context parameters
interface PackageRouteContext {
    params: {
        packageId: string;
    };
}

// Zod schema for updating a package
const UpdatePackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').optional(),
  tier: z.enum(packageTierEnum.enumValues).optional(),
  monthly_cost: z.number().positive('Monthly cost must be positive').optional(),
  description: z.string().optional().nullable(),
  key_benefits: z.array(z.string()).optional().nullable(),
  is_base_employer_package: z.boolean().optional(),
  organization_id: z.string().uuid('Valid organization ID is required').optional(),
});

// PUT handler to update a specific package
export async function PUT(req: NextRequest, { params }: PackageRouteContext) {
    const { packageId } = params;
    const authResult = await authorizeAdmin(req);
    const adminUser = authResult.user;

    if (!authResult.authorized || !adminUser) {
        await createActivityLog({
            actionType: 'PACKAGE_UPDATE_AUTH_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Unauthorized attempt to update package ${packageId}. Error: ${authResult.error || 'Forbidden'}`,
            details: { error: authResult.error, packageId: packageId }
        });
        return NextResponse.json({ message: authResult.error || 'Forbidden' }, { status: authResult.authorized ? 403 : 401 });
    }

    let rawRequestBody;
    try {
        rawRequestBody = await req.json();
    } catch (parseError: any) {
        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_UPDATE_PARSE_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Failed to parse request body for package update ${packageId}. Error: ${parseError.message}`,
            details: { error: parseError.message, packageId: packageId }
        });
        return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const validation = UpdatePackageSchema.safeParse(rawRequestBody);
    if (!validation.success) {
        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_UPDATE_VALIDATION_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Package update ${packageId} validation failed.`,
            details: { errors: validation.error.flatten(), submittedData: rawRequestBody, packageId: packageId }
        });
        return NextResponse.json({ message: 'Invalid package data', errors: validation.error.flatten() }, { status: 400 });
    }
    const validatedData = validation.data;

    if (Object.keys(validatedData).length === 0 && !validatedData.organization_id) { // Also check organization_id
        return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    try {
        // updatedPackageFromTx will hold the direct result from updating the 'packages' table
        let updatedPackageFromTx;

        await db.transaction(async (tx) => {
            // Simplified is_base_employer_package handling:
            // If this package is being set as base, and an organization_id is involved (either existing or new),
            // clear the base flag for OTHER packages WITHIN THAT SPECIFIC ORGANIZATION.
            if (validatedData.is_base_employer_package === true) {
                let targetOrgIdForBaseLogic: string | null = null;

                if (validatedData.organization_id) {
                    targetOrgIdForBaseLogic = validatedData.organization_id;
                } else {
                    // If organization_id is not in validatedData, find current linked org
                    const currentLink = await tx.select({ orgId: organization_packages.organization_id })
                        .from(organization_packages)
                        .where(eq(organization_packages.package_id, packageId))
                        .limit(1);
                    if (currentLink.length > 0) {
                        targetOrgIdForBaseLogic = currentLink[0].orgId;
                    }
                }

                if (targetOrgIdForBaseLogic) {
                    // Find all package IDs linked to this organization, excluding the current package
                    const packageIdsInOrg = await tx.select({ id: organization_packages.package_id })
                        .from(organization_packages)
                        .where(and(
                            eq(organization_packages.organization_id, targetOrgIdForBaseLogic),
                            eq(packages.is_base_employer_package, true), // only consider those that are currently base
                            sql`${organization_packages.package_id} != ${packageId}` // Exclude current package
                        ));
                    
                    if (packageIdsInOrg.length > 0) {
                        const idsToClear = packageIdsInOrg.map(p => p.id);
                        if (idsToClear.length > 0) {
                             await tx.update(packages)
                                .set({ is_base_employer_package: false, updated_at: new Date() })
                                .where(inArray(packages.id, idsToClear));
                            console.log(`[API PUT /admin/packages/${packageId}] Cleared is_base_employer_package for packages ${idsToClear.join(', ')} in org ${targetOrgIdForBaseLogic}`);
                        }
                    }
                }
            }

            // Prepare payload for 'packages' table update
            const packageUpdatePayload: Partial<typeof packages.$inferInsert> = {};
            if (validatedData.name !== undefined) packageUpdatePayload.name = validatedData.name;
            if (validatedData.tier !== undefined) packageUpdatePayload.tier = validatedData.tier;
            if (validatedData.monthly_cost !== undefined) {
                 packageUpdatePayload.monthly_cost = validatedData.monthly_cost.toFixed(2);
            }
            if (validatedData.description !== undefined) packageUpdatePayload.description = validatedData.description;
            if (validatedData.key_benefits !== undefined) packageUpdatePayload.key_benefits = validatedData.key_benefits;
            if (validatedData.is_base_employer_package !== undefined) {
                packageUpdatePayload.is_base_employer_package = validatedData.is_base_employer_package;
            }
            
            if (Object.keys(packageUpdatePayload).length > 0) {
                packageUpdatePayload.updated_at = new Date(); // Explicitly set updated_at
                const [result] = await tx.update(packages)
                    .set(packageUpdatePayload)
                    .where(eq(packages.id, packageId))
                    .returning();
                updatedPackageFromTx = result;
            } else {
                // If only organization_id is changing, fetch current package data to return
                const [currentPackageData] = await tx.select().from(packages).where(eq(packages.id, packageId)).limit(1);
                updatedPackageFromTx = currentPackageData;
            }
            
            if (!updatedPackageFromTx) {
                throw new Error('Package not found or update failed during package table update.');
            }

            // Handle organization link update
            if (validatedData.organization_id) {
                const orgExists = await tx.select({id: organizations.id}).from(organizations).where(eq(organizations.id, validatedData.organization_id)).limit(1);
                if (orgExists.length === 0) {
                    throw new Error(`Organization with ID ${validatedData.organization_id} not found.`);
                }

                // 1. Delete ALL existing links for this package_id
                await tx.delete(organization_packages)
                    .where(eq(organization_packages.package_id, packageId));
                console.log(`[API PUT /admin/packages/${packageId}] Deleted existing organization links for package ${packageId}`);

                // 2. Insert the new link
                await tx.insert(organization_packages)
                    .values({
                        package_id: packageId,
                        organization_id: validatedData.organization_id,
                        // created_at will use defaultNow()
                    });
                 console.log(`[API PUT /admin/packages/${packageId}] Inserted new organization link to ${validatedData.organization_id} for package ${packageId}`);
                 
                 // Since organization link changed, ensure updated_at on the package itself is also touched if no other fields changed it
                 if (Object.keys(packageUpdatePayload).length === 0) {
                    const [currentPackageDataWithPossibleNewTimestamp] = await tx.update(packages)
                        .set({ updated_at: new Date() })
                        .where(eq(packages.id, packageId))
                        .returning();
                    updatedPackageFromTx = currentPackageDataWithPossibleNewTimestamp || updatedPackageFromTx;
                 }

            }
        }); // End of transaction

        if (!updatedPackageFromTx) {
             throw new Error('Transaction completed but package data is unavailable.');
        }

        // Re-fetch the package with its (potentially new) organization details for the response
        const [finalResultWithOrg] = await db.query.packages.findMany({
            where: eq(packages.id, packageId),
            with: {
              organizationPackages: {
                with: {
                  organization: {
                    columns: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
        });
        
        if (!finalResultWithOrg) {
            console.error(`[API PUT /admin/packages/${packageId}] CRITICAL: Package not found after successful update transaction for ${packageId}`);
            // Fallback to updatedPackageFromTx if final query fails, but this lacks organization_name
            await createActivityLog({
                userId: adminUser.id,
                userEmail: adminUser.email,
                actionType: 'PACKAGE_UPDATE_FETCH_POST_TX_FAILURE',
                targetEntityType: 'PACKAGE',
                targetEntityId: packageId,
                status: 'WARNING',
                description: `Package ${packageId} updated, but failed to re-fetch full details for response.`,
                details: { packageId: packageId }
            });
            // Convert necessary fields from updatedPackageFromTx
            const fallbackPayload = {
                ...updatedPackageFromTx,
                monthly_cost: parseFloat(updatedPackageFromTx.monthly_cost as string), // Assuming it's string
                created_at: (updatedPackageFromTx.created_at as Date).toISOString(),
                updated_at: (updatedPackageFromTx.updated_at as Date).toISOString(),
                organization_name: null, // Cannot determine without the join
            };
            return NextResponse.json(fallbackPayload, { status: 200 });
        }

        const orgPackage = finalResultWithOrg.organizationPackages && finalResultWithOrg.organizationPackages.length > 0 
            ? finalResultWithOrg.organizationPackages[0] 
            : null;
        
        const organizationName: string | null = orgPackage && orgPackage.organization 
            ? orgPackage.organization.name 
            : null;

        const responsePayload = {
            id: finalResultWithOrg.id,
            name: finalResultWithOrg.name,
            tier: finalResultWithOrg.tier,
            monthly_cost: parseFloat(finalResultWithOrg.monthly_cost as string), // Drizzle might return decimal as string
            description: finalResultWithOrg.description,
            key_benefits: finalResultWithOrg.key_benefits,
            is_base_employer_package: finalResultWithOrg.is_base_employer_package,
            created_at: (finalResultWithOrg.created_at as Date).toISOString(),
            updated_at: (finalResultWithOrg.updated_at as Date).toISOString(),
            organization_name: organizationName,
        };

        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_UPDATE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'SUCCESS',
            description: `Package '${responsePayload.name}' (ID: ${packageId}) updated by admin ${adminUser.email}.`,
            details: { updatedData: validatedData, package: responsePayload }
        });
        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error: any) {
        const errorMessage = error.message || 'Failed to update package';
        console.error(`[API PUT /admin/packages/${packageId}] Error:`, error);
        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_UPDATE_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Failed to update package ${packageId}. Error: ${errorMessage}`,
            details: { error: errorMessage, submittedData: validatedData, packageId: packageId }
        });
        if (errorMessage.includes('not found')) { // Catches both package not found and org not found
            return NextResponse.json({ message: errorMessage }, { status: 404 });
        }
        return NextResponse.json({ message: 'Failed to update package', error: errorMessage }, { status: 500 });
    }
}

// DELETE handler to remove a specific package
export async function DELETE(req: NextRequest, { params }: PackageRouteContext) {
    const { packageId } = params;
    const authResult = await authorizeAdmin(req);
    const adminUser = authResult.user;

    if (!authResult.authorized || !adminUser) {
        await createActivityLog({
            actionType: 'PACKAGE_DELETE_AUTH_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Unauthorized attempt to delete package ${packageId}. Error: ${authResult.error || 'Forbidden'}`,
            details: { error: authResult.error, packageId: packageId }
        });
        return NextResponse.json({ message: authResult.error || 'Forbidden' }, { status: authResult.authorized ? 403 : 401 });
    }

    try {
        // The transaction ensures that if deleting from 'organization_packages' fails (e.g., due to FK constraint if not cascaded),
        // the deletion from 'packages' is also rolled back. And vice-versa.
        // Drizzle's ON DELETE CASCADE should handle `organization_packages` automatically when a package is deleted.
        // If not, manual deletion from organization_packages would be needed here first.
        // Assuming ON DELETE CASCADE is effective for organization_packages.package_id.

        const [deletedPackageInfo] = await db.delete(packages)
            .where(eq(packages.id, packageId))
            .returning({ id: packages.id, name: packages.name });

        if (!deletedPackageInfo) {
            await createActivityLog({
                userId: adminUser.id,
                userEmail: adminUser.email,
                actionType: 'PACKAGE_DELETE_FAILURE',
                targetEntityType: 'PACKAGE',
                targetEntityId: packageId,
                status: 'FAILURE',
                description: `Attempt to delete non-existent package ${packageId} by admin ${adminUser.email}. Package not found.`,
                details: { packageId: packageId, error: 'Package not found' }
            });
            return NextResponse.json({ message: 'Package not found' }, { status: 404 });
        }

        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_DELETE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId, // Use packageId from params as it's the one targeted for deletion
            status: 'SUCCESS',
            description: `Package '${deletedPackageInfo.name}' (ID: ${packageId}) deleted by admin ${adminUser.email}.`,
            details: { deletedPackageInfo: {id: packageId, name: deletedPackageInfo.name } }
        });
        // Return 200 with a success message, or 204 No Content.
        // For consistency with GET/PUT returning data, 200 with message is fine.
        return NextResponse.json({ message: 'Package deleted successfully' }, { status: 200 });

    } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete package';
        console.error(`[API DELETE /admin/packages/${packageId}] Error:`, error);
        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_DELETE_FAILURE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'FAILURE',
            description: `Failed to delete package ${packageId}. Error: ${errorMessage}`,
            details: { error: errorMessage, packageId: packageId }
        });
        return NextResponse.json({ message: 'Failed to delete package', error: errorMessage }, { status: 500 });
    }
}
