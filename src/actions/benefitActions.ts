'use server';

import { z } from 'zod';
import { eq, ilike } from 'drizzle-orm';
import { createServerClient, type CookieOptions } from '@supabase/ssr'; 
import { cookies } from 'next/headers';
import { db } from '@/lib/db'; 
import { users, organizations, packages, user_benefit_verification_attempts, benefitSourceEnum, benefitStatusEnum, organization_approved_emails } from '@/lib/db/schema'; 
import type { Database } from '@/types/supabase';
import { alias } from 'drizzle-orm/pg-core';

// --- Helper to get authenticated user (Using @supabase/ssr) ---
async function getAuthenticatedUser() {
    const cookieStore = await cookies(); 
    const supabase = createServerClient<Database>(
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
    const { data: { user }, error } = await supabase.auth.getUser(); 
    if (error || !user) {
        console.error("[getAuthenticatedUser BenefitActions] Auth Error:", error);
        if (error?.message.includes('JWT')) {
             console.error("[getAuthenticatedUser BenefitActions] Potential JWT/Cookie parsing issue.");
        }
        throw new Error("User is not authenticated.");
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
    monthly_cost: number;
    description: string | null;
    is_base_employer_package: boolean;
}

interface UserWithPackageAndEmployerInfo {
    id: string;
    email: string | null;
    benefit_status: typeof benefitStatusEnum.enumValues[number] | null;
    sponsoring_organization_id: string | null; 
    selected_package_id: string | null;
    selected_package: SimplePackageDetails | null; 
    employer_sponsored_package: SimplePackageDetails | null;
}

// Schema for basic profile update (used in non-employer flow Step 3)
const BasicProfileSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    // DOB & Phone handled separately if needed in users table
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
            status: 'pending',
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
                const basePackage = await db.select({ id: packages.id })
                                          .from(packages)
                                          .where(eq(packages.is_base_employer_package, true))
                                          .limit(1);
                const basePackageId = basePackage[0]?.id;
                if (basePackageId) {
                    await db.update(users)
                          .set({ selected_package_id: basePackageId, updated_at: new Date() })
                          .where(eq(users.id, user.id));
                    console.log(`[Verification] Assigned base package ${basePackageId} to user ${user.id}`);
                } else {
                     console.warn("[Verification] No package marked as 'is_base_employer_package' found in DB.");
                }
            } catch (pkgError) {
                 console.error("[Verification] Error assigning base package:", pkgError);
            }
        }
        return {
            success: true, 
            message: verificationStatus === 'success' ? 'Verification successful!' : failureReason,
            verificationStatus: finalUserBenefitStatus 
        };
    } catch (error) {
        console.error("[Verification] Error submitting verification info:", error);
        if (verificationAttemptId) {
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
            verificationStatus: 'declined'
        };
    }
}

/**
 * NEW: Updates basic user profile info (name, address).
 * Used for non-employer flow Step 3 where only profile update is needed.
 */
