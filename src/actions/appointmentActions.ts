'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../types/supabase'; // Using relative path
import {
  startOfDay,
  endOfDay,
  eachMinuteOfInterval,
  isWithinInterval,
  getDay,
  format,
  parse,
  set,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isBefore,
  isAfter,
  addMinutes,
  isValid, 
  getHours, 
  getMinutes, 
  areIntervalsOverlapping, 
  isEqual, 
  addDays, 
  addMinutes as dateFnsAddMinutes,
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
  eachMinuteOfInterval as dateFnsEachMinuteOfInterval,
  format as dateFnsFormat,
  parse as dateFnsParse,
  getDay as dateFnsGetDay,
  isWithinInterval as dateFnsIsWithinInterval
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz'; 
import { revalidatePath } from 'next/cache'; // Import for revalidation
import { createClient } from '@supabase/supabase-js'; // Import standard client creator
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Appointment } from '@/types'; // Import the updated Appointment type

// --- Helper Function to generate slots ---
function generateTimeSlots(start: Date, end: Date, intervalMinutes: number): Date[] {
  if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || start >= end) return []; // Added more robust checks
  try {
     // Ensure the end time is adjusted slightly if it falls exactly on an interval boundary
     // This helps include the last potential slot if the end time is, e.g., 17:00 and interval is 60 mins.
     const adjustedEnd = new Date(end.getTime() - 1); // Subtract 1ms
     return dateFnsEachMinuteOfInterval({ start, end: adjustedEnd }, { step: intervalMinutes });
  } catch (error) {
      console.error("Error generating time slots:", { start, end, intervalMinutes }, error);
      return [];
  }
}

