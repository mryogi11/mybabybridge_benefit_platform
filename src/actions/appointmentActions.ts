'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '../types/supabase'; // Using relative path
import {
  startOfDay,
  endOfDay,
  eachMinuteOfInterval,
  getDay,
  format,
  parse,
  set,
  addMinutes,
  isValid,
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
  eachMinuteOfInterval as dateFnsEachMinuteOfInterval,
  format as dateFnsFormat,
  parse as dateFnsParse,
  getDay as dateFnsGetDay,
  isBefore,
} from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { revalidatePath } from 'next/cache';
import { Appointment, Provider, Patient } from '@/types'; // Import the updated Appointment type and profile types (Removed UserProfile, Corrected Provider/Patient)

// --- Remove Legacy Helper ---
/*
const getSupabaseServerActionClient_Legacy = () => {
  const cookieStore = cookies();
  return createServerActionClient_Legacy<Database>({ cookies: () => cookieStore }); // Assuming Legacy client import name
};
*/

// --- REMOVE Problematic Helper Function ---
/*
const getSupabaseServerActionClient = () => {
  const cookieStore = cookies(); 
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
    {
      cookies: {
        get(name: string) {
          // This synchronous call causes errors
          const store = cookies(); 
          return store.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
             cookieStore.set({ name, value, ...options });
          } catch (error) {  }
        },
        remove(name: string, options: any) {
          try {
             cookieStore.set({ name, value: '', ...options });
          } catch (error) {  }
        },
      }
    }
  );
};
*/

// --- Helper Function to generate slots ---
function generateTimeSlots(start: Date, end: Date, intervalMinutes: number): Date[] {
  if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || start >= end || !isValid(start) || !isValid(end)) { // Added validity checks
      console.error("Invalid start/end date in generateTimeSlots:", { start, end });
      return [];
  }
  try {
     // Ensure the end time is adjusted slightly if it falls exactly on an interval boundary
     const adjustedEnd = new Date(end.getTime() - 1); // Subtract 1ms
     return dateFnsEachMinuteOfInterval({ start, end: adjustedEnd }, { step: intervalMinutes });
  } catch (error) {
      console.error("Error generating time slots:", { start, end, intervalMinutes }, error);
      return [];
  }
}

