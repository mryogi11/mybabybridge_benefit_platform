'use server';

import { z } from 'zod';
import { eq, ilike, and, or } from 'drizzle-orm'; // Ensure 'and', 'or' are here
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
// Single comprehensive import for schema elements:
import { users, organizations, packages, user_benefit_verification_attempts, benefitSourceEnum, benefitStatusEnum, organization_approved_emails, organization_packages } from '@/lib/db/schema';
import type { Database } from '@/types/supabase';
import { alias } from 'drizzle-orm/pg-core';
// import { supabase } from '@/lib/supabase/client'; // Not needed if using db client from drizzle for all DB ops

// --- Helper to get authenticated user (Using @supabase/ssr) ---
// This helper is defined at the top and used by actions below.
async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const supabaseAuthClient = createServerClient<Database>( // Renamed for clarity
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        console.error("[getAuthenticatedUser Cookie Set Error]", error);
                    }
                },
                remove(name: string, options: CookieOptions) {
                     try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        console.error("[getAuthenticatedUser Cookie Remove Error]", error);
                    }
                },
            },
        }
    );
    const { data: { user }, error } = await supabaseAuthClient.auth.getUser();
    if (error || !user) {
        console.error("[getAuthenticatedUser BenefitActions] Auth Error:", error);
        if (error?.message.includes('JWT')) {
             console.error("[getAuthenticatedUser BenefitActions] Potential JWT/Cookie parsing issue.");
        }
        throw new Error("User is not authenticated."); // Throws error to be caught by calling action
    }
    return user;
}

// --- Type Definitions --- //
const BenefitSourceSchema = z.enum(benefitSourceEnum.enumValues);

const VerificationInfoSchema = z.object({
    sponsoringOrganizationId: z.string().uuid(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().date(),
    phoneNumber: z.string().min(5),
    workEmail: z.string().email().optional().or(z.literal('')),
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(2),
    addressState: z.string().min(2),
    addressPostalCode: z.string().min(3),
    addressCountry: z.string().min(2),
});
type VerificationInfo = z.infer<typeof VerificationInfoSchema>;

interface SimplePackageDetails {
    id: string;
    name: string;
    monthly_cost: number; // Ensure this is number
    description: string | null;
    is_base_employer_package: boolean;
}

interface UserWithPackageAndEmployerInfo {
    id: string;
    email: string | null; // users.email can be null based on schema
    benefit_status: typeof benefitStatusEnum.enumValues[number] | null;
    sponsoring_organization_id: string | null;
    selected_package_id: string | null;
    selected_package: SimplePackageDetails | null;
    employer_sponsored_package: SimplePackageDetails | null;
}

const BasicProfileSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(2),
    addressState: z.string().min(2),
    addressPostalCode: z.string().min(3),
    addressCountry: z.string().min(2),
});
type BasicProfileData = z.infer<typeof BasicProfileSchema>;

// --- Server Actions --- //

