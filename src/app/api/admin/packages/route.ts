import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { eq, and } from 'drizzle-orm';
import { createActivityLog } from '@/lib/actions/loggingActions';
import { z } from 'zod';
import { packages, packageTierEnum, organization_packages, organizations } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Zod schema for creating a package
const CreatePackageSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  tier: z.enum(packageTierEnum.enumValues),
  monthly_cost: z.number().positive('Monthly cost must be positive'),
  description: z.string().optional(),
  key_benefits: z.array(z.string()).optional(),
  is_base_employer_package: z.boolean().default(false),
  organization_id: z.string().uuid('Valid organization ID is required'),
});

// GET handler to fetch all packages with their linked organization
export async function GET(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  const adminUser = authResult.user;

  if (!authResult.authorized || !adminUser) {
    await createActivityLog({
        actionType: 'PACKAGE_FETCH_AUTH_FAILURE',
        status: 'FAILURE',
        description: `Unauthorized attempt to fetch packages. Error: ${authResult.error || 'Forbidden'}`,
        details: { error: authResult.error }
    });
    return NextResponse.json({ message: authResult.error || 'Forbidden' }, { status: authResult.authorized ? 403 : 401 });
  }

  try {
    const allPackages = await db.query.packages.findMany({
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
    
    await createActivityLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        actionType: 'PACKAGE_FETCH_ALL',
        status: 'SUCCESS',
        description: `Admin ${adminUser.email} fetched all packages.`,
        details: { packageCount: allPackages.length }
    });
    return NextResponse.json(allPackages);

  } catch (error: any) {
    console.error('[API GET /admin/packages] Error fetching packages:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    await createActivityLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        actionType: 'PACKAGE_FETCH_ALL_FAILURE',
        status: 'FAILURE',
        description: `Failed to fetch packages. Error: ${errorMessage}`,
        details: { error: errorMessage }
    });
    return NextResponse.json({ message: 'Failed to retrieve packages', error: errorMessage }, { status: 500 });
  }
}

// POST handler to create a new package
export async function POST(req: NextRequest) {
  // Authorize Admin using the imported helper
  const authResult = await authorizeAdmin(req);
  const adminUser = authResult.user;

  if (!authResult.authorized || !adminUser) {
    // Log auth failure if needed, though authorizeAdmin might do this
    await createActivityLog({
        actionType: 'PACKAGE_CREATE_AUTH_FAILURE',
        status: 'FAILURE',
        description: `Unauthorized attempt to create package. Error: ${authResult.error || 'Forbidden'}`,
        details: { error: authResult.error }
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
        actionType: 'PACKAGE_CREATE_PARSE_FAILURE',
        status: 'FAILURE',
        description: `Failed to parse request body for package creation. Error: ${parseError.message}`,
        details: { error: parseError.message }
    });
    return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
  }

  const validation = CreatePackageSchema.safeParse(rawRequestBody);
  if (!validation.success) {
    await createActivityLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        actionType: 'PACKAGE_CREATE_VALIDATION_FAILURE',
        status: 'FAILURE',
        description: 'Package creation request validation failed.',
        details: { errors: validation.error.flatten(), submittedData: rawRequestBody }
    });
    return NextResponse.json({ message: 'Invalid package data', errors: validation.error.flatten() }, { status: 400 });
  }
  const validatedData = validation.data;

  try {
    const orgExists = await db.select({id: organizations.id}).from(organizations).where(eq(organizations.id, validatedData.organization_id)).limit(1);
    if (orgExists.length === 0) {
        await createActivityLog({
            userId: adminUser.id,
            userEmail: adminUser.email,
            actionType: 'PACKAGE_CREATE_FAILURE',
            status: 'FAILURE',
            description: `Failed to create package: Organization ID ${validatedData.organization_id} not found.`,
            details: { submittedData: validatedData, error: `Organization ID ${validatedData.organization_id} not found.` }
        });
        return NextResponse.json({ message: `Organization with ID ${validatedData.organization_id} not found.` }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const [createdPackage] = await tx.insert(packages).values({
        name: validatedData.name,
        tier: validatedData.tier,
        monthly_cost: validatedData.monthly_cost.toString(), 
        description: validatedData.description,
        key_benefits: validatedData.key_benefits,
        is_base_employer_package: validatedData.is_base_employer_package,
      }).returning();

      await tx.insert(organization_packages).values({
        organization_id: validatedData.organization_id,
        package_id: createdPackage.id,
      });
      
      await createActivityLog({
        userId: adminUser.id,
        userEmail: adminUser.email,
        actionType: 'PACKAGE_CREATE',
        targetEntityType: 'PACKAGE',
        targetEntityId: createdPackage.id,
        status: 'SUCCESS',
        description: `Package '${createdPackage.name}' created and linked to org ${validatedData.organization_id} by admin ${adminUser.email}.`,
        details: { packageData: createdPackage, organization_id: validatedData.organization_id }
      });
      
      return createdPackage;
    });

    console.log(`[API POST /admin/packages] Transaction successful. Package created and linked.`);
    return NextResponse.json({ message: 'Package created and linked successfully', data: result }, { status: 201 });

  } catch (error: any) {
    console.error(`[API POST /admin/packages] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    await createActivityLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      actionType: 'PACKAGE_CREATE_FAILURE',
      status: 'FAILURE',
      description: `Failed to create package. Error: ${errorMessage}`,
      details: { error: errorMessage, submittedData: validatedData }
    });
    return NextResponse.json({ message: 'Failed to create package', error: errorMessage }, { status: 500 });
  }
} 