// --- Main Server Action for fetching available slots ---
export async function getAvailableSlots(
  providerProfileId: string,
  selectedDateStr: string // Expect 'yyyy-MM-dd'
): Promise<string[]> {
  console.log(`[Server Action] getAvailableSlots called`, { providerProfileId, selectedDateStr }); 
  
  // --- Create client directly within the async function ---
  const cookieStore = await cookies(); 
  
  // --- Log the raw cookie value (Corrected Name) --- 
  const authCookieName = 'sb-uenmvvraiamjzzgxsybf-auth-token'; 
  const rawAuthCookie = cookieStore.get(authCookieName);
  console.log(`[getAvailableSlots] Raw ${authCookieName} value:`, rawAuthCookie); 
  // --- End log --- 

  const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
      {
        cookies: {
          get(name: string) {
            // Now uses the awaited cookieStore
            return cookieStore.get(name)?.value;
          },
          // No set/remove needed for this read-only action
        }
      }
  );
  // --- End client creation ---
  
  if (!providerProfileId || !selectedDateStr || !/\d{4}-\d{2}-\d{2}/.test(selectedDateStr)) {
    console.error('Invalid input (provider or date string format missing)');
    return [];
  }

  // Check authentication (optional but good practice) - Restore Auth Check
  console.log("[getAvailableSlots] Attempting to get session..."); // Log before call
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession(); // Renamed data to sessionData
  console.log("[getAvailableSlots] getSession Result:", { sessionData, sessionError }); // Log result

  // Check if sessionData is null or if session within it is null
  if (sessionError || !sessionData?.session) { 
      console.error('Authentication error in getAvailableSlots:', sessionError?.message || 'Session or session data is null/undefined'); // Improved error log
      return []; // The function returns early here
  }
  // If we reach here, sessionData.session is valid
  const session = sessionData.session; // Assign to session variable
  console.log(`[getAvailableSlots] User authenticated: ${session.user.id}`); // Log auth success

  const appointmentDurationMinutes = 60;
  const targetTimeZone = 'America/New_York'; // TODO: Make this configurable per provider?

  let startOfDayUTC: Date;
  let endOfDayUTC: Date;
  let selectedDateInTargetTz: Date;
  let startOfDayInTargetTz: Date;
  let endOfDayInTargetTz: Date; // Declare here

  try {
    // --- Date Parsing and Timezone Handling ---
    try {
      const parsedDate = dateFnsParse(selectedDateStr, 'yyyy-MM-dd', new Date());
      if (!isValid(parsedDate)) { // Check validity after parsing
          throw new Error('Invalid date string format after parsing');
      }

      // Treat the parsed date (midnight) as being in the target timezone
      selectedDateInTargetTz = fromZonedTime(parsedDate, targetTimeZone);
       if (!isValid(selectedDateInTargetTz)) {
           throw new Error('Invalid date after fromZonedTime conversion');
       }

      startOfDayInTargetTz = dateFnsStartOfDay(selectedDateInTargetTz);
      endOfDayInTargetTz = dateFnsEndOfDay(selectedDateInTargetTz); // Assign value here

       if (!isValid(startOfDayInTargetTz) || !isValid(endOfDayInTargetTz)) {
            throw new Error('Invalid start/end of day in target timezone');
       }

      // Convert zoned start/end back to UTC Date objects for Supabase query
      // Supabase stores TIMESTAMPTZ as UTC
      startOfDayUTC = fromZonedTime(startOfDayInTargetTz, targetTimeZone); 
      endOfDayUTC = fromZonedTime(endOfDayInTargetTz, targetTimeZone);
      
      const startOfDayUTCString = formatInTimeZone(startOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      const endOfDayUTCString = formatInTimeZone(endOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

      if (!isValid(startOfDayUTC) || !isValid(endOfDayUTC)) {
          throw new Error('Invalid start/end of day UTC conversion');
      }

      // --- DEBUG LOG: Log Timezone Conversions ---
      console.log(`[getAvailableSlots] Interpreted '${selectedDateStr}' in ${targetTimeZone}:`);
      console.log(`  -> Selected Date in TZ: ${selectedDateInTargetTz.toISOString()}`);
      console.log(`  -> Start of Day in TZ: ${startOfDayInTargetTz.toISOString()}`);
      console.log(`  -> End of Day in TZ: ${endOfDayInTargetTz.toISOString()}`);
      console.log(`  -> UTC Start for Query: ${startOfDayUTCString}`);
      console.log(`  -> UTC End for Query: ${endOfDayUTCString}`);
      // --- END DEBUG LOG ---

    } catch(parseError: any) {
      console.error("Error processing date string and timezones:", parseError?.message || parseError);
      return [];
    }
    // --- End Date Parsing ---

    const dayOfWeek = dateFnsGetDay(selectedDateInTargetTz); // 0 (Sun) to 6 (Sat)
    console.log(`[getAvailableSlots] Calculated Day of Week: ${dayOfWeek}`); // Log day of week

    // --- Fetch Data in Parallel ---
    console.log('[getAvailableSlots] Fetching data from Supabase...');
    const startOfDayUTCString = formatInTimeZone(startOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"); // Use strings for query
    const endOfDayUTCString = formatInTimeZone(endOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    // --- Restore Promise.all --- 
    const [scheduleRes, blocksRes, appointmentsRes] = await Promise.all([
      // 1. Get Weekly Schedule for that day
      supabase
        .from('provider_weekly_schedules')
        .select('start_time, end_time')
        .eq('provider_id', providerProfileId)
        .eq('day_of_week', dayOfWeek),

      // 2. Get Specific Time Blocks for that day (overlapping the selected date range)
      supabase
        .from('provider_time_blocks')
        .select('start_datetime, end_datetime')
        .eq('provider_id', providerProfileId)
        .eq('is_unavailable', true)
        .lt('start_datetime', endOfDayUTCString) // Block starts before end of selected day (UTC)
        .gt('end_datetime', startOfDayUTCString), // Block ends after start of selected day (UTC)

      // 3. Get Existing Appointments for that day
      supabase
        .from('appointments')
        .select('appointment_date') // We only need the start time for filtering slots
        .eq('provider_id', providerProfileId)
        .gte('appointment_date', startOfDayUTCString)
        .lt('appointment_date', endOfDayUTCString)
        .in('status', ['scheduled', 'pending']), // Consider pending as potentially blocking
    ]);
    // --- End Restore Promise.all ---

    // --- Restore Error Handling ---
    if (scheduleRes.error) throw new Error(`Schedule fetch error: ${scheduleRes.error.message}`);
    if (blocksRes.error) throw new Error(`Blocks fetch error: ${blocksRes.error.message}`);
    if (appointmentsRes.error) throw new Error(`Appointments fetch error: ${appointmentsRes.error.message}`);
    // --- End Restore Error Handling ---

    const schedules = scheduleRes.data || [];
    const blocks = blocksRes.data || [];
    const existingAppointments = appointmentsRes.data || [];

    // --- DEBUG LOG: Log Fetched Data ---
    console.log(`[getAvailableSlots] Fetched Schedules (${schedules.length}):`, JSON.stringify(schedules));
    console.log(`[getAvailableSlots] Fetched Blocks (${blocks.length}):`, JSON.stringify(blocks));
    console.log(`[getAvailableSlots] Fetched Appointments (${existingAppointments.length}):`, JSON.stringify(existingAppointments));
    // --- END DEBUG LOG ---

    // --- Generate Potential Slots (using targetTimeZone dates) ---
    let potentialSlots: Date[] = [];
    if (schedules.length === 0) {
        console.log("No weekly schedule found for this provider on this day.");
    }
    for (const schedule of schedules) {
      try {
        // Parse HH:mm time string
        const startTimeParts = schedule.start_time?.split(':').map(Number);
        const endTimeParts = schedule.end_time?.split(':').map(Number);

        if (!startTimeParts || !endTimeParts || startTimeParts.length < 2 || endTimeParts.length < 2 || startTimeParts.some(isNaN) || endTimeParts.some(isNaN)) {
            console.warn("Invalid time format in schedule:", schedule);
            continue;
        }

        // Set time on the *target timezone* date object
        const scheduleStartDateTime = set(startOfDayInTargetTz, { hours: startTimeParts[0], minutes: startTimeParts[1], seconds: 0, milliseconds: 0 });
        const scheduleEndDateTime = set(startOfDayInTargetTz, { hours: endTimeParts[0], minutes: endTimeParts[1], seconds: 0, milliseconds: 0 });

         if (!isValid(scheduleStartDateTime) || !isValid(scheduleEndDateTime)) {
            console.warn("Invalid date created from schedule time:", schedule);
            continue;
         }

        console.log(`[getAvailableSlots] Generating slots for schedule: ${dateFnsFormat(scheduleStartDateTime, 'HH:mm')} - ${dateFnsFormat(scheduleEndDateTime, 'HH:mm')} in ${targetTimeZone}`);
        const generated = generateTimeSlots(scheduleStartDateTime, scheduleEndDateTime, appointmentDurationMinutes);
        // --- DEBUG LOG: Log generated slots per schedule --- 
        console.log(`  -> Generated ${generated.length} raw slots:`, generated.map(d => format(d, 'HH:mm'))); 
        // --- END DEBUG LOG ---
        potentialSlots = potentialSlots.concat(generated);

      } catch (timeParseError: any) {
        console.error("Error parsing schedule time or generating slots:", timeParseError?.message || timeParseError, schedule);
      }
    }

    // --- Remove Duplicates & Sort ---
    const uniqueTimestamps = new Set(potentialSlots.map(d => d.getTime()));
    potentialSlots = Array.from(uniqueTimestamps).map(ts => new Date(ts));
    potentialSlots.sort((a, b) => a.getTime() - b.getTime());
    console.log(`[getAvailableSlots] Potential slots after merging schedules and removing duplicates (${potentialSlots.length}):`, potentialSlots.map(d => format(d, 'HH:mm'))); // Log potential slots
     potentialSlots.forEach(slot => console.log(`  - Potential Slot (Target TZ): ${format(slot, 'yyyy-MM-dd HH:mm:ss zzzz')}`));


    // --- Filter Out Unavailable Slots ---
    console.log("[getAvailableSlots] Filtering potential slots..."); // Log start of filtering
    const availableSlots = potentialSlots.filter((slotStart) => {
        if (!isValid(slotStart)) {
             console.warn("Filtering invalid potential slot:", slotStart);
             return false;
        }
        const slotEnd = addMinutes(slotStart, appointmentDurationMinutes);
         if (!isValid(slotEnd)) {
             console.warn("Filtering invalid slot end time derived from:", slotStart);
             return false;
         }
        const slotStartStr = dateFnsFormat(slotStart, 'HH:mm'); // Simpler log
        // --- DEBUG LOG: Log each slot being checked ---
        console.log(` -> Checking slot: ${slotStartStr}`);
        // --- END DEBUG LOG ---

        // 1. Check against specific unavailable time blocks
        const isBlocked = blocks.some((block: { start_datetime: string, end_datetime: string }) => { // Added type annotation
             try {
                // Parse block UTC strings from DB into Date objects
                const blockStartUTC = new Date(block.start_datetime);
                const blockEndUTC = new Date(block.end_datetime);

                 if (!isValid(blockStartUTC) || !isValid(blockEndUTC)) {
                     console.warn("Invalid block date string from DB:", block);
                     return false; // Treat as non-blocking if invalid
                 }

                // Convert block UTC Date objects to the target timezone for comparison
                const blockStartTargetTz = toZonedTime(blockStartUTC, targetTimeZone);
                const blockEndTargetTz = toZonedTime(blockEndUTC, targetTimeZone);

                 if (!isValid(blockStartTargetTz) || !isValid(blockEndTargetTz)) {
                     console.warn("Invalid block date after TZ conversion:", block);
                     return false; // Treat as non-blocking if invalid
                 }

                // Check for overlap: (BlockStart < SlotEnd) && (BlockEnd > SlotStart)
                const overlap = blockStartTargetTz < slotEnd && blockEndTargetTz > slotStart;
                // --- DEBUG LOG: Block check ---
                if (overlap) {
                    console.log(`    - Slot ${slotStartStr} overlaps with Block: ${format(blockStartTargetTz, 'HH:mm')} - ${format(blockEndTargetTz, 'HH:mm')}`);
                }
                // --- END DEBUG LOG ---
                return overlap;
             } catch (blockParseError: any) {
                 console.error('Error processing time block during filtering:', blockParseError, block);
                 return false; // Don't block if error occurs
             }
        });

        if (isBlocked) return false; // Slot is blocked

        // 2. Check against existing appointments
        const isBooked = existingAppointments.some((appt: { appointment_date: string }) => { // Add type
            try {
                // Parse appointment UTC string from DB into a Date object
                const apptStartUTC = new Date(appt.appointment_date);
                 if (!isValid(apptStartUTC)) {
                     console.warn("Invalid appointment date string from DB:", appt);
                     return false; // Skip if invalid
                 }

                // Convert appointment UTC Date object to target timezone for comparison
                const apptStartTargetTz = toZonedTime(apptStartUTC, targetTimeZone);
                 if (!isValid(apptStartTargetTz)) {
                     console.warn("Invalid appointment date after TZ conversion:", appt);
                     return false; // Skip if invalid
                 }

                // Appointments are exact matches for the start time in this system
                // Check if the slotStart (in target TZ) matches the apptStart (in target TZ)
                const match = slotStart.getTime() === apptStartTargetTz.getTime();

                if (match) {
                    console.log(`  -> Booked at this time (Source UTC: ${appt.appointment_date})`);
                }
                return match;
            } catch (apptParseError: any) {
                 console.error('Error processing existing appointment during filtering:', apptParseError, appt);
                return false; // Don't block if error occurs
            }
        });

        if (isBooked) return false; // Slot is already booked

        // If not blocked and not booked, it's available
        console.log(`  -> Slot ${slotStartStr} IS available.`);
        return true; // Slot is available
    });

    // --- Format final slots --- 
    const finalSlots = availableSlots.map((date) => format(date, 'HH:mm'));

    console.log(`[getAvailableSlots] Final available slots (${finalSlots.length}):`, finalSlots); // Log final result
    return finalSlots;

  } catch (error: any) {
    console.error('[Server Action] Error in getAvailableSlots:', error?.message || error);
    // Consider more specific error handling or re-throwing if needed downstream
    return []; // Return empty array on failure
  }
}

// --- Server Action to Book an Appointment ---
export async function bookAppointment(
    patientAuthUserId: string, // Renamed parameter for clarity
    providerId: string,
    appointmentDateTimeStr: string, 
    duration: number,
    appointmentType: string,
    notes: string | null
): Promise<{ success: boolean; error?: string; appointment?: Appointment }> {
    console.log('[Server Action] bookAppointment called', { patientAuthUserId, providerId, appointmentDateTimeStr, duration, appointmentType });
    
    // --- Create client directly --- 
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
        {
          cookies: { get(name: string) { return cookieStore.get(name)?.value; } }
        }
    );
    // --- End client creation ---

    // --- Authentication Check ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Auth error booking appointment:', authError?.message);
        return { success: false, error: 'Authentication failed' };
    }
    // Verify the passed patientAuthUserId matches the logged-in user
    if (user.id !== patientAuthUserId) {
        console.error(`Auth mismatch: Logged in user ${user.id} differs from booking request patientAuthUserId ${patientAuthUserId}`);
        return { success: false, error: 'Authorization error' };
    }
    // --- End Auth Check ---

    // --- Fetch Patient Profile ID using Auth User ID --- 
    let patientProfileId: string;
    try {
        console.log(`Fetching patient profile ID for user_id: ${patientAuthUserId}`);
        const { data: profileData, error: profileError } = await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_id', patientAuthUserId) // Use the correct auth user ID
            .single();

        if (profileError) {
            console.error('Supabase error fetching patient profile ID:', profileError);
            throw profileError; // Throw to be caught below
        }
        if (!profileData) {
            throw new Error(`Patient profile not found for user ID: ${patientAuthUserId}`);
        }
        
        patientProfileId = profileData.id;
        console.log(`Found patient profile ID: ${patientProfileId}`);

    } catch (err: any) {
        console.error('Error fetching patient profile ID before booking:', err.message);
        return { success: false, error: 'Could not verify patient profile.' };
    }
    // --- End Fetch Patient Profile ID ---

    // --- Validation (using fetched patientProfileId) ---
    if (!patientProfileId || !providerId || !appointmentDateTimeStr || !duration || !appointmentType) {
        console.error('Booking failed: Missing required fields after profile lookup', { patientProfileId, providerId, appointmentDateTimeStr, duration, appointmentType });
        return { success: false, error: 'Missing required appointment details.' };
    }
    // --- End Validation ---

    try {
        // --- Date Conversion ---
        const appointmentDate = new Date(appointmentDateTimeStr);
        if (!isValid(appointmentDate)) {
            throw new Error('Invalid appointment date format provided.');
        }
        const appointmentDateISO = appointmentDate.toISOString(); 
        // --- End Date Conversion ---
        
        console.log('Attempting to insert appointment with:', { patient_id: patientProfileId, provider_id: providerId, appointment_date: appointmentDateISO });

        // --- Insert Appointment using Profile ID ---
        const { data: newAppointmentData, error: insertError } = await supabase
            .from('appointments')
            .insert({
                patient_id: patientProfileId, // Use the correct Profile ID
                provider_id: providerId,
                appointment_date: appointmentDateISO, 
                duration: duration,
                type: appointmentType,
                notes: notes,
                status: 'scheduled', // Default to scheduled
            })
            .select('*') // Select the newly inserted row
            .single();

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            throw insertError; // Throw to be caught below
        }
        // --- End Insert ---

        // Type assertion for the returned data (assuming select('*') works)
        const finalAppointment = newAppointmentData as Appointment;
        // Note: The nested provider/patient details won't be present unless explicitly selected/joined

        console.log('[Server Action] Appointment booked successfully:', finalAppointment.id);
        revalidatePath('/dashboard/appointments'); // Revalidate the path to show the new appointment
        return { success: true, appointment: finalAppointment };

    } catch (error: any) { // Catch errors from date conversion or insert
        console.error("Error during appointment insert process:", error);
        return { success: false, error: `Database error: ${error.message}` };
    }
}