export async function updateBenefitSource(formData: FormData) {
    try {
        const user = await getAuthenticatedUser();
        const source = formData.get('benefitSource') as string;
        const validatedSource = BenefitSourceSchema.parse(source);
        await db.update(users)
            .set({
                benefit_source: validatedSource,
                updated_at: new Date(),
                benefit_status: validatedSource === 'none' ? 'no_benefit' : 'not_started'
            })
            .where(eq(users.id, user.id));
        return { success: true, message: 'Benefit source updated.' };
    } catch (error) {
        console.error("[updateBenefitSource] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

export async function updateSponsoringOrganization(formData: FormData) {
     try {
        const user = await getAuthenticatedUser();
        const organizationId = formData.get('organizationId') as string;
        if (!organizationId || typeof organizationId !== 'string') {
            throw new Error('Invalid Organization ID');
        }
        await db.update(users)
            .set({
                sponsoring_organization_id: organizationId,
                updated_at: new Date(),
            })
            .where(eq(users.id, user.id));
        return { success: true, message: 'Sponsoring organization updated.' };
    } catch (error) {
        console.error("Error updating sponsoring organization:", error);
         return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

export async function submitVerificationInfo(data: VerificationInfo) {
    let verificationAttemptId: string | null = null;
    let verificationStatus: 'success' | 'failed' = 'failed';
    let finalUserBenefitStatus: typeof benefitStatusEnum.enumValues[number] = 'declined';
    let failureReason: string | null = 'Verification failed.';
    try {
        const user = await getAuthenticatedUser();
        const validatedData = VerificationInfoSchema.parse(data);
        const insertedAttempt = await db.insert(user_benefit_verification_attempts).values({
            user_id: user.id,
            organization_id: validatedData.sponsoringOrganizationId,
            submitted_first_name: validatedData.firstName,
            submitted_last_name: validatedData.lastName,
            submitted_dob: validatedData.dateOfBirth,
            submitted_phone: validatedData.phoneNumber,
            submitted_work_email: validatedData.workEmail || null,
            status: 'pending', // Default status
        }).returning({ id: user_benefit_verification_attempts.id });

        verificationAttemptId = insertedAttempt[0]?.id;
        if (!verificationAttemptId) {
            throw new Error("Failed to create verification attempt record.");
        }

        console.log(`[Verification] Updating user profile for user ${user.id} with submitted name/address.`);
        await db.update(users)
            .set({
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                address_line1: validatedData.addressLine1,
                address_line2: validatedData.addressLine2 || null,
                address_city: validatedData.addressCity,
                address_state: validatedData.addressState,
                address_postal_code: validatedData.addressPostalCode,
                address_country: validatedData.addressCountry,
                updated_at: new Date(),
            })
            .where(eq(users.id, user.id));

        console.log(`[Verification] Attempting verification for user ${user.id}, attempt ${verificationAttemptId}`);
        if (!validatedData.workEmail) {
            console.log("[Verification] Failed: No work email submitted.");
            failureReason = "Work email is required for verification.";
        } else {
            const submittedEmailLower = validatedData.workEmail.toLowerCase();
            try {
                const approvedEmails = await db.select({ email: organization_approved_emails.email })
                    .from(organization_approved_emails)
                    .where(eq(organization_approved_emails.organization_id, validatedData.sponsoringOrganizationId));

                const isApproved = approvedEmails.some(record => record.email.toLowerCase() === submittedEmailLower);

                if (isApproved) {
                    console.log(`[Verification] Success: Email ${submittedEmailLower} found...`);
                    verificationStatus = 'success';
                    finalUserBenefitStatus = 'verified';
                    failureReason = null;
                } else {
                    console.log(`[Verification] Failed: Email ${submittedEmailLower} not found...`);
                    failureReason = "Submitted work email is not on the approved list for this organization.";
                }
            } catch (dbError) {
                 console.error("[Verification] Database error checking approved emails:", dbError);
                 failureReason = "An error occurred during verification. Please try again.";
            }
        }

        await db.update(user_benefit_verification_attempts)
            .set({
                status: verificationStatus,
                failure_reason: failureReason,
            })
            .where(eq(user_benefit_verification_attempts.id, verificationAttemptId));

        await db.update(users)
            .set({
                benefit_status: finalUserBenefitStatus,
            })
            .where(eq(users.id, user.id));

        if (finalUserBenefitStatus === 'verified') {
            console.log("[Verification] Assigning base package for verified user:", user.id);
            try {
                // Find base package via organization_packages and packages table
                const baseOrgPackage = await db.select({ packageId: organization_packages.package_id })
                    .from(organization_packages)
                    .innerJoin(packages, eq(organization_packages.package_id, packages.id))
                    .where(and(
                        eq(organization_packages.organization_id, validatedData.sponsoringOrganizationId),
                        eq(packages.is_base_employer_package, true)
                    ))
                    .limit(1);

                const basePackageId = baseOrgPackage[0]?.packageId;

                if (basePackageId) {
                    await db.update(users)
                          .set({ selected_package_id: basePackageId, updated_at: new Date() })
                          .where(eq(users.id, user.id));
                    console.log(`[Verification] Assigned base package ${basePackageId} to user ${user.id}`);
                } else {
                     console.warn(`[Verification] No base employer package found for organization ${validatedData.sponsoringOrganizationId} or it's not marked as 'is_base_employer_package'.`);
                }
            } catch (pkgError) {
                 console.error("[Verification] Error assigning base package:", pkgError);
            }
        }

        return {
            success: true,
            message: verificationStatus === 'success' ? 'Verification successful!' : (failureReason || "Verification processed."),
            verificationStatus: finalUserBenefitStatus
        };

    } catch (error) {
        console.error("[Verification] Error submitting verification info:", error);
        if (verificationAttemptId) { // Ensure attempt is marked failed if error occurs after creation
            try {
                await db.update(user_benefit_verification_attempts)
                    .set({ status: 'failed', failure_reason: 'Action processing error' })
                    .where(eq(user_benefit_verification_attempts.id, verificationAttemptId));
            } catch (updateError) {
                console.error("[Verification] Failed to mark verification attempt as failed after error:", updateError);
            }
        }
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred.',
            verificationStatus: 'declined' // Default to declined on error
        };
    }
}

export async function updateBasicProfile(data: BasicProfileData) {
    try {
        const user = await getAuthenticatedUser(); // Ensure user is authenticated
        const validatedData = BasicProfileSchema.parse(data); // Validate incoming data

        // Update the user's profile in the database
        await db.update(users)
            .set({
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                address_line1: validatedData.addressLine1,
                address_line2: validatedData.addressLine2 || null,
                address_city: validatedData.addressCity,
                address_state: validatedData.addressState,
                address_postal_code: validatedData.addressPostalCode,
                address_country: validatedData.addressCountry,
                updated_at: new Date(),
                // Potentially update benefit_status if this path implies something specific
                // For example, if this path means they are 'not_applicable' or 'verified_other'
                // benefit_status: 'not_applicable', // Example, adjust as needed
            })
            .where(eq(users.id, user.id));

        console.log(`[updateBasicProfile] User profile updated for user ${user.id}.`);
        return { success: true, message: 'Profile updated successfully.' };

    } catch (error) {
        console.error("[updateBasicProfile] Error:", error);
        const message = error instanceof z.ZodError
            ? "Invalid profile data provided."
            : error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, message };
    }
}

export async function updateSelectedPackage(formData: FormData) {
     try {
        const user = await getAuthenticatedUser();
        const packageId = formData.get('packageId') as string;
        if (!packageId || typeof packageId !== 'string') {
            throw new Error('Invalid Package ID');
        }
        // Optional: Validate packageId exists
        const pkgExists = await db.query.packages.findFirst({ where: eq(packages.id, packageId) });
        if (!pkgExists) {
            return { success: false, message: "Selected package does not exist." };
        }

        await db.update(users)
            .set({
                selected_package_id: packageId,
                updated_at: new Date()
            })
            .where(eq(users.id, user.id));
        return { success: true, message: 'Package selection updated.' };
    } catch (error) {
        console.error("Error updating selected package:", error);
         return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

export async function completeBenefitSetup() {
    try {
        const user = await getAuthenticatedUser();
        console.log(`[CompleteSetup] Authenticated user ID: ${user.id}`);
        console.log(`[CompleteSetup] Attempting to set benefit_status to 'verified' for user: ${user.id}`);
        const updateResult = await db.update(users)
            .set({
                benefit_status: 'verified', // Assuming 'verified' is a valid enum value
                updated_at: new Date()
            })
            .where(eq(users.id, user.id))
            .returning({ updatedId: users.id, status: users.benefit_status });
        console.log(`[CompleteSetup] DB update result for user ${user.id}:`, updateResult);

        if (!updateResult || updateResult.length === 0 || updateResult[0].status !== 'verified') {
             console.error(`[CompleteSetup] Failed to verify status update in DB for user ${user.id}. Update result:`, updateResult);
             return { success: false, message: "Failed to confirm benefit status update in database." };
        }
        console.log("Benefit setup completed for user:", user.id);
        return { success: true, message: 'Benefit setup complete.' };
    } catch (error) {
        console.error("Error completing benefit setup:", error);
        return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

export async function searchOrganizations(query: string): Promise<{ id: string; label: string }[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }
    try {
        const results = await db
            .select({
                id: organizations.id,
                label: organizations.name,
            })
            .from(organizations)
            .where(ilike(organizations.name, `%${query}%`))
            .limit(10);
        return results;
    } catch (error) {
        console.error("Error searching organizations:", error);
        return [];
    }
}

interface FrontendPackage { // This interface seems specific to getBenefitPackages, consider renaming or localizing
    id: string;
    name: string;
    monthly_cost: number;
    isEmployerSponsored: boolean; // This logic might need re-evaluation based on user context
    description: string | null;
    benefits: string[]; // maps to key_benefits
}

export async function getBenefitPackages(): Promise<FrontendPackage[]> {
    // Removed userStatus as it's not directly used here for sponsorship decision
    // Sponsorship is better determined in context (e.g. when displaying for a specific user)
    try {
        const allPackages = await db
            .select({
                id: packages.id,
                name: packages.name,
                monthly_cost_str: packages.monthly_cost,
                description: packages.description,
                key_benefits: packages.key_benefits,
                is_base_employer_package: packages.is_base_employer_package
            })
            .from(packages)
            .orderBy(packages.monthly_cost); // Drizzle uses .asc() or .desc() on the column for orderBy

        const processedPackages: FrontendPackage[] = allPackages.map(pkg => {
            const monthlyCostNum = parseFloat(pkg.monthly_cost_str || '0');
            // isEmployerSponsored is hard to determine globally; depends on user's org
            return {
                id: pkg.id,
                name: pkg.name,
                monthly_cost: monthlyCostNum,
                isEmployerSponsored: pkg.is_base_employer_package, // Simplified: true if it's a base package
                description: pkg.description,
                benefits: pkg.key_benefits || []
            };
        });
        return processedPackages;
    } catch (error) {
        console.error("Error fetching benefit packages:", error);
        return [];
    }
}


export async function getUserWithSelectedPackage(): Promise<{
    success: boolean;
    user: UserWithPackageAndEmployerInfo | null;
    message: string;
}> {
    try {
        const authUser = await getAuthenticatedUser();
        console.log(`[getUserWithSelectedPackage] Authenticated user ID: ${authUser.id}`);
        const userProfile = await db.query.users.findFirst({
            where: eq(users.id, authUser.id),
            columns: {
                id: true,
                email: true,
                benefit_status: true,
                selected_package_id: true,
                sponsoring_organization_id: true,
            }
        });

        if (!userProfile) {
            console.error(`[getUserWithSelectedPackage] User profile not found for ID: ${authUser.id}`);
            return { success: false, user: null, message: "User profile not found." };
        }
        const user = userProfile; // No need for userProfile[0] with findFirst
        console.log(`[getUserWithSelectedPackage] User profile fetched:`, user);

        let selectedPackageDetails: SimplePackageDetails | null = null;
        let employerSponsoredPackageDetails: SimplePackageDetails | null = null;

        if (user.selected_package_id) {
            console.log(`[getUserWithSelectedPackage] Fetching selected package details for ID: ${user.selected_package_id}`);
            const selectedPkgResult = await db.query.packages.findFirst({
                where: eq(packages.id, user.selected_package_id),
                columns: {
                    id: true,
                    name: true,
                    monthly_cost: true, // This should be decimal in schema, ensure conversion
                    description: true,
                    is_base_employer_package: true,
                }
            });
            if (selectedPkgResult) {
                selectedPackageDetails = {
                    ...selectedPkgResult,
                    monthly_cost: parseFloat(selectedPkgResult.monthly_cost?.toString() || '0')
                };
                console.log(`[getUserWithSelectedPackage] Selected package details found:`, selectedPackageDetails);
            } else {
                 console.warn(`[getUserWithSelectedPackage] Selected package ID ${user.selected_package_id} exists on user, but package not found in DB.`);
            }
        }

        if (user.sponsoring_organization_id) {
             console.log(`[getUserWithSelectedPackage] Fetching employer sponsored package for Org ID: ${user.sponsoring_organization_id}`);
             const orgSpecificPackages = await db.select({ packageId: organization_packages.package_id })
                .from(organization_packages)
                .where(eq(organization_packages.organization_id, user.sponsoring_organization_id));

             if (orgSpecificPackages.length > 0) {
                const orgPackageIds = orgSpecificPackages.map(op => op.packageId);
                const employerPkgResult = await db.query.packages.findFirst({
                    where: and(
                        eq(packages.is_base_employer_package, true),
                        or(...orgPackageIds.map(id => eq(packages.id, id)))
                    ),
                    columns: {
                        id: true,
                        name: true,
                        monthly_cost: true,
                        description: true,
                        is_base_employer_package: true,
                    }
                });

                if (employerPkgResult) {
                    employerSponsoredPackageDetails = {
                        ...employerPkgResult,
                        monthly_cost: parseFloat(employerPkgResult.monthly_cost?.toString() || '0')
                    };
                    console.log(`[getUserWithSelectedPackage] Employer sponsored package details found:`, employerSponsoredPackageDetails);
                } else {
                    console.log(`[getUserWithSelectedPackage] No package marked as 'is_base_employer_package' found among those associated with Org ID: ${user.sponsoring_organization_id}`);
                }
             } else {
                 console.log(`[getUserWithSelectedPackage] No packages found associated with Org ID: ${user.sponsoring_organization_id} in organization_packages table.`);
             }
        }

        const finalUserData: UserWithPackageAndEmployerInfo = {
            id: user.id,
            email: user.email,
            benefit_status: user.benefit_status,
            sponsoring_organization_id: user.sponsoring_organization_id,
            selected_package_id: user.selected_package_id,
            selected_package: selectedPackageDetails,
            employer_sponsored_package: employerSponsoredPackageDetails,
        };
        console.log("[getUserWithSelectedPackage] Successfully fetched user and package info.");
        return { success: true, user: finalUserData, message: "User and package info retrieved." };

    } catch (error) {
        console.error("[getUserWithSelectedPackage] Error:", error);
        return {
            success: false,
            user: null,
            message: error instanceof Error ? error.message : "An unexpected error occurred while retrieving user package information.",
        };
    }
}

interface DashboardPackageInfo { // Defined within benefitActions.ts
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
    tier: PackageTier; // Added tier - Assuming PackageTier type is accessible or use specific enum values
}

interface UserDashboardData { // Defined within benefitActions.ts
    userId: string;
    userEmail: string | null;
    currentPackage: DashboardPackageInfo | null;
    allPackages: DashboardPackageInfo[]; // Uses updated DashboardPackageInfo
}

// Re-import PackageTier type if needed locally, or use the specific enum from schema
import type { PackageTier } from '@/types'; // Or adjust path/definition as needed
// Alternatively use: typeof packages.tier.enumValues[number]

export async function getUserDashboardData(): Promise<{
    success: boolean;
    data: UserDashboardData | null;
    message: string;
}> {
    console.log("[Action] getUserDashboardData started...");
    try {
        const user = await getAuthenticatedUser();
        const userRecord = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: {
                id: true,
                email: true,
                selected_package_id: true
            }
        });

        if (!userRecord) {
            throw new Error("Current user data not found.");
        }

        const allDbPackages = await db.query.packages.findMany({
            orderBy: (packages, { asc }) => [asc(packages.monthly_cost)],
            columns: {
                id: true,
                name: true,
                monthly_cost: true,
                description: true,
                key_benefits: true,
                is_base_employer_package: true,
                tier: true // Added tier selection
            }
        });

        const allPackagesInfo: DashboardPackageInfo[] = allDbPackages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            monthly_cost: parseFloat(pkg.monthly_cost?.toString() || '0'),
            description: pkg.description,
            key_benefits: pkg.key_benefits,
            is_base_employer_package: pkg.is_base_employer_package,
            tier: pkg.tier // Added tier mapping
        }));

        const currentPackageInfo = userRecord.selected_package_id
            ? allPackagesInfo.find(pkg => pkg.id === userRecord.selected_package_id) || null
            : null;

        const resultData: UserDashboardData = {
            userId: user.id,
            userEmail: userRecord.email || null,
            currentPackage: currentPackageInfo,
            allPackages: allPackagesInfo
        };
        console.log("[Action] getUserDashboardData finishing successfully.");
        return {
            success: true,
            data: resultData,
            message: 'User dashboard data fetched successfully.'
        };
    } catch (error: any) {
        console.error("[Action] Error in getUserDashboardData:", error);
        return {
            success: false,
            data: null,
            message: error.message || 'An unexpected error occurred fetching dashboard data.'
        };
    }
}

export async function selectPackageForUser(packageId: string): Promise<{ 
  success: boolean; 
  message?: string; 
  error?: any; 
}> {
  //'use server'; // Already declared at top of file typically, or ensure it is if needed
  try {
    const authUser = await getAuthenticatedUser();

    const existingPackage = await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
      columns: { id: true } // Only need to confirm existence
    });

    if (!existingPackage) {
      return { success: false, message: 'Selected package not found.' };
    }
    
    // TODO: Implement Stripe Checkout flow.
    // This action should create a Stripe Checkout session and return its ID 
    // to the client for redirection. The client will then use Stripe.js 
    // to redirect to the Stripe-hosted checkout page.
    // Ensure success_url and cancel_url are correctly handled, and consider
    // updating selected_package_id only after successful payment confirmation (e.g., via webhook).

    await db
      .update(users)
      .set({ selected_package_id: packageId, updated_at: new Date() })
      .where(eq(users.id, authUser.id));

    console.log(`User ${authUser.id} selected package ${packageId}`);
    return { success: true, message: 'Package selected successfully.' };

  } catch (error: any) {
    console.error('Error selecting package for user:', error);
    return { 
        success: false, 
        message: error.message || 'Failed to select package.', 
        error: error.message 
    };
  }
}