// --- Main Server Action (Corrected Date Parsing Again) ---
export async function getAvailableSlots(
  providerProfileId: string, 
  selectedDateStr: string, // Expect 'yyyy-MM-dd'
  accessToken: string 
): Promise<string[]> {
  console.log('[Server Action] getAvailableSlots called', { providerProfileId, selectedDateStr });

  if (!providerProfileId || !selectedDateStr || !/\d{4}-\d{2}-\d{2}/.test(selectedDateStr) || !accessToken) {
    console.error('Invalid input (provider, date string format, or token missing)');
    return [];
  }

  // --- Initialize client with token ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key not configured.");
    return [];
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  // --- End client initialization ---

  const appointmentDurationMinutes = 60; 
  const targetTimeZone = 'America/New_York'; 

  // Declare variables outside the try block for broader scope
  let startOfDayUTC: Date;
  let endOfDayUTC: Date;
  let selectedDateInTargetTz: Date;
  let startOfDayInTargetTz: Date; // Declare here
  
  try {
    // --- Corrected Date Parsing Again --- 
    try {
      // 1. Parse the 'yyyy-MM-dd' string into a basic Date object.
      //    This object technically represents midnight UTC on that date.
      const parsedDate = dateFnsParse(selectedDateStr, 'yyyy-MM-dd', new Date());
      if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date string format');
      }

      // 2. Convert this parsed date (interpreted as local time in the target zone) to a proper Zoned Time object.
      //    Example: If parsedDate is Apr 14 00:00:00 UTC, treat it as Apr 14 00:00:00 America/New_York.
      selectedDateInTargetTz = fromZonedTime(parsedDate, targetTimeZone);
      // At this point, selectedDateInTargetTz IS the correct Date object representing Apr 14 00:00:00 in NY time.
      // Its internal UTC value will be adjusted accordingly (e.g., Apr 14 04:00:00 UTC during EDT).

      // 3. Calculate start and end of this day *in the target timezone*.
      startOfDayInTargetTz = dateFnsStartOfDay(selectedDateInTargetTz); // Initialize here
      const endOfDayInTargetTz = dateFnsEndOfDay(selectedDateInTargetTz);
      
      // 4. Convert these start/end zoned times back to simple UTC Date objects for the database query.
      startOfDayUTC = fromZonedTime(startOfDayInTargetTz, targetTimeZone); // Convert zoned start -> UTC
      endOfDayUTC = fromZonedTime(endOfDayInTargetTz, targetTimeZone); // Convert zoned end -> UTC

      console.log(`Interpreted '${selectedDateStr}' in ${targetTimeZone}:`);
      console.log(` -> Zoned Start: ${format(startOfDayInTargetTz, 'yyyy-MM-dd HH:mm:ss zzzz')}`);
      console.log(` -> UTC Start for Query: ${startOfDayUTC.toISOString()}`);
      console.log(` -> UTC End for Query: ${endOfDayUTC.toISOString()}`);
      
    } catch(parseError: any) {
      console.error("Error processing date string and timezones:", parseError);
      return [];
    }
    // --- End Date Parsing ---

    const dayOfWeek = dateFnsGetDay(selectedDateInTargetTz); 

    // --- Fetch Data in Parallel (Using startOfDayUTC and endOfDayUTC) --- 
    console.log('[Server Action] Fetching data using provided token...'); 
    const [scheduleRes, blocksRes, appointmentsRes] = await Promise.all([
      // 1. Get Weekly Schedule for that day
      supabase // This client uses the token
        .from('provider_weekly_schedules')
        .select('start_time, end_time')
        .eq('provider_id', providerProfileId)
        .eq('day_of_week', dayOfWeek),

      // 2. Get Specific Time Blocks for that day (overlapping the selected date range)
      supabase
        .from('provider_time_blocks')
        .select('start_datetime, end_datetime')
        .eq('provider_id', providerProfileId)
        .eq('is_unavailable', true) // Ensure we only get unavailable blocks
        .lt('start_datetime', endOfDayUTC.toISOString()) // Starts before end of selected day
        .gt('end_datetime', startOfDayUTC.toISOString()), // Ends after start of selected day

      // 3. Get Existing Appointments for that day
      supabase
        .from('appointments')
        .select('appointment_date') // We only need the start time
        .eq('provider_id', providerProfileId)
        .gte('appointment_date', startOfDayUTC.toISOString())
        .lt('appointment_date', endOfDayUTC.toISOString())
        .in('status', ['scheduled']), // Only consider scheduled appointments
    ]);

    // --- Error Handling ---
    if (scheduleRes.error) throw new Error(`Schedule fetch error: ${scheduleRes.error.message}`);
    if (blocksRes.error) throw new Error(`Blocks fetch error: ${blocksRes.error.message}`);
    if (appointmentsRes.error) throw new Error(`Appointments fetch error: ${appointmentsRes.error.message}`);

    const schedules = scheduleRes.data || [];
    const blocks = blocksRes.data || [];
    const existingAppointments = appointmentsRes.data || [];

    // --- Generate Potential Slots (using startOfDayInTargetTz) ---
    let potentialSlots: Date[] = [];
    for (const schedule of schedules) {
      // Parse HH:mm time string and combine with the selected date in the target timezone
      try {
        const startTimeParts = schedule.start_time.split(':').map(Number);
        const endTimeParts = schedule.end_time.split(':').map(Number);

        // Ensure parts are valid numbers
        if (startTimeParts.length < 2 || endTimeParts.length < 2 || startTimeParts.some(isNaN) || endTimeParts.some(isNaN)) {
            console.warn("Invalid time format in schedule:", schedule);
            continue; // Skip this schedule entry
        }

        const scheduleStartDateTime = set(startOfDayInTargetTz, { hours: startTimeParts[0], minutes: startTimeParts[1] });
        const scheduleEndDateTime = set(startOfDayInTargetTz, { hours: endTimeParts[0], minutes: endTimeParts[1] });

        // Add slots generated from this schedule entry
        const generated = generateTimeSlots(scheduleStartDateTime, scheduleEndDateTime, appointmentDurationMinutes);
        potentialSlots = potentialSlots.concat(generated);

      } catch (timeParseError) {
        console.error("Error parsing schedule time or generating slots:", timeParseError, schedule);
      }
    }
    
    // --- Remove Duplicates (if multiple schedules overlap) ---
    // Convert dates to timestamps for unique checking
    const uniqueTimestamps = new Set(potentialSlots.map(d => d.getTime()));
    potentialSlots = Array.from(uniqueTimestamps).map(ts => new Date(ts));
    potentialSlots.sort((a, b) => a.getTime() - b.getTime()); // Ensure sorted order


    // --- Filter Out Unavailable Slots (using targetTimeZone) ---
    const availableSlots = potentialSlots.filter((slotStart) => {
        if (!(slotStart instanceof Date)) return false; // Ensure it's a valid Date
        const slotEnd = new Date(slotStart.getTime() + appointmentDurationMinutes * 60000);
        const slotStartStr = format(slotStart, 'yyyy-MM-dd HH:mm:ss zzzz'); // Log slot times

        // Check against specific time blocks
        const isBlocked = blocks.some((block) => {
             try {
                // Log the raw UTC strings from DB
                const blockStartUTCStr = block.start_datetime;
                const blockEndUTCStr = block.end_datetime;
                // Convert block UTC times to target timezone Date objects for comparison
                const blockStart = toZonedTime(new Date(block.start_datetime), targetTimeZone);
                const blockEnd = toZonedTime(new Date(block.end_datetime), targetTimeZone);
                const overlap = slotStart < blockEnd && slotEnd > blockStart;

                // Updated Detailed Log
                console.log(`    [Filter Check] Slot: ${slotStartStr} | Block (UTC): ${blockStartUTCStr} to ${blockEndUTCStr} | Block (NY): ${format(blockStart, 'HH:mm')} - ${format(blockEnd, 'HH:mm')} | Overlap: ${overlap}`);
                // End Updated Log

                return overlap;
             } catch (blockDateError) {
                 console.error("Error processing block date:", block, blockDateError);
                 return false; // Treat as not blocked if error occurs during processing
             }
        });

        if (isBlocked) {
            console.log(`    -> Slot ${format(slotStart, 'HH:mm')} is BLOCKED.`); // Log blockage
            return false;
        }

        // Check against existing appointments
        const isBooked = existingAppointments.some((appt) => {
            try {
                // Convert appointment UTC time to target timezone Date object
                const apptStart = toZonedTime(new Date(appt.appointment_date), targetTimeZone);
                const apptEnd = new Date(apptStart.getTime() + appointmentDurationMinutes * 60000); // Assume same duration
                const bookedOverlap = slotStart < apptEnd && slotEnd > apptStart;

                 // --- Added Detailed Log (Optional but helpful) ---
                 if (bookedOverlap) { // Only log if there's an overlap
                     console.log(`    [Filter Check] Slot: ${slotStartStr} | Existing Appt: ${format(apptStart, 'HH:mm')} | Overlap: ${bookedOverlap}`);
                 }
                 // --- End Log ---
                
                return bookedOverlap;
            } catch (apptDateError) {
                console.error("Error processing appointment date:", appt, apptDateError);
                return false; // Treat as not booked if error occurs
            }
        });

        if (isBooked) {
             console.log(`    -> Slot ${format(slotStart, 'HH:mm')} is BOOKED.`); // Log booking
            return false;
        }


        // Slot is available if not blocked and not booked
        console.log(`    -> Slot ${format(slotStart, 'HH:mm')} is AVAILABLE.`); // Log availability
        return true;
    });

    // --- Format Available Slots ---
    // Format the Date objects back to HH:mm strings in the target timezone
    const formattedSlots = availableSlots.map((slot) => format(slot, 'HH:mm')); // No need for TZ here, format uses local time of Date object

    console.log("[Server Action] Available Slots:", formattedSlots);
    return formattedSlots;

  } catch (error: any) {
    console.error("[Server Action] Error in getAvailableSlots:", error);
    return []; // Return empty array on error
  }
}