// --- Server Action to Get Appointments for a User ---
// Fetches appointments based on user role (Patient or Provider)
export async function getAppointmentsForUser(
    userId: string,
    userRole: 'patient' | 'provider'
): Promise<Appointment[]> {
    console.log(`[Server Action] getAppointmentsForUser called for ${userRole} ID: ${userId}`);
    
    // --- Create client directly --- 
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
        {
          cookies: { get(name: string) { return cookieStore.get(name)?.value; } }
        }
    );
    // --- End client creation ---

    // --- Authentication Check ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Auth error fetching appointments:', authError?.message);
        return [];
    }
    // Optional: Verify logged-in user matches the requested userId (especially for patients)
    // This depends on how userId is derived (is it the auth user ID or profile ID?)
    // Assuming userId is the profile ID here. Let's fetch the profile to check the auth user ID.

    let filterColumn: 'patient_id' | 'provider_id';
    let profileTable: 'patient_profiles' | 'providers'; // Changed provider_profiles to providers

    if (userRole === 'patient') {
        filterColumn = 'patient_id';
        profileTable = 'patient_profiles';
    } else if (userRole === 'provider') {
        filterColumn = 'provider_id';
        profileTable = 'providers'; // Changed provider_profiles to providers
    } else {
        console.error("Invalid user role provided:", userRole);
        return [];
    }

    // --- Verify Profile Ownership ---
    const { data: profileCheck, error: profileCheckError } = await supabase
        .from(profileTable)
        .select('id')
        .eq('user_id', user.id) // Check against the authenticated user
        .eq('id', userId) // Check against the requested profile ID
        .maybeSingle(); // Use maybeSingle as it might not exist

    if (profileCheckError || !profileCheck) {
        console.error(`Authorization failed or profile not found for ${userRole} ${userId} and auth user ${user.id}:`, profileCheckError?.message);
        return []; // User is not authorized to view appointments for this profile ID
    }

    // --- Fetch Appointments with Nested Data ---
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*') // Select only direct appointment fields
            .eq(filterColumn, userId) // Filter by patient_id or provider_id
            .order('appointment_date', { ascending: true });

        if (error) {
            console.error('Error fetching appointments:', error);
            // Handle specific errors if needed (e.g., RLS)
            if (error.message.includes('Row level security policy violation')) {
                 console.warn("RLS policy prevented fetching appointments.");
                 return []; // Return empty array if RLS forbids access
            }
            throw error; // Re-throw other errors
        }

        // --- Data Transformation & Type Assertion ---
        // The select query aims to match the structure, but Supabase returns raw JSON.
        // We need to map and assert types carefully.

        const transformedAppointments: Appointment[] = (data || []).map((appt: any): Appointment | null => {
             // Basic validation of core fields
             if (!appt || !appt.id || !appt.appointment_date || !appt.status) {
                 console.warn("Skipping invalid appointment data from DB:", appt);
                 return null;
             }

             // Provider and Patient data are NOT fetched in this simplified version
             // let providerProfile: Provider | undefined = undefined; 
             // let patientProfile: Patient | undefined = undefined;

            return {
                id: appt.id,
                patient_id: appt.patient_id,
                provider_id: appt.provider_id,
                appointment_date: appt.appointment_date,
                duration: appt.duration,
                type: appt.type,
                status: ['scheduled', 'completed', 'cancelled', 'pending'].includes(appt.status)
                        ? appt.status as Appointment['status'] // Apply type assertion here
                        : 'pending',
                notes: appt.notes ?? null,
                created_at: appt.created_at,
                updated_at: appt.updated_at,
                provider: undefined, // Set to undefined as not fetched
                patient: undefined, // Set to undefined as not fetched
            };
        }).filter((appt): appt is Appointment => appt !== null); // Filter out any nulls from mapping/validation failures


        console.log(`[Server Action] Found ${transformedAppointments.length} appointments for ${userRole} ${userId}`);
        return transformedAppointments;

    } catch (error: any) {
        console.error(`[Server Action] Error fetching appointments for ${userRole} ${userId}:`, error?.message || error);
        return [];
    }
}


