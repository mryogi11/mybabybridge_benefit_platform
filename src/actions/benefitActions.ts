'use server';

import { z } from 'zod';
import { eq, ilike } from 'drizzle-orm';
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Correct import and CookieOptions type
import { cookies } from 'next/headers';

import { db } from '@/lib/db'; // Adjust path as needed
import { users, organizations, packages, user_benefit_verification_attempts, benefitSourceEnum, benefitStatusEnum, organization_approved_emails } from '@/lib/db/schema'; // Adjust path as needed
import type { Database } from '@/types/supabase';

// --- Helper to get authenticated user (Using @supabase/ssr) ---
async function getAuthenticatedUser() {
    // Await the cookie store first
    const cookieStore = await cookies(); 
    
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // Use the resolved cookieStore
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Use the resolved cookieStore
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Handle potential errors during set operation
                        console.error("[getAuthenticatedUser Cookie Set Error]", error);
                    }
                },
                remove(name: string, options: CookieOptions) {
                    // Use the resolved cookieStore
                     try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // Handle potential errors during remove operation
                        console.error("[getAuthenticatedUser Cookie Remove Error]", error);
                    }
                },
            },
        }
    );
    
    // Use getUser() from the new client
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

// --- Type Definitions (using Zod for validation where applicable) --- //

// Matches benefitSourceEnum in schema.ts
const BenefitSourceSchema = z.enum(benefitSourceEnum.enumValues);

// Schema for verification data submitted in Step 3/4
const VerificationInfoSchema = z.object({
    sponsoringOrganizationId: z.string().uuid(), // From Step 2
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().date(), // Expecting YYYY-MM-DD format
    phoneNumber: z.string().min(5),
    workEmail: z.string().email().optional().or(z.literal('')),
    // Add address fields to schema
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    addressCity: z.string().min(2),
    addressState: z.string().min(2),
    addressPostalCode: z.string().min(3),
    addressCountry: z.string().min(2),
});
type VerificationInfo = z.infer<typeof VerificationInfoSchema>;

// --- NEW: Type for User with Package Info ---
interface UserWithPackage {
    id: string;
    email: string | null;
    benefit_status: typeof benefitStatusEnum.enumValues[number] | null;
    selected_package_id: string | null;
    selected_package_name: string | null;
    selected_package_cost: number | null;
    selected_package_description: string | null;
    // Add other fields as needed
}

// --- Server Actions --- //

/**
 * Updates the user's benefit source selection (Step 1).
 */
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

/**
 * Updates the user's selected sponsoring organization (Step 2).
 */