// --- bookAppointment Implementation (Modified) ---
export async function bookAppointment(bookingDetails: { 
    providerId: string; 
    patientUserId: string; // Added patientUserId based on modal data
    dateTime: Date; 
    notes: string; 
    accessToken: string; // Added accessToken parameter
}): Promise<{ success: boolean; error?: string }> {
    console.log("[Server Action] bookAppointment called (with token)", bookingDetails);
    // const supabase = createServerActionClient<Database>({ cookies }); // Remove cookie helper
    const { providerId, patientUserId, dateTime, notes, accessToken } = bookingDetails;
    const targetTimeZone = 'America/New_York'; // Use the same timezone as getAvailableSlots

    if (!providerId || !patientUserId || !dateTime || !accessToken) { // Added token check
        console.error("[Server Action] Invalid booking details (missing info or token):", bookingDetails);
        return { success: false, error: "Missing required booking information or authentication." };
    }

    // --- Initialize client with token ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or Anon Key not configured.");
        return { success: false, error: "Server configuration error." };
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
    // --- End client initialization ---

    try {
        // 1. Get Patient Profile ID from User ID
        console.log(`[Server Action] Looking up patient profile for user_id: ${patientUserId}`);
        const { data: patientData, error: profileError } = await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_id', patientUserId)
            .single();

        if (profileError) {
            console.error('[Server Action] Error fetching patient profile:', profileError);
            // Handle case where profile doesn't exist for the user
            if (profileError.code === 'PGRST116') {
                return { success: false, error: "Patient profile not found for this user." };
            }
            return { success: false, error: "Database error fetching patient details." };
        }

        if (!patientData) {
            console.error('[Server Action] Patient profile data is null unexpectedly.');
            return { success: false, error: "Could not retrieve patient profile." };
        }

        const patientProfileId = patientData.id;
        console.log(`[Server Action] Found patient profile ID: ${patientProfileId}`);

        // 2. Convert dateTime to UTC using the target timezone
        // Assume incoming dateTime needs to be interpreted in the target timezone, then converted to UTC
        const dateTimeUTC = fromZonedTime(dateTime, targetTimeZone);
        console.log(`Converted booking time: ${dateTime.toISOString()} -> ${dateTimeUTC.toISOString()} (UTC)`);

        // 3. Final Availability Check (using token-authenticated client)
        console.log("[Server Action] Checking existing appointment using token..."); // Added log
        const { data: existingAppointment, error: checkError } = await supabase // Uses token client
            .from('appointments')
            .select('id')
            .eq('provider_id', providerId)
            .eq('appointment_date', dateTimeUTC.toISOString()) // Check exact timestamp in UTC
            .in('status', ['scheduled', 'confirmed']) // Check against active appointments
            .maybeSingle(); // Expect 0 or 1 result

        if (checkError) {
            console.error("[Server Action] Error checking existing appointment:", checkError);
            throw new Error("Database error checking availability.");
        }

        if (existingAppointment) {
            console.warn("[Server Action] Slot already booked:", existingAppointment);
            return { success: false, error: "This time slot is no longer available. Please select another time." };
        }

        // 4. Insert the new appointment using the correct Patient Profile ID
        const { error: insertError } = await supabase
            .from('appointments')
            .insert({
                provider_id: providerId,
                patient_id: patientProfileId, // Use the CORRECT patient profile ID
                appointment_date: dateTimeUTC.toISOString(),
                status: 'scheduled', // Default status
                notes: notes,
                // created_at defaults to now()
            });

        if (insertError) {
            console.error("[Server Action] Error inserting appointment:", insertError);
            // Provide more specific feedback if possible (e.g., constraint violation)
            if (insertError.code === '23505') { // Unique constraint violation
                 return { success: false, error: "Failed to book appointment. Please try again." }; 
            }
             if (insertError.code === '23503') { // Foreign key violation
                 return { success: false, error: "Invalid provider or patient ID." }; 
            }
            throw new Error("Failed to save the appointment.");
        }

        console.log("[Server Action] Appointment booked successfully:", { providerId, patientUserId, dateTimeUTC });

        // 4. Revalidate Paths (optional but recommended)
        revalidatePath('/dashboard/appointments'); // Revalidate patient's view
        revalidatePath(`/provider/appointments`); // Revalidate provider's view (dynamic path if needed)
        // Consider revalidating the provider availability page too if it shows booked slots
        // revalidatePath(`/provider/availability`);

        return { success: true };

    } catch (error: any) {
        console.error("[Server Action] Error in bookAppointment:", error);
        return { success: false, error: error.message || "An unexpected error occurred while booking." };
    }
}