// --- Server Action to Update Appointment Status ---
export async function updateAppointmentStatus(
    appointmentId: string,
    newStatus: 'scheduled' | 'completed' | 'cancelled' | 'pending' // Ensure status is valid
): Promise<{ success: boolean; error?: string; appointment?: Appointment }> {
    console.log(`[Server Action] updateAppointmentStatus called for ID: ${appointmentId}, Status: ${newStatus}`);
    
    // --- Create client directly --- 
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
        {
          cookies: { get(name: string) { return cookieStore.get(name)?.value; } }
        }
    );
    // --- End client creation ---

    // --- Authentication & Authorization ---
    // Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Update status failed: Authentication error', authError?.message);
        return { success: false, error: 'Authentication failed.' };
    }

    // Fetch the appointment to check provider ownership (or patient, depending on rules)
    // RLS policies *should* handle this, but explicit checks add clarity/security layers.
    const { data: existingAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, patient_id, provider_id, appointment_date, status, notes, created_at, updated_at') // Removed duration, type
        .eq('id', appointmentId)
        .maybeSingle(); // Use maybeSingle as it might not exist or RLS might deny access


     if (fetchError) {
         console.error(`Update status failed: Error fetching appointment ${appointmentId}`, fetchError.message);
         return { success: false, error: `Database error: ${fetchError.message}` };
     }

     if (!existingAppointment) {
         console.error(`Update status failed: Appointment ${appointmentId} not found or access denied.`);
         return { success: false, error: 'Appointment not found or you do not have permission to modify it.' };
     }

    // Example Authorization Logic: Check if the logged-in user is the provider for this appointment
    // Adjust this based on your application's rules (e.g., patient can cancel?)
    const isProvider = existingAppointment.provider_id === user.id;
    // NOTE: This comparison assumes the `providers` table uses the `auth.users.id` as its primary key (`id` column).
    // If `providers.id` is a separate UUID and `providers.user_id` links to `auth.users.id`,
    // you would need to fetch the provider profile first or adjust the check accordingly.
    // For now, we assume existingAppointment.provider_id directly matches user.id for simplicity.

    // const isPatient = existingAppointment.patient?.user_id === user.id; // Patient check removed

    if (!isProvider) { // Simplified: only provider can change status
         console.error(`Update status failed: User ${user.id} is not the provider for appointment ${appointmentId}. Provider ID on appointment is ${existingAppointment.provider_id}`);
         return { success: false, error: 'You are not authorized to update this appointment status.' };
     }


    // --- Update Status ---
    try {
        const { data: updatedData, error: updateError } = await supabase
            .from('appointments')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(), // Update timestamp
            })
            .eq('id', appointmentId)
            .select('id, patient_id, provider_id, appointment_date, status, notes, created_at, updated_at') // Removed duration, type
            .single();

        if (updateError) {
            console.error('Supabase update error:', updateError);
             // Handle specific errors like RLS
             if (updateError.message.includes('Row level security policy violation')) {
                 return { success: false, error: 'You do not have permission to update this appointment.' };
             }
            return { success: false, error: `Database error: ${updateError.message}` };
        }

         if (!updatedData) {
             return { success: false, error: 'Failed to update appointment status or retrieve updated record.' };
        }

         // --- Data Transformation & Type Assertion ---
         let finalUpdatedAppointment: Appointment | null = null;
          if (updatedData) {
             // Provider and Patient data are NOT fetched in this simplified version
             // const providerProfile: Provider | undefined = undefined;
             // const patientProfile: Patient | undefined = undefined;

             // Construct the final object using only direct appointment fields
             finalUpdatedAppointment = {
                id: updatedData.id,
                patient_id: updatedData.patient_id,
                provider_id: updatedData.provider_id,
                appointment_date: updatedData.appointment_date,
                duration: 0, // Set default or fetch if column exists but wasn't selected
                type: '', // Set default or fetch if column exists but wasn't selected
                status: ['scheduled', 'completed', 'cancelled', 'pending'].includes(updatedData.status)
                        ? updatedData.status as Appointment['status'] // Apply type assertion here
                        : 'pending',
                notes: updatedData.notes ?? null,
                created_at: updatedData.created_at,
                updated_at: updatedData.updated_at,
                provider: undefined, // Set to undefined
                patient: undefined, // Set to undefined
             };
         }

         if (!finalUpdatedAppointment) {
              return { success: false, error: 'Failed to process updated appointment record.' };
         }

        console.log(`[Server Action] Appointment ${appointmentId} status updated to ${newStatus}`);

        // Revalidate relevant paths
        revalidatePath('/dashboard/appointments'); // Patient view
        revalidatePath('/provider/appointments'); // Provider view

        return { success: true, appointment: finalUpdatedAppointment };

    } catch (error: any) {
        console.error('[Server Action] Error updating appointment status:', error?.message || error);
        return { success: false, error: `An unexpected error occurred: ${error?.message || 'Unknown error'}` };
    }
}


