import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Test import
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'; 
// Corrected Supabase import
import { supabase } from '@/lib/supabase/client'; 
import { cookies } from 'next/headers';
// Correct import path for db (from directory index)
import { db } from '@/lib/db'; 
import { users } from '@/lib/db/schema'; // Schema comes from schema.ts directly
import { eq } from 'drizzle-orm';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { userRoleEnum } from '@/lib/db/schema'; // Schema enum comes from schema.ts directly
// Removed Database type import as it's not found in @/lib/types
// We need to find the correct location or generate Supabase types
// import type { Database } from '@/lib/types'; 

// Zod schema for validating the update payload
const UpdateUserSchema = z.object({
  // Add fields that admins are allowed to update
  // Example: role, name, etc. Make them optional if not all are required for update.
  role: z.enum(userRoleEnum.enumValues).optional(),
  // Combine first/last name from UI into a single 'name' field if desired,
  // or adjust schema and DB update logic to handle first_name/last_name separately.
  // For now, assuming the API expects separate fields potentially:
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  // Ensure the 'name' field in the schema matches what the client sends if you keep 'name'.
  // name: z.string().min(1).optional(), 
});

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  console.log(`PUT /api/admin/users/${params.userId} request received`);
  const cookieStore = cookies();
  // Note: Using the imported 'supabase' client directly.
  // This is the BROWSER client and likely incorrect for server-side auth.
  // Needs replacement with a proper server client setup.
  // const supabase = createServerClient(cookieStore); 

  // Authorize admin
  const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
  if (!authorized || !adminUser) {
    console.error(`Authorization failed for user update: ${authError}`);
    const status = authError === 'User not authenticated' ? 401 : 403;
    return NextResponse.json({ error: authError || 'Forbidden' }, { status });
  }
  console.log(`Admin user ${adminUser.email} authorized to update user ${params.userId}`);

  const userIdToUpdate = params.userId;
  if (!userIdToUpdate) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  let updatedData;
  try {
    updatedData = await req.json();
    console.log(`Received data for update:`, updatedData);
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate the incoming data
  const validation = UpdateUserSchema.safeParse(updatedData);
  if (!validation.success) {
    console.error('User update validation failed:', validation.error.errors);
    return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
  }

  const dataToUpdate = validation.data;
  console.log('Validated data for update:', dataToUpdate);

  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
  }

  try {
    // Fetch the user to ensure they exist before updating
    const existingUser = await db.select().from(users).where(eq(users.id, userIdToUpdate)).limit(1);
    if (existingUser.length === 0) {
        console.error(`User with ID ${userIdToUpdate} not found.`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`Attempting to update user ${userIdToUpdate} with data:`, dataToUpdate);
    const updatedUsers = await db
      .update(users)
      .set(dataToUpdate) // Ensure dataToUpdate fields match DB columns (first_name, last_name, role)
      .where(eq(users.id, userIdToUpdate))
      .returning(); // Return the updated user record

    if (updatedUsers.length === 0) {
      // This case might happen if the user was deleted between the check and the update
      console.error(`Failed to update user ${userIdToUpdate}, user might have been deleted.`);
      return NextResponse.json({ error: 'Failed to update user, user not found or update conflict.' }, { status: 404 });
    }

    console.log(`User ${userIdToUpdate} updated successfully by admin ${adminUser.email}.`);
    return NextResponse.json(updatedUsers[0]);

  } catch (error: any) {
    console.error(`Error updating user ${userIdToUpdate}:`, error);
    // Check for specific database errors if needed
    return NextResponse.json({ error: 'Internal server error during user update.', details: error.message }, { status: 500 });
  }
}

// Optional: Implement DELETE handler
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  console.log(`DELETE /api/admin/users/${params.userId} request received`);
  const cookieStore = cookies();
   // Note: Using the imported 'supabase' client directly.
  // This is the BROWSER client and likely incorrect for server-side auth.
   // Needs replacement with a proper server client setup.
  // const supabase = createServerClient(cookieStore);

  // Authorize admin
  const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
  if (!authorized || !adminUser) {
    console.error(`Authorization failed for user deletion: ${authError}`);
    const status = authError === 'User not authenticated' ? 401 : 403;
    return NextResponse.json({ error: authError || 'Forbidden' }, { status });
  }
   console.log(`Admin user ${adminUser.email} authorized to delete user ${params.userId}`);


  const userIdToDelete = params.userId;
  if (!userIdToDelete) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Prevent admin from deleting themselves? Optional check.
  // if (adminUser.id === userIdToDelete) {
  //   return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  // }

  try {
    console.log(`Attempting to delete user ${userIdToDelete}`);
    const deletedUsers = await db
      .delete(users)
      .where(eq(users.id, userIdToDelete))
      .returning({ id: users.id }); // Return the ID of the deleted user

    if (deletedUsers.length === 0) {
      console.warn(`User ${userIdToDelete} not found for deletion, might have been already deleted.`);
      // Still return success or 404? Depends on idempotency requirements. Let's return 404.
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`User ${userIdToDelete} deleted successfully by admin ${adminUser.email}.`);
    // Also consider deleting related data in Supabase Auth if necessary
    // const { error: authError } = await supabase.auth.admin.deleteUser(userIdToDelete);
    // if (authError) {
    //   console.error(`Failed to delete user ${userIdToDelete} from Supabase Auth:`, authError);
    //   // Handle this error - maybe log it but still return success for DB deletion?
    // }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 }); // Use 200 or 204

  } catch (error: any) {
    console.error(`Error deleting user ${userIdToDelete}:`, error);
    return NextResponse.json({ error: 'Internal server error during user deletion.', details: error.message }, { status: 500 });
  }
} 