// --- Updated Server Action for Monthly Availability --- 
export async function getMonthlyAvailability(
    providerId: string, 
    month: Date, 
    accessToken: string // Added accessToken parameter
): Promise<string[]> {
    console.log('[Server Action] getMonthlyAvailability called with access token check', { providerId, month });
    
    if (!providerId || !month || !(month instanceof Date) || !accessToken) {
        console.error("Invalid input or missing access token for getMonthlyAvailability");
        return [];
    }

    // Create Supabase client using passed access token
    // Ensure these env vars are available in your deployment environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase URL or Anon Key not configured in environment variables.");
        return [];
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` }}
    });

    const targetTimeZone = 'America/New_York'; 

    try {
        // 1. Determine month boundaries
        const monthInTargetTz = toZonedTime(month, targetTimeZone);
        const startOfMonthInTargetTz = startOfMonth(monthInTargetTz);
        const endOfMonthInTargetTz = endOfMonth(monthInTargetTz);

        // Convert boundaries to UTC for database queries
        const startOfMonthUTC = fromZonedTime(startOfMonthInTargetTz, targetTimeZone);
        const endOfMonthUTC = fromZonedTime(endOfMonthInTargetTz, targetTimeZone);

        // 2. Fetch data for the entire month
        console.log(`[Server Action] Fetching weekly schedule for provider: ${providerId} (using provided token)`);
        const [scheduleRes, blocksRes, appointmentsRes] = await Promise.all([
            supabase // This client instance is now authenticated with the token
                .from('provider_weekly_schedules')
                .select('day_of_week, start_time, end_time')
                .eq('provider_id', providerId),
            supabase
                .from('provider_time_blocks')
                .select('start_datetime, end_datetime')
                .eq('provider_id', providerId)
                .eq('is_unavailable', true)
                .lt('start_datetime', endOfMonthUTC.toISOString()) 
                .gt('end_datetime', startOfMonthUTC.toISOString()),
            supabase
                .from('appointments')
                .select('appointment_date') 
                .eq('provider_id', providerId)
                .gte('appointment_date', startOfMonthUTC.toISOString())
                .lt('appointment_date', endOfMonthUTC.toISOString()) // Use less than for end of month
                .in('status', ['scheduled', 'confirmed'])
        ]);

        // Basic error check
        if (scheduleRes.error) throw new Error(`Schedule fetch error: ${scheduleRes.error.message}`);
        if (blocksRes.error) throw new Error(`Blocks fetch error: ${blocksRes.error.message}`);
        if (appointmentsRes.error) throw new Error(`Appointments fetch error: ${appointmentsRes.error.message}`);

        console.log(`[Server Action] Schedule query returned ${scheduleRes.data?.length ?? 0} rows.`); // Log query result count
        
        const schedules = scheduleRes.data || [];
        const blocksData = blocksRes.data || [];
        const appointmentsData = appointmentsRes.data || [];

        // --- Log Processed Blocks and Booked Slots --- 
        const blocks = blocksData.map(b => {
            try {
                return { 
                    start: toZonedTime(new Date(b.start_datetime), targetTimeZone),
                    end: toZonedTime(new Date(b.end_datetime), targetTimeZone)
                }
            } catch (e) { 
                console.error("Error processing block date:", b, e); return null; 
            }
        }).filter(b => b !== null) as { start: Date; end: Date }[]; // Filter out nulls and assert type
        console.log(`[Server Action] Processed Blocks (in ${targetTimeZone}):`, blocks.map(b => ({start: format(b.start, 'Pp'), end: format(b.end, 'Pp')})) );

        const bookedSlots = appointmentsData.map(a => {
            try {
                 return toZonedTime(new Date(a.appointment_date), targetTimeZone)
            } catch (e) {
                 console.error("Error processing appointment date:", a, e); return null;
            }
        }).filter(bs => bs !== null) as Date[]; // Filter out nulls and assert type
        console.log(`[Server Action] Processed Booked Slots (in ${targetTimeZone}):`, bookedSlots.map(bs => format(bs, 'Pp')));
        // --- End Log --- 

        // 3. Iterate through each day of the month
        const daysInMonth = eachDayOfInterval({ start: startOfMonthInTargetTz, end: endOfMonthInTargetTz });
        const availableDateStrings: string[] = [];
        const appointmentDurationMinutes = 60; // Use same duration as getAvailableSlots

        for (const day of daysInMonth) {
            const dayOfWeek = dateFnsGetDay(day);
            const dayStart = dateFnsStartOfDay(day);
            console.log(`\\nChecking Day: ${format(day, 'yyyy-MM-dd')} (DoW: ${dayOfWeek})`); // Log day start

            const relevantSchedules = schedules.filter(s => s.day_of_week === dayOfWeek);
            if (relevantSchedules.length === 0) {
                 console.log(` -> No weekly schedule found.`);
                 continue; 
            }
            console.log(` -> Found ${relevantSchedules.length} schedule(s).`);

            let dayHasPotentialSlot = false;
            for (const schedule of relevantSchedules) {
                console.log(`  -> Schedule Block: ${schedule.start_time} - ${schedule.end_time}`);
                try {
                    const startTimeParts = schedule.start_time.split(':').map(Number);
                    const endTimeParts = schedule.end_time.split(':').map(Number);
                    if (startTimeParts.length < 2 || endTimeParts.length < 2 || startTimeParts.some(isNaN) || endTimeParts.some(isNaN)) {
                         console.log(`    -> Invalid time format, skipping.`);
                         continue;
                    }

                    const scheduleStart = set(dayStart, { hours: startTimeParts[0], minutes: startTimeParts[1] });
                    const scheduleEnd = set(dayStart, { hours: endTimeParts[0], minutes: endTimeParts[1] });

                    if (scheduleStart >= scheduleEnd) {
                        console.log(`    -> Schedule start >= end, skipping.`);
                        continue;
                    }

                    const potentialSlotsInBlock = dateFnsEachMinuteOfInterval(
                        { start: scheduleStart, end: new Date(scheduleEnd.getTime() - 1) }, 
                        { step: appointmentDurationMinutes }
                    );
                    console.log(`    -> Generated ${potentialSlotsInBlock.length} potential slots.`);
                    if(potentialSlotsInBlock.length === 0) continue;
                    
                    let foundFreeSlotInBlock = false;
                    for (const slotStart of potentialSlotsInBlock) {
                          const slotEnd = new Date(slotStart.getTime() + appointmentDurationMinutes * 60000);
                          const slotTimeStr = format(slotStart, 'HH:mm');

                          // Check against Blocks
                          const overlappingBlock = blocks.find(block => slotStart < block.end && slotEnd > block.start);
                          if (overlappingBlock) {
                               console.log(`      - Slot ${slotTimeStr}: Overlaps with block [${format(overlappingBlock.start, 'HH:mm')}-${format(overlappingBlock.end, 'HH:mm')}]`);
                               continue; // Blocked
                          }

                          // Check against existing Appointments
                          const overlappingAppointment = bookedSlots.find(bookedSlot => Math.abs(bookedSlot.getTime() - slotStart.getTime()) < 1000 );
                          if (overlappingAppointment) {
                               console.log(`      - Slot ${slotTimeStr}: Already booked`);
                               continue; // Booked
                          }

                           // If we reach here, the slot is free
                           console.log(`      - Slot ${slotTimeStr}: Found FREE slot! Marking day as available.`);
                           dayHasPotentialSlot = true;
                           foundFreeSlotInBlock = true;
                           break; // Exit inner slot check loop
                    }
                    
                    if (foundFreeSlotInBlock) break; // Exit schedule loop for this day

                } catch (e) {
                    console.error("    -> Error processing schedule:", e);
                    continue;
                }
            }

            if (dayHasPotentialSlot) {
                availableDateStrings.push(format(day, 'yyyy-MM-dd'));
                console.log(` -> Day Added: ${format(day, 'yyyy-MM-dd')}`);
            } else {
                 console.log(` -> Day Not Added (No free slots found).`);
            }
        }

        console.log("[Server Action] getMonthlyAvailability found:", availableDateStrings);
        return availableDateStrings; // Added return statement

    } catch (error: any) {
        console.error("[Server Action] Error in getMonthlyAvailability:", error);
        return []; // Return empty on error
    }
    // This should be unreachable, but satisfies linter
    return []; 
} 

// Helper functions for UTC start/end of day (you might already have these)
// Consider moving these to a shared utility file if used elsewhere
function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  // Or for exclusive end:
  // d.setUTCHours(0, 0, 0, 0);
  // return addDays(d, 1);
   return d; // Using inclusive for GTE/LT checks usually works well
} 

// Helper function to create Supabase client (Corrected cookies usage)
const createSupabaseServerClient = async () => {
    const cookieStore = await cookies();
    return createServerClient<Database>(
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
                        console.error('Failed to set cookie:', name, error);
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch (error) {
                        console.error('Failed to remove cookie:', name, error);
                    }
                },
            },
        }
    );
};

interface DbAppointment {
    id: string;
    patient_id: string;
    provider_id: string;
    appointment_date: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
    notes: string | null;
    created_at: string;
    updated_at: string;
    provider?: {
        id: string;
        user_id: string;
        first_name: string | null;
        last_name: string | null;
        specialization: string | null;
    };
    patient?: {
        id: string;
        user_id: string;
        first_name: string | null;
        last_name: string | null;
    };
}

// --- NEW: Fetch Patient Appointments ---
export async function getPatientAppointments(patientUserId: string, upcomingOnly: boolean = true): Promise<Appointment[]> {
    console.log(`[Server Action] getPatientAppointments called for user: ${patientUserId}, upcomingOnly: ${upcomingOnly}`);
    const supabase = await createSupabaseServerClient();

    // Verify user is fetching their own data (important!)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("[Server Action] Auth error in getPatientAppointments:", authError);
        throw new Error("Authentication failed.");
    }
    if (user.id !== patientUserId) {
        console.error(`[Server Action] Security Alert: User ${user.id} attempted to fetch appointments for ${patientUserId}`);
        throw new Error("Permission denied.");
    }

    try {
        let query = supabase
            .from('appointments')
            .select(`
                *,
                provider: providers!inner (
                    id,
                    user_id,
                    first_name,
                    last_name,
                    specialization
                )
            `)
            .eq('patient_id', patientUserId)
            .order('appointment_date', { ascending: true });

        if (upcomingOnly) {
            query = query.gte('appointment_date', new Date().toISOString());
            query = query.neq('status', 'cancelled');
            query = query.neq('status', 'completed');
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Server Action] Error fetching patient appointments:', error);
            throw new Error('Failed to fetch appointments.');
        }

        console.log(`[Server Action] Fetched ${data?.length ?? 0} appointments for patient ${patientUserId}`);
        
        // Transform the data to match the Appointment type
        return (data as DbAppointment[] || []).map(appointment => ({
            ...appointment,
            duration: 60, // Default duration in minutes
            type: 'consultation' as const, // Default type
            status: appointment.status,
            provider: appointment.provider ? {
                id: appointment.provider.id,
                user_id: appointment.provider.user_id,
                first_name: appointment.provider.first_name,
                last_name: appointment.provider.last_name,
                specialization: appointment.provider.specialization
            } : undefined,
            patient: appointment.patient ? {
                id: appointment.patient.id,
                user_id: appointment.patient.user_id,
                first_name: appointment.patient.first_name,
                last_name: appointment.patient.last_name
            } : undefined
        }));

    } catch (err: any) {
        console.error('[Server Action] Unexpected error in getPatientAppointments:', err);
        throw new Error(err.message || 'An unknown error occurred.');
    }
}

// --- NEW: Fetch Provider Appointments ---
export async function getProviderAppointments(providerUserId: string, upcomingOnly: boolean = true): Promise<Appointment[]> {
    console.log(`[Server Action] getProviderAppointments called for user: ${providerUserId}, upcomingOnly: ${upcomingOnly}`);
    const supabase = await createSupabaseServerClient();

    // Verify user is fetching their own data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("[Server Action] Auth error in getProviderAppointments:", authError);
        throw new Error("Authentication failed.");
    }

    const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', providerUserId)
        .single();

    if (providerError || !providerData) {
        console.error(`[Server Action] Failed to find provider record for user ${providerUserId}:`, providerError);
        throw new Error("Provider profile not found.");
    }
    const providerId = providerData.id;
    console.log(`[Server Action] Found provider ID ${providerId} for user ${providerUserId}`);

    try {
        let query = supabase
            .from('appointments')
            .select(`
                *,
                patient: patient_profiles!inner (
                    id,
                    user_id,
                    first_name,
                    last_name
                )
            `)
            .eq('provider_id', providerId)
            .order('appointment_date', { ascending: true });

        if (upcomingOnly) {
            query = query.gte('appointment_date', new Date().toISOString());
            query = query.neq('status', 'cancelled');
            query = query.neq('status', 'completed');
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Server Action] Error fetching provider appointments:', error);
            throw new Error('Failed to fetch appointments.');
        }

        console.log(`[Server Action] Fetched ${data?.length ?? 0} appointments for provider ${providerId}`);
        
        // Transform the data to match the Appointment type
        return (data as DbAppointment[] || []).map(appointment => ({
            ...appointment,
            duration: 60, // Default duration in minutes
            type: 'consultation' as const, // Default type
            status: appointment.status,
            provider: appointment.provider ? {
                id: appointment.provider.id,
                user_id: appointment.provider.user_id,
                first_name: appointment.provider.first_name,
                last_name: appointment.provider.last_name,
                specialization: appointment.provider.specialization
            } : undefined,
            patient: appointment.patient ? {
                id: appointment.patient.id,
                user_id: appointment.patient.user_id,
                first_name: appointment.patient.first_name,
                last_name: appointment.patient.last_name
            } : undefined
        }));

    } catch (err: any) {
        console.error('[Server Action] Unexpected error in getProviderAppointments:', err);
        throw new Error(err.message || 'An unknown error occurred.');
    }
} 