export async function updateSponsoringOrganization(formData: FormData) {
     try {
        const user = await getAuthenticatedUser();
        const organizationId = formData.get('organizationId') as string;

        // Basic validation
        if (!organizationId || typeof organizationId !== 'string') {
            throw new Error('Invalid Organization ID');
        }

        // TODO: Optional: Verify organizationId exists in the organizations table?

        await db.update(users)
            .set({ 
                sponsoring_organization_id: organizationId,
                updated_at: new Date(),
                // Maybe update status here? Or wait for verification submission
            })
            .where(eq(users.id, user.id));

        return { success: true, message: 'Sponsoring organization updated.' };

    } catch (error) {
        console.error("Error updating sponsoring organization:", error);
         return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

/**
 * Submits user's personal info for verification (Steps 3 & 4).
 * Creates a verification attempt record.
 * Verifies based on work email matching organization's approved email list.
 * Updates user status and assigns base package on success.
 */
export async function submitVerificationInfo(data: VerificationInfo) {
    let verificationAttemptId: string | null = null;
    let verificationStatus: 'success' | 'failed' = 'failed';
    let finalUserBenefitStatus: typeof benefitStatusEnum.enumValues[number] = 'declined';
    let failureReason: string | null = 'Verification failed.';

    try {
        const user = await getAuthenticatedUser();
        const validatedData = VerificationInfoSchema.parse(data);

        // --- 1. Create initial verification attempt record --- 
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

        // --- Intermediate Step: Update User Profile Info --- 
        // Update the main users table with the name and address info
        // regardless of verification outcome, as this is user-provided profile data.
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

        // --- 2. Perform Verification Logic --- 
        console.log(`[Verification] Attempting verification for user ${user.id}, attempt ${verificationAttemptId}`);
        
        if (!validatedData.workEmail) {
            console.log("[Verification] Failed: No work email submitted.");
            failureReason = "Work email is required for verification.";
        } else {
            // Check if the submitted work email exists in the approved list for the organization
            const submittedEmailLower = validatedData.workEmail.toLowerCase();
            try {
                const approvedEmailRecord = await db.select({ id: organization_approved_emails.id })
                    .from(organization_approved_emails)
                    .where(
                        eq(organization_approved_emails.organization_id, validatedData.sponsoringOrganizationId)
                        // Potential optimization: Store and compare lowercase emails in DB
                        // For now, comparing case-insensitively in the query (less optimal for large lists)
                        // Alternative: Fetch list and compare in code (case-insensitive)
                        // Let's fetch and compare in code for simplicity and case-insensitivity:
                        // eq(organization_approved_emails.email, submittedEmailLower)
                    )
                    .limit(1); // Check if *any* record exists for this org/email combo
                    // Corrected Approach: Fetch the email list and check in code

                const approvedEmails = await db.select({ email: organization_approved_emails.email })
                    .from(organization_approved_emails)
                    .where(eq(organization_approved_emails.organization_id, validatedData.sponsoringOrganizationId));
                
                const isApproved = approvedEmails.some(record => record.email.toLowerCase() === submittedEmailLower);

                if (isApproved) {
                    console.log(`[Verification] Success: Email ${submittedEmailLower} found in approved list for org ${validatedData.sponsoringOrganizationId}.`);
                    verificationStatus = 'success';
                    finalUserBenefitStatus = 'verified';
                    failureReason = null;
                } else {
                    console.log(`[Verification] Failed: Email ${submittedEmailLower} not found in approved list for org ${validatedData.sponsoringOrganizationId}.`);
                    failureReason = "Submitted work email is not on the approved list for this organization.";
                }
            } catch (dbError) {
                 console.error("[Verification] Database error checking approved emails:", dbError);
                 failureReason = "An error occurred during verification. Please try again.";
            }
        }
        
        // --- 3. Update verification attempt status --- 
        await db.update(user_benefit_verification_attempts)
            .set({
                status: verificationStatus,
                failure_reason: failureReason,
            })
            .where(eq(user_benefit_verification_attempts.id, verificationAttemptId));

        // --- 4. Update user's benefit_status --- 
        await db.update(users)
            .set({
                benefit_status: finalUserBenefitStatus,
            })
            .where(eq(users.id, user.id));

        // --- 5. Assign base package if verification was successful --- 
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

        // --- 6. Return result --- 
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
 * Updates the user's selected benefit package (Step 5).
 */
export async function updateSelectedPackage(formData: FormData) {
     try {
        const user = await getAuthenticatedUser();
        const packageId = formData.get('packageId') as string;

        // Basic validation
        if (!packageId || typeof packageId !== 'string') {
            throw new Error('Invalid Package ID');
        }
        // TODO: Optional: Verify packageId exists in the packages table?

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

/**
 * Marks the benefit setup as complete for the user.
 * (Called from Step 6 - Confirmation)
 * Ensures the user's benefit status is set to 'verified'.
 */
export async function completeBenefitSetup() {
    try {
        const user = await getAuthenticatedUser();
        console.log(`[CompleteSetup] Authenticated user ID: ${user.id}`);

        // Check current status - maybe only allow completion if already verified or pending?
        // const currentUserData = await db.select({ status: users.benefit_status }).from(users).where(eq(users.id, user.id)).limit(1);
        // const currentStatus = currentUserData[0]?.status;
        // if (currentStatus !== 'verified' && currentStatus !== 'pending_verification') { // Adjust condition as needed
        //     console.warn(`[CompleteSetup] User ${user.id} attempting to complete setup with unexpected status: ${currentStatus}`);
        //     // Decide whether to throw an error or proceed
        // }

        // Update status to 'verified' to confirm completion
        console.log(`[CompleteSetup] Attempting to set benefit_status to 'verified' for user: ${user.id}`);
        const updateResult = await db.update(users)
            .set({ 
                benefit_status: 'verified',
                updated_at: new Date()
            })
            .where(eq(users.id, user.id))
            .returning({ updatedId: users.id, status: users.benefit_status }); // Return ID and status

        console.log(`[CompleteSetup] DB update result for user ${user.id}:`, updateResult);

        if (!updateResult || updateResult.length === 0 || updateResult[0].status !== 'verified') {
             console.error(`[CompleteSetup] Failed to verify status update in DB for user ${user.id}. Update result:`, updateResult);
             // Optional: throw an error or return failure if update didn't seem to work
             // throw new Error("Database update for benefit status failed verification.");
        }

        console.log("Benefit setup completed for user:", user.id);

        return { success: true, message: 'Benefit setup complete.' };

    } catch (error) {
        console.error("Error completing benefit setup:", error);
        return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
    }
}

/**
 * Searches for sponsoring organizations based on a query string.
 * Returns a list of organizations formatted for Autocomplete.
 */
export async function searchOrganizations(query: string): Promise<{ id: string; label: string }[]> {
    // No auth check needed for public search, but could be added if required.
    if (!query || query.trim().length < 2) { // Basic validation: require at least 2 chars
        return [];
    }

    try {
        const results = await db
            .select({
                id: organizations.id,
                label: organizations.name, // Assuming the column is named 'name'
            })
            .from(organizations)
            .where(ilike(organizations.name, `%${query}%`)) // Case-insensitive search
            .limit(10); // Limit results for performance

        return results;
    } catch (error) {
        console.error("Error searching organizations:", error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches available benefit packages.
 * TODO: Enhance logic to filter packages based on user verification status and employer.
 */
interface FrontendPackage {
    id: string;
    name: string;
    monthly_cost: number;
    isEmployerSponsored: boolean; // Derived for the specific user
    description: string | null;
    benefits: string[];
}

export async function getBenefitPackages(): Promise<FrontendPackage[]> {
    // TODO: Get authenticated user to check their status/employer ID
    // const user = await getAuthenticatedUser(); 
    // const { benefit_status: userStatus, sponsoring_organization_id: employerId } = await db.select({ benefit_status: users.benefit_status, sponsoring_organization_id: users.sponsoring_organization_id }).from(users).where(eq(users.id, user.id)).limit(1).then(res => res[0] || {});
    
    // SIMULATED user status for now
    const userStatus = 'verified'; // Assume verified for fetching sponsored package info

    try {
        const allPackages = await db
            .select({
                id: packages.id,
                name: packages.name,
                monthly_cost_str: packages.monthly_cost, // Select as string
                description: packages.description,
                key_benefits: packages.key_benefits, // CORRECT COLUMN NAME
                is_base_employer_package: packages.is_base_employer_package // Use the correct boolean flag
            })
            .from(packages)
            .orderBy(packages.monthly_cost);

        // Process packages: convert cost, determine sponsorship for the user
        const processedPackages: FrontendPackage[] = allPackages.map(pkg => {
            const monthlyCostNum = parseFloat(pkg.monthly_cost_str || '0');
            
            // Determine if this package is sponsored FOR THIS USER
            // TODO: Replace this simulation with real logic.
            // Real logic might involve: 
            // 1. Checking if userStatus is 'verified'
            // 2. Fetching the default package ID associated with the user's sponsoring_organization_id
            // 3. Checking if this pkg.id matches the org's default package ID.
            // For now: Assume verified users get the package flagged as `is_base_employer_package` as their sponsored one.
            const isSponsoredForUser = userStatus === 'verified' && pkg.is_base_employer_package;

            return {
                id: pkg.id,
                name: pkg.name,
                monthly_cost: monthlyCostNum, // Use converted number
                isEmployerSponsored: isSponsoredForUser, 
                description: pkg.description,
                benefits: pkg.key_benefits || [] // Use key_benefits, default to empty array if null
            };
        });

        return processedPackages;

    } catch (error) {
        console.error("Error fetching benefit packages:", error);
        return [];
    }
}

/**
 * Fetches the authenticated user along with details of their selected package.
 */
export async function getUserWithSelectedPackage(): Promise<{ success: boolean; user: UserWithPackage | null; message: string }> {
    try {
        const authUser = await getAuthenticatedUser(); // Returns session user object

        // Fetch user data from DB using authUser.id
        const userData = await db.select({
            id: users.id,
            email: users.email,
            benefit_status: users.benefit_status,
            selected_package_id: users.selected_package_id,
            stripe_customer_id: users.stripe_customer_id, // Include stripe ID if needed
            selected_package_name: packages.name,
            selected_package_cost_str: packages.monthly_cost,
            selected_package_description: packages.description,
        })
        .from(users)
        .leftJoin(packages, eq(users.selected_package_id, packages.id))
        .where(eq(users.id, authUser.id)) // Use ID from session user
        .limit(1);

        if (!userData || userData.length === 0) {
            return { success: false, user: null, message: "User data not found." };
        }

        const userResult = userData[0];
        const processedUser: UserWithPackage = {
            ...userResult,
            email: userResult.email ?? null, // Ensure email is null if undefined
            selected_package_cost: userResult.selected_package_cost_str ? parseFloat(userResult.selected_package_cost_str) : null,
        };

        return { success: true, user: processedUser, message: "User data fetched successfully." };

    } catch (error) {
        console.error("Error fetching user with selected package:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        // Check for specific auth error
        if (errorMessage === "User is not authenticated.") {
             return { success: false, user: null, message: errorMessage };
        }
        return { success: false, user: null, message: `Failed to fetch user data: ${errorMessage}` };
    }
}

// --- NEW: Action for Dashboard Data ---

// Define the structure for a package to be returned
interface DashboardPackageInfo {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
}

// Define the structure for the dashboard data
interface UserDashboardData {
    userId: string;
    userEmail: string | null;
    currentPackage: DashboardPackageInfo | null;
    allPackages: DashboardPackageInfo[];
}

/**
 * Fetches data needed for the user dashboard (current package, all packages).
 */
export async function getUserDashboardData(): Promise<{
    success: boolean;
    data: UserDashboardData | null;
    message: string;
}> {
    try {
        const authUser = await getAuthenticatedUser();

        // 1. Fetch user's current selected package ID
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

        // 2. Fetch all available packages
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

        // Process all packages into the desired format
        const allPackagesInfo: DashboardPackageInfo[] = allDbPackages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            monthly_cost: parseFloat(pkg.monthly_cost_str || '0'),
            description: pkg.description,
            key_benefits: pkg.key_benefits,
            is_base_employer_package: pkg.is_base_employer_package
        }));

        // 3. Find the user's currently selected package from the fetched list
        const currentPackageInfo = user.selectedPackageId
            ? allPackagesInfo.find(pkg => pkg.id === user.selectedPackageId) || null
            : null;

        // 4. Assemble the final data structure
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