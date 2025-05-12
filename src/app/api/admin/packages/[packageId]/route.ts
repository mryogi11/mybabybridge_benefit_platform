import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { packages, packageTierEnum, organization_packages, organizations } from '@/lib/db/schema';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { eq } from 'drizzle-orm';
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

    if (Object.keys(validatedData).length === 0) {
        return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    try {
        const updatedPackageResult = await db.transaction(async (tx) => {
            if (typeof validatedData.is_base_employer_package === 'boolean' && validatedData.is_base_employer_package) {
                const currentLinkedOrg = await tx.select({ organization_id: organization_packages.organization_id })
                    .from(organization_packages)
                    .where(eq(organization_packages.package_id, packageId))
                    .limit(1);
                if (currentLinkedOrg.length > 0 && currentLinkedOrg[0].organization_id) {
                    await tx.update(packages)
                        .set({ is_base_employer_package: false })
                        .where(eq(packages.is_base_employer_package, true));
                    // Add .where(eq(packages.organization_id, currentLinkedOrg[0].organization_id)) if base is per org
                }
            }

            const updatePayload: Partial<typeof packages.$inferInsert> = { ...validatedData };
            if (validatedData.monthly_cost !== undefined) {
                updatePayload.monthly_cost = validatedData.monthly_cost.toFixed(2);
            }

            const [updatedPackage] = await tx.update(packages)
                .set(updatePayload)
                .where(eq(packages.id, packageId))
                .returning();
            
            if (!updatedPackage) {
                throw new Error('Package not found or update failed.');
            }
            return updatedPackage;
        });

        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_UPDATE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'SUCCESS',
            description: `Package '${updatedPackageResult.name}' (ID: ${packageId}) updated by admin ${adminUser.email}.`,
            details: { updatedData: validatedData, package: updatedPackageResult }
        });
        return NextResponse.json(updatedPackageResult, { status: 200 });

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
        if (errorMessage.includes('not found')) {
            return NextResponse.json({ message: 'Package not found', error: errorMessage }, { status: 404 });
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
        const deletedPackage = await db.delete(packages)
            .where(eq(packages.id, packageId))
            .returning({ id: packages.id, name: packages.name });

        if (!deletedPackage || deletedPackage.length === 0) {
            await createActivityLog({
                userId: adminUser.id,
                userEmail: adminUser.email,
                actionType: 'PACKAGE_DELETE_FAILURE',
                targetEntityType: 'PACKAGE',
                targetEntityId: packageId,
                status: 'FAILURE',
                description: `Attempt to delete non-existent package ${packageId} by admin ${adminUser.email}.`,
                details: { packageId: packageId, error: 'Package not found' }
            });
            return NextResponse.json({ message: 'Package not found' }, { status: 404 });
        }

        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_DELETE',
            targetEntityType: 'PACKAGE',
            targetEntityId: packageId,
            status: 'SUCCESS',
            description: `Package '${deletedPackage[0].name}' (ID: ${packageId}) deleted by admin ${adminUser.email}.`,
            details: { deletedPackageInfo: deletedPackage[0] }
        });
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