export async function updateBasicProfile(data: BasicProfileData) {
    try {
        const user = await getAuthenticatedUser();
        console.log(`[updateBasicProfile] User ID: ${user.id}`);
        const validatedData = BasicProfileSchema.parse(data);
        console.log(`[updateBasicProfile] Validated Data:`, validatedData);

        const updateResult = await db.update(users)
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
            .where(eq(users.id, user.id))
            .returning({ updatedId: users.id }); 

        console.log(`[updateBasicProfile] DB update result:`, updateResult);
        if (!updateResult || updateResult.length === 0) {
            console.error(`[updateBasicProfile] Failed to update profile in DB for user ${user.id}.`);
            throw new Error("Failed to confirm profile update in database.");
        }
        console.log(`[updateBasicProfile] Successfully updated profile for user ${user.id}`);
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
                benefit_status: 'verified',
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

interface FrontendPackage {
    id: string;
    name: string;
    monthly_cost: number;
    isEmployerSponsored: boolean; 
    description: string | null;
    benefits: string[];
}

export async function getBenefitPackages(): Promise<FrontendPackage[]> {
    const userStatus = 'verified'; // Assume verified for fetching sponsored package info
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
            .orderBy(packages.monthly_cost);
        const processedPackages: FrontendPackage[] = allPackages.map(pkg => {
            const monthlyCostNum = parseFloat(pkg.monthly_cost_str || '0');
            const isSponsoredForUser = userStatus === 'verified' && pkg.is_base_employer_package;
            return {
                id: pkg.id,
                name: pkg.name,
                monthly_cost: monthlyCostNum, 
                isEmployerSponsored: isSponsoredForUser, 
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
        const userProfile = await db.select({
            id: users.id,
            email: users.email,
            benefit_status: users.benefit_status,
            selected_package_id: users.selected_package_id,
            sponsoring_organization_id: users.sponsoring_organization_id,
        }).from(users).where(eq(users.id, authUser.id)).limit(1);
        if (!userProfile || userProfile.length === 0) {
            console.error(`[getUserWithSelectedPackage] User profile not found for ID: ${authUser.id}`);
            return { success: false, user: null, message: "User profile not found." };
        }
        const user = userProfile[0];
        console.log(`[getUserWithSelectedPackage] User profile fetched:`, user);
        let selectedPackageDetails: SimplePackageDetails | null = null;
        let employerSponsoredPackageDetails: SimplePackageDetails | null = null;
        if (user.selected_package_id) {
            console.log(`[getUserWithSelectedPackage] Fetching selected package details for ID: ${user.selected_package_id}`);
            const selectedPkgResult = await db.select({
                id: packages.id,
                name: packages.name,
                monthly_cost: packages.monthly_cost,
                description: packages.description,
                is_base_employer_package: packages.is_base_employer_package,
            }).from(packages).where(eq(packages.id, user.selected_package_id)).limit(1);
            if (selectedPkgResult.length > 0) {
                // Ensure cost is a number
                selectedPackageDetails = {
                    ...selectedPkgResult[0],
                    monthly_cost: parseFloat(selectedPkgResult[0].monthly_cost?.toString() || '0') 
                };
                console.log(`[getUserWithSelectedPackage] Selected package details found:`, selectedPackageDetails);
            } else {
                 console.warn(`[getUserWithSelectedPackage] Selected package ID ${user.selected_package_id} exists on user, but package not found in DB.`);
            }
        }
        if (user.sponsoring_organization_id) {
             console.log(`[getUserWithSelectedPackage] Fetching employer sponsored package for Org ID: ${user.sponsoring_organization_id}`);
             const employerPkgResult = await db.select({
                id: packages.id,
                name: packages.name,
                monthly_cost: packages.monthly_cost, 
                description: packages.description,
                is_base_employer_package: packages.is_base_employer_package, 
            }).from(packages).where(
                eq(packages.organization_id, user.sponsoring_organization_id)
                && eq(packages.is_base_employer_package, true)
            ).limit(1);
            if (employerPkgResult.length > 0) {
                 // Ensure cost is a number
                employerSponsoredPackageDetails = {
                    ...employerPkgResult[0],
                    monthly_cost: parseFloat(employerPkgResult[0].monthly_cost?.toString() || '0')
                };
                console.log(`[getUserWithSelectedPackage] Employer sponsored package details found:`, employerSponsoredPackageDetails);
                 if (!employerSponsoredPackageDetails.is_base_employer_package) {
                    console.warn(`[getUserWithSelectedPackage] Found package for org ${user.sponsoring_organization_id}, but it's not marked as is_base_employer_package.`);
                 }
            } else {
                 console.log(`[getUserWithSelectedPackage] No employer sponsored package found for Org ID: ${user.sponsoring_organization_id}`);
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

interface DashboardPackageInfo {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
}

interface UserDashboardData {
    userId: string;
    userEmail: string | null;
    currentPackage: DashboardPackageInfo | null;
    allPackages: DashboardPackageInfo[];
}

export async function getUserDashboardData(): Promise<{
    success: boolean;
    data: UserDashboardData | null;
    message: string;
}> {
    try {
        const authUser = await getAuthenticatedUser();
        const currentUser = await db.select({
            id: users.id,
            email: users.email,
            selectedPackageId: users.selected_package_id
        })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);
        if (!currentUser || currentUser.length === 0) {
            throw new Error("Current user data not found.");
        }
        const user = currentUser[0];
        const allDbPackages = await db.select({
            id: packages.id,
            name: packages.name,
            monthly_cost_str: packages.monthly_cost,
            description: packages.description,
            key_benefits: packages.key_benefits,
            is_base_employer_package: packages.is_base_employer_package
        })
        .from(packages)
        .orderBy(packages.monthly_cost);
        const allPackagesInfo: DashboardPackageInfo[] = allDbPackages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            monthly_cost: parseFloat(pkg.monthly_cost_str || '0'),
            description: pkg.description,
            key_benefits: pkg.key_benefits,
            is_base_employer_package: pkg.is_base_employer_package
        }));
        const currentPackageInfo = user.selectedPackageId
            ? allPackagesInfo.find(pkg => pkg.id === user.selectedPackageId) || null
            : null;
        const dashboardData: UserDashboardData = {
            userId: user.id,
            userEmail: user.email,
            currentPackage: currentPackageInfo,
            allPackages: allPackagesInfo
        };
        return {
            success: true,
            data: dashboardData,
            message: "Dashboard data fetched successfully."
        };
    } catch (error) {
        console.error("Error fetching user dashboard data:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
         if (errorMessage === "User is not authenticated.") {
             return { success: false, data: null, message: errorMessage };
        }
        return { success: false, data: null, message: `Failed to fetch dashboard data: ${errorMessage}` };
    }
} 