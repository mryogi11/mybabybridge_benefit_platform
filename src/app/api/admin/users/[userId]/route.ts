import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Removed test import
// import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'; 
// Import the new server client function
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers'; // Keep cookies import for authorizeAdmin potentially
import { db } from '@/lib/db'; 
import { users } from '@/lib/db/schema'; // Schema comes from schema.ts directly
import { eq } from 'drizzle-orm';
import { authorizeAdmin } from '@/lib/auth/authorizeAdmin';
import { userRoleEnum } from '@/lib/db/schema'; // Schema enum comes from schema.ts directly
// Correct Database type import
import type { Database } from '@/types/supabase'; 
// Removed Database type import as it's not found in @/lib/types
// We need to find the correct location or generate Supabase types
// import type { Database } from '@/lib/types'; 
import { createActivityLog } from '@/lib/actions/loggingActions';

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

// Make handlers async as createSupabaseRouteHandlerClient is async
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  // Access userId from params once at the beginning
  const userIdToUpdate = params.userId;
  console.log(`PUT /api/admin/users/${userIdToUpdate} request received`);

  if (!userIdToUpdate) {
    // This check might be redundant if params.userId is guaranteed, but safe to keep
    return NextResponse.json({ error: 'User ID is required from route parameters' }, { status: 400 });
  }

  // Use the server client function
  const supabase = await createSupabaseRouteHandlerClient();

  // Authorize admin
  const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
  if (!authorized || !adminUser) {
    console.error(`Authorization failed for user update: ${authError}`);
    const status = authError === 'User not authenticated' ? 401 : 403;
    return NextResponse.json({ error: authError || 'Forbidden' }, { status });
  }
  // Use the local variable
  console.log(`Admin user ${adminUser.email} authorized to update user ${userIdToUpdate}`);

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
    await createActivityLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      actionType: 'USER_UPDATE',
      targetEntityType: 'USER',
      targetEntityId: userIdToUpdate,
      status: 'SUCCESS',
      description: `User ${userIdToUpdate} updated by admin.`
    });
    return NextResponse.json(updatedUsers[0]);

  } catch (error: any) {
    console.error(`Error updating user ${userIdToUpdate}:`, error);
    // Check for specific database errors if needed
    await createActivityLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      actionType: 'USER_UPDATE',
      targetEntityType: 'USER',
      targetEntityId: userIdToUpdate,
      status: 'FAILURE',
      description: `Failed to update user ${userIdToUpdate}. Error: ${error}`
    });
    return NextResponse.json({ error: 'Internal server error during user update.', details: error.message }, { status: 500 });
  }
}

// Optional: Implement DELETE handler
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  // Access userId from params once at the beginning
  const userIdToDelete = params.userId;
  console.log(`DELETE /api/admin/users/${userIdToDelete} request received`);

  if (!userIdToDelete) {
    // This check might be redundant if params.userId is guaranteed, but safe to keep
    return NextResponse.json({ error: 'User ID is required from route parameters' }, { status: 400 });
  }

   // Use the server client function
  const supabase = await createSupabaseRouteHandlerClient();

  // Authorize admin
  const { authorized, user: adminUser, error: authError } = await authorizeAdmin(req);
  if (!authorized || !adminUser) {
    console.error(`Authorization failed for user deletion: ${authError}`);
    const status = authError === 'User not authenticated' ? 401 : 403;
    return NextResponse.json({ error: authError || 'Forbidden' }, { status });
  }
   // Use the local variable
   console.log(`Admin user ${adminUser.email} authorized to delete user ${userIdToDelete}`);

   // const userIdToDelete = params.userId; // Remove repeated access
   // if (!userIdToDelete) { ... } // Remove repeated check

  // Prevent admin from deleting themselves? Optional check.
  // if (adminUser.id === userIdToDelete) {
  //   return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  // }

  try {
    // Use the local variable
    console.log(`Attempting to delete user ${userIdToDelete}`);
    // Execute the delete command, but ignore the potentially misleading .returning() result for success check
    await db
      .delete(users)
      .where(eq(users.id, userIdToDelete));
      // .returning({ id: users.id }); // Remove or ignore .returning() for success check

    // --- Verification Step --- 
    console.log(`Verifying deletion for user ${userIdToDelete}...`);
    const verifyUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userIdToDelete))
      .limit(1);
    
    console.log(`Verification query result: ${JSON.stringify(verifyUser)} (Length: ${verifyUser.length})`);

    // Check if the verification query found the user
    if (verifyUser.length > 0) {
      // If user still exists, the delete failed despite no error from the delete command
      console.error(`CRITICAL: Delete command executed for user ${userIdToDelete} but user still found in DB. Delete failed.`);
      return NextResponse.json({ error: 'Internal server error: Failed to verify user deletion.' }, { status: 500 });
    }
    // --- End Verification Step ---

    // If verification passed (user not found), proceed with success logic
    console.log(`User ${userIdToDelete} deletion verified successfully.`);

    // --- Delete user from Supabase Auth as well --- 
    console.log(`Attempting to delete user ${userIdToDelete} from Supabase Auth...`);
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userIdToDelete);
    
    if (authDeleteError) {
         // Log the error but potentially still return success for the DB deletion?
         // Or return a specific error indicating partial failure?
         // For now, log warning and continue to return success as DB delete worked.
         console.warn(`DB user ${userIdToDelete} deleted, but failed to delete from Supabase Auth:`, authDeleteError);
         // Optionally, return a different response or status code here
         // return NextResponse.json({ message: 'User deleted from DB but failed to delete from Auth.', error: authDeleteError.message }, { status: 207 }); // 207 Multi-Status
    } else {
        console.log(`User ${userIdToDelete} successfully deleted from Supabase Auth.`);
    }
    // --- End Supabase Auth Deletion ---

    await createActivityLog({
      userId: adminUser.id,
      userEmail: adminUser.email,
      actionType: 'USER_DELETE',
      targetEntityType: 'USER',
      targetEntityId: userIdToDelete,
      status: 'SUCCESS',
      description: `User ${userIdToDelete} deleted by admin.`
    });
    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 }); 

  } catch (error: any) {
    // Use the local variable
    console.error(`Error during user deletion process for ${userIdToDelete}:`, error);
    await createActivityLog({
      userId: adminUser?.id,
      userEmail: adminUser?.email,
      actionType: 'USER_DELETE',
      targetEntityType: 'USER',
      targetEntityId: userIdToDelete,
      status: 'FAILURE',
      description: `Failed to delete user ${userIdToDelete}. Error: ${error}`
    });
    return NextResponse.json({ error: 'Internal server error during user deletion.', details: error.message }, { status: 500 });
  }
} 