// --- Fetch Provider Profiles (Example - Adapt as needed) ---
export async function getProviderProfiles(): Promise<Provider[]> {
    console.log('[Server Action] getProviderProfiles called');
    
    // --- Create client directly --- 
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
        {
          cookies: { get(name: string) { return cookieStore.get(name)?.value; } }
        }
    );
    // --- End client creation ---

    // --- Authentication Check (optional, depends if only logged-in users can see providers) ---
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //     console.error('Auth error fetching providers:', authError?.message);
    //     return [];
    // }

    try {
        const { data, error } = await supabase
            .from('providers') // Corrected table name
            .select(`
                id,
                specialization,
                bio, // Assuming bio is needed
                user_id, // Need user_id to potentially fetch user details separately
                // Attempt to fetch user details if relation exists
                user:users(id, email, raw_user_meta_data)
            `); // Simplified user select, removed !inner

        if (error) {
            console.error('Error fetching provider profiles:', error);
             if (error.message.includes('Row level security policy violation')) {
                 console.warn("RLS policy prevented fetching provider profiles.");
                 return [];
             }
            throw error;
        }

         // --- Data Transformation ---
         const transformedProfiles: Provider[] = (data || []).map((profile: any): Provider | null => {
             if (!profile || !profile.id || !profile.user || !profile.user.id) {
                 console.warn("Skipping invalid provider profile data from DB:", profile);
                 return null;
             }
             return {
                 id: profile.id,
                 user_id: profile.user_id,
                 first_name: profile.user?.raw_user_meta_data?.first_name ?? '',
                 last_name: profile.user?.raw_user_meta_data?.last_name ?? '',
                 // email: profile.user?.email, // Removed - Not on Provider type
                 specialization: profile.specialization ?? '',
                 bio: profile.bio ?? null,
             };
         }).filter((profile): profile is Provider => profile !== null);

        console.log(`[Server Action] Found ${transformedProfiles.length} provider profiles`);
        return transformedProfiles;

    } catch (error: any) {
        console.error('[Server Action] Error fetching provider profiles:', error?.message || error);
        return [];
    }
}

// --- Placeholder Function for Monthly Availability --- REMOVED
/*
export async function getMonthlyAvailability(
  providerId: string,
  month: number, // e.g., 0 for January, 11 for December
  year: number
//   accessToken: string | null | undefined // Removed - Server actions handle auth via cookies
): Promise<string[]> { // Return array of available date strings: ['YYYY-MM-DD']
  // ... function body removed ...
  return []; // Return empty array until real logic is implemented
}
*/ 