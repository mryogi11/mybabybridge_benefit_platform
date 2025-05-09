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
  eachDayOfInterval,
  isWithinInterval,
  isAfter,
  startOfMonth,
  endOfMonth,
  formatISO,
  addDays,
  subMinutes,
  subSeconds,
  isEqual,
  parseISO // Added parseISO import
} from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { revalidatePath } from 'next/cache';
import { Appointment, Provider } from '@/types'; // Removed Patient import
import { and, eq, gte, lte, or, inArray } from 'drizzle-orm'; // No sql import needed here now
import { db } from '@/lib/db';
import {
  appointments,
  providers, // Added providers import
  users,
  // WorkingHour, // Removed as it's not exported from schema (renamed to providerWeeklySchedules)
  provider_time_blocks, // Corrected casing
  provider_weekly_schedules, // Corrected casing
  patient_profiles, // Corrected casing
} from '@/lib/db/schema';
import { AppointmentStatus } from '@/lib/types';
// Removed potentially missing imports for now, add back if needed and found
// import { getProviderById } from '@/data/provider';
// import { getStartAndEndOfWeek } from '@/lib/utils';

// --- Add Constants ---
const DEFAULT_SLOT_DURATION_MINUTES = 60;

// --- Add generateSlotsForDay Helper Function ---
// Helper function to generate potential time slots within a given interval
function generateTimeSlots(start: Date, end: Date, intervalMinutes: number): Date[] {
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date) || start >= end || !isValid(start) || !isValid(end)) {
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

// Helper to filter slots based on existing appointments
function generateSlotsForDay(
  intervalStart: Date,
  intervalEnd: Date,
  slotDuration: number, // In minutes
  // Use the schema's Appointment type for appointment_date
  existingAppointments: Pick<typeof appointments.$inferSelect, 'appointment_date'>[]
): { availableSlots: Date[] } {
  if (!intervalStart || !intervalEnd || intervalStart >= intervalEnd || !slotDuration || slotDuration <= 0) {
    return { availableSlots: [] };
  }

  const allPossibleSlots: Date[] = [];
  let currentSlotStart = intervalStart;

  while (currentSlotStart < intervalEnd) {
    const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
    if (currentSlotEnd <= intervalEnd) {
      allPossibleSlots.push(currentSlotStart);
    }
    currentSlotStart = currentSlotEnd;
  }

  if (allPossibleSlots.length === 0) {
    return { availableSlots: [] };
  }

  const bookedStartTimes = new Set(
    existingAppointments.map(appt => {
      try {
        // appointment_date from schema is expected to be a Date object
        if (appt.appointment_date instanceof Date && isValid(appt.appointment_date)) {
          return appt.appointment_date.getTime();
        }
      } catch {}
      return null;
    }).filter(time => time !== null) as number[]
  );

  const availableSlots = allPossibleSlots.filter(slot => {
    const slotStartTimeMs = slot.getTime();
    const isBooked = bookedStartTimes.has(slotStartTimeMs);
    return !isBooked;
  });

  return { availableSlots };
}
// --- End Helper Function ---

// --- Main Server Action for fetching available slots (Supabase version - Kept for reference/potential use) ---
export async function getAvailableSlots_Supabase(
  providerProfileId: string,
  selectedDateStr: string // Expect 'yyyy-MM-dd'
): Promise<{ slots: string[] | null; error: string | null }> {
  console.log(`[Server Action] getAvailableSlots (Supabase) called`, { providerProfileId, selectedDateStr });

  const cookieStore = await cookies();
  // Removed cookie logging for brevity

  const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  if (!providerProfileId || !selectedDateStr || !/\d{4}-\d{2}-\d{2}/.test(selectedDateStr)) {
    console.error('Invalid input (provider or date string format missing)');
    return { slots: null, error: 'Invalid input: Provider ID or date format incorrect.' };
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
      console.error('Authentication error in getAvailableSlots:', sessionError?.message || 'Session or session data is null/undefined');
      return { slots: null, error: 'Authentication failed.' };
  }
  // Removed user logging

  const appointmentDurationMinutes = 60;
  const targetTimeZone = 'America/New_York'; // Example, consider making dynamic

  let selectedDateInTargetTz: Date;
  let startOfDayInTargetTz: Date;
  let endOfDayInTargetTz: Date;

  try {
    try {
      const parsedDate = dateFnsParse(selectedDateStr, 'yyyy-MM-dd', new Date());
      if (!isValid(parsedDate)) throw new Error('Invalid date string format after parsing');
      selectedDateInTargetTz = fromZonedTime(parsedDate, targetTimeZone);
      if (!isValid(selectedDateInTargetTz)) throw new Error('Invalid date after fromZonedTime conversion');
      startOfDayInTargetTz = dateFnsStartOfDay(selectedDateInTargetTz);
      endOfDayInTargetTz = dateFnsEndOfDay(selectedDateInTargetTz);
      if (!isValid(startOfDayInTargetTz) || !isValid(endOfDayInTargetTz)) throw new Error('Invalid start/end of day in target timezone');

      const startOfDayUTCString = formatInTimeZone(startOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      const endOfDayUTCString = formatInTimeZone(endOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      // Removed logging for brevity

    } catch(parseError: any) {
      console.error("Error processing date string and timezones:", parseError?.message || parseError);
      return { slots: null, error: 'Error processing date.' };
    }

    const dayOfWeek = dateFnsGetDay(selectedDateInTargetTz);
    const startOfDayUTCStr = formatInTimeZone(startOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
    const endOfDayUTCStr = formatInTimeZone(endOfDayInTargetTz, targetTimeZone, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    const [scheduleRes, blocksRes, appointmentsRes] = await Promise.all([
      supabase.from('provider_weekly_schedules').select('start_time, end_time').eq('provider_id', providerProfileId).eq('day_of_week', dayOfWeek),
      supabase.from('provider_time_blocks').select('start_datetime, end_datetime').eq('provider_id', providerProfileId).eq('is_unavailable', true).lt('start_datetime', endOfDayUTCStr).gt('end_datetime', startOfDayUTCStr),
      supabase.from('appointments').select('appointment_date').eq('provider_id', providerProfileId).gte('appointment_date', startOfDayUTCStr).lt('appointment_date', endOfDayUTCStr).in('status', ['scheduled', 'pending']),
    ]);

    if (scheduleRes.error) throw new Error(`Schedule fetch error: ${scheduleRes.error.message}`);
    if (blocksRes.error) throw new Error(`Blocks fetch error: ${blocksRes.error.message}`);
    if (appointmentsRes.error) throw new Error(`Appointments fetch error: ${appointmentsRes.error.message}`);

    const schedules = scheduleRes.data || [];
    const blocks = blocksRes.data || [];
    const existingAppointments = appointmentsRes.data || [];
    // Removed logging

    let potentialSlots: Date[] = [];
    for (const schedule of schedules) {
      try {
        const startTimeParts = schedule.start_time?.split(':').map(Number);
        const endTimeParts = schedule.end_time?.split(':').map(Number);
        if (!startTimeParts || startTimeParts.length < 2 || !endTimeParts || endTimeParts.length < 2) continue;
        const scheduleStart = set(startOfDayInTargetTz, { hours: startTimeParts[0], minutes: startTimeParts[1], seconds: 0, milliseconds: 0 });
        const scheduleEnd = set(startOfDayInTargetTz, { hours: endTimeParts[0], minutes: endTimeParts[1], seconds: 0, milliseconds: 0 });
        if (!isValid(scheduleStart) || !isValid(scheduleEnd) || scheduleStart >= scheduleEnd) continue;
        potentialSlots.push(...generateTimeSlots(scheduleStart, scheduleEnd, appointmentDurationMinutes));
      } catch (scheduleError: any) {
        console.error("Error processing schedule entry:", schedule, scheduleError?.message || scheduleError);
      }
    }

    const unavailableIntervals = [
      ...blocks.map(block => {
          try {
              const start = fromZonedTime(block.start_datetime!, targetTimeZone);
              const end = fromZonedTime(block.end_datetime!, targetTimeZone);
              return (isValid(start) && isValid(end)) ? { start, end } : null;
          } catch { return null; }
      }),
      ...existingAppointments.map(appt => {
          try {
              const start = fromZonedTime(appt.appointment_date!, targetTimeZone);
              const end = addMinutes(start, appointmentDurationMinutes);
              return (isValid(start) && isValid(end)) ? { start, end } : null;
          } catch { return null; }
      })
    ].filter(interval => interval !== null) as { start: Date, end: Date }[];

    const availableSlots = potentialSlots.filter(slot => {
      const slotEnd = addMinutes(slot, appointmentDurationMinutes);
      const isOverlapping = unavailableIntervals.some(unavailable =>
         isWithinInterval(slot, unavailable) ||
         isWithinInterval(addMinutes(slot, 1), unavailable) ||
         isWithinInterval(addMinutes(slotEnd, -1), unavailable) ||
         (isBefore(unavailable.start, slotEnd) && isAfter(unavailable.end, slot))
      );
      return !isOverlapping;
    });

    const formattedSlots = availableSlots.map(slot => formatInTimeZone(slot, targetTimeZone, 'HH:mm'));
    // Removed logging
    return { slots: formattedSlots, error: null };

  } catch (error: any) {
    console.error("[Server Action] Error in getAvailableSlots (Supabase):", error?.message || error);
    return { slots: null, error: error?.message || 'An unexpected error occurred fetching slots.' };
  }
}

// --- Server Action to Book an Appointment (Supabase version - Kept for reference) ---
export async function bookAppointment_Supabase(
    patientAuthUserId: string,
    providerId: string,
    appointmentDateTimeStr: string,
    duration: number,
    appointmentType: string,
    notes: string | null
): Promise<{ success: boolean; error?: string; appointment?: Appointment }> {
    console.log('[Server Action] bookAppointment (Supabase) called', { patientAuthUserId, providerId, appointmentDateTimeStr, duration, appointmentType });

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Authentication failed' };
    if (user.id !== patientAuthUserId) return { success: false, error: 'Authorization error' };

    let patientProfileId: string;
    try {
        const { data: profileData, error: profileError } = await supabase.from('patient_profiles').select('id').eq('user_id', patientAuthUserId).single();
        if (profileError) throw profileError;
        if (!profileData) throw new Error(`Patient profile not found for user ID: ${patientAuthUserId}`);
        patientProfileId = profileData.id;
    } catch (err: any) {
        return { success: false, error: 'Could not verify patient profile.' };
    }

    if (!patientProfileId || !providerId || !appointmentDateTimeStr || !duration || !appointmentType) {
        return { success: false, error: 'Missing required appointment details.' };
    }

    try {
        const appointmentDate = new Date(appointmentDateTimeStr);
        if (!isValid(appointmentDate)) throw new Error('Invalid appointment date format provided.');
        const appointmentDateISO = appointmentDate.toISOString();

        // Insert the new appointment
        const { data: newAppointmentData, error: insertError } = await supabase
            .from('appointments')
            .insert({
                provider_id: providerId,
                patient_id: patientAuthUserId,
                appointment_date: formatISO(appointmentDate), // Use ISO format string
                status: 'pending', 
                notes: notes,
                duration: duration,
                // Pass the string type directly; DB/RLS might enforce enum values
                type: appointmentType, 
            })
            .select() 
            .single();

        if (insertError) throw insertError;
        if (!newAppointmentData) throw new Error('Failed to create appointment or retrieve data.');

        // Transform the returned data
        const transformedAppointment: Appointment = {
            id: newAppointmentData.id,
            patient_id: newAppointmentData.patient_id,
            provider_id: newAppointmentData.provider_id,
            // Assume dates from DB are strings or null
            appointment_date: newAppointmentData.appointment_date ?? '',
            status: newAppointmentData.status as Appointment['status'],
            notes: newAppointmentData.notes ?? null,
            duration: newAppointmentData.duration ?? null,
            type: newAppointmentData.type ?? null,
            created_at: newAppointmentData.created_at ?? '', 
            updated_at: newAppointmentData.updated_at ?? '',
            // provider is not included in the insert return
            // patient is not included 
        };

        revalidatePath('/dashboard/appointments');
        return { success: true, appointment: transformedAppointment };

    } catch (error: any) {
        return { success: false, error: `Database error: ${error.message}` };
    }
}

// --- Server Action to Get Appointments for a User (Supabase version - Kept for reference) ---
export async function getAppointmentsForUser_Supabase(
    userId: string, // This is the Auth User ID (users.id) for both patients and providers
    userRole: 'patient' | 'provider'
): Promise<Appointment[]> { // Return type might need adjustment based on joins
    console.log(`[Server Action] getAppointmentsForUser (Supabase) called for ${userRole} AUTH ID: ${userId}`);

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { console.error('Auth error'); return []; }

    // Authorization check: Ensure the logged-in user is requesting their own appointments
    if (user.id !== userId) {
         console.error(`Authorization error: User ${user.id} attempting to fetch appointments for ${userId}`);
         return [];
    }

    try {
        let filterColumn: 'patient_id' | 'provider_id' = userRole === 'patient' ? 'patient_id' : 'provider_id';

        console.log(`Fetching appointments where ${filterColumn} = ${userId}`);

        // Fetch appointments and related provider data
        const { data, error } = await supabase
            .from('appointments')
            // Select all appointment fields and necessary fields from the related provider
            .select('*, providers ( id, user_id, first_name, last_name, specialization ) ') 
            .eq(filterColumn, userId)
            .order('appointment_date', { ascending: true });

        if (error) {
            console.error(`Error fetching appointments from Supabase for ${userRole} ${userId}:`, error.message, error.details);
            return [];
        }
        if (!data) {
             console.log(`No appointments found for ${userRole} ${userId}`);
             return [];
        }

        console.log(`Found ${data.length} appointments for ${userRole} ${userId}`);

        // Basic transformation - adjust based on actual data and Appointment type
        const transformedAppointments: Appointment[] = (data || []).map((appt: any): Appointment | null => {
             if (!appt || !appt.id || !appt.appointment_date || !appt.status) {
                  console.warn('Skipping invalid appointment data:', appt);
                  return null;
             }
            const appointmentDate = typeof appt.appointment_date === 'string'
                ? parseISO(appt.appointment_date)
                : appt.appointment_date;
            if (!isValid(appointmentDate)) {
                 console.warn('Skipping appointment with invalid date:', appt);
                 return null;
            }

            // Map the fetched provider data
            const providerData = appt.providers ? {
                id: appt.providers.id,
                user_id: appt.providers.user_id,
                first_name: appt.providers.first_name,
                last_name: appt.providers.last_name,
                specialization: appt.providers.specialization,
                // Map other Provider fields if needed and available
                bio: null, // Placeholder or fetch if needed
                experience_years: null, // Placeholder or fetch if needed
                education: null, // Placeholder or fetch if needed
                certifications: null, // Placeholder or fetch if needed
                created_at: '', // Placeholder or fetch if needed
                updated_at: '', // Placeholder or fetch if needed
            } : null;

            return {
                id: appt.id,
                patient_id: appt.patient_id, 
                provider_id: appt.provider_id, 
                appointment_date: appointmentDate.toISOString(),
                duration: appt.duration,
                type: appt.type,
                status: ['scheduled', 'completed', 'cancelled', 'pending'].includes(appt.status)
                        ? appt.status as Appointment['status']
                        : 'pending',
                notes: appt.notes ?? null,
                created_at: typeof appt.created_at === 'string' ? appt.created_at : appt.created_at?.toISOString() ?? new Date().toISOString(),
                updated_at: typeof appt.updated_at === 'string' ? appt.updated_at : appt.updated_at?.toISOString() ?? new Date().toISOString(),
                provider: providerData, // Assign mapped provider data
                // patient: undefined, // Patient data not fetched here
            };
        }).filter((appt): appt is Appointment => appt !== null);

        console.log(`Returning ${transformedAppointments.length} transformed appointments for ${userRole} ${userId}`);
        return transformedAppointments;

    } catch (error: any) {
        console.error(`Error transforming or processing appointments for ${userRole} ${userId}:`, error?.message || error);
        return [];
    }
}

// --- Server Action to Update Appointment Status (Supabase version - Kept for reference) ---
export async function updateAppointmentStatus_Supabase(
    appointmentId: string,
    newStatus: 'scheduled' | 'completed' | 'cancelled' | 'pending'
): Promise<{ success: boolean; error?: string; appointment?: Appointment }> { // Return type might need adjustment
    console.log(`[Server Action] updateAppointmentStatus (Supabase) called for ID: ${appointmentId}, Status: ${newStatus}`);

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Authentication failed.' };

    // Fetch appointment details, including patient_id and provider_id
    const { data: existingAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, patient_id, provider_id') // Select patient_id as well
        .eq('id', appointmentId)
        .maybeSingle();

    if (fetchError) {
         console.error("Error fetching appointment for status update auth:", fetchError);
         return { success: false, error: 'Failed to retrieve appointment details.' };
    }
    if (!existingAppointment) {
        return { success: false, error: 'Appointment not found.' };
    }

    // Authorization check: Allow update if the user is the patient OR the provider
    // (Assuming provider_id stores the provider's Auth User ID)
    const isPatient = existingAppointment.patient_id === user.id;
    const isProvider = existingAppointment.provider_id === user.id;

    if (!isPatient && !isProvider) {
        console.warn(`Authorization failed: User ${user.id} is neither patient (${existingAppointment.patient_id}) nor provider (${existingAppointment.provider_id}) for appointment ${appointmentId}`);
        return { success: false, error: 'You are not authorized to update this appointment status.' };
    }

    // Additional check: Maybe only patients can cancel?
    if (!isPatient && newStatus === 'cancelled') {
        // Optional: Prevent providers from cancelling via this action if needed
        // console.warn(`Authorization failed: Provider ${user.id} attempted to cancel appointment ${appointmentId}`);
        // return { success: false, error: 'Providers cannot cancel appointments via this action.' };
    }
    
    console.log(`Authorization successful for user ${user.id} to update appointment ${appointmentId} (isPatient: ${isPatient}, isProvider: ${isProvider})`);

    try {
        // Proceed with the update
        const { data: updatedData, error: updateError } = await supabase
            .from('appointments')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', appointmentId)
            // Select duration and type as well if they exist in the table
            .select('id, patient_id, provider_id, appointment_date, status, notes, created_at, updated_at, duration, type') 
            .single();

        if (updateError) throw updateError;
        if (!updatedData) return { success: false, error: 'Failed to update or retrieve updated record.' };

        const finalUpdatedAppointment: Appointment = { 
            id: updatedData.id,
            patient_id: updatedData.patient_id,
            provider_id: updatedData.provider_id,
            appointment_date: updatedData.appointment_date,
            status: ['scheduled', 'completed', 'cancelled', 'pending'].includes(updatedData.status)
                    ? updatedData.status as Appointment['status']
                    : 'pending',
            notes: updatedData.notes ?? null,
            // Add missing fields
            duration: updatedData.duration ?? null, 
            type: updatedData.type ?? null,
            created_at: updatedData.created_at,
            updated_at: updatedData.updated_at,
            // Provider details not fetched here
         };

        revalidatePath('/dashboard/appointments');
        revalidatePath('/provider/appointments');
        // Cast back to Appointment for return type consistency, assuming essential fields are present
        return { success: true, appointment: finalUpdatedAppointment };

    } catch (error: any) {
        console.error('Error updating appointment status:', error?.message || error);
        return { success: false, error: `Database error: ${error?.message || 'Unknown error'}` };
    }
}

// --- Fetch Provider Profiles (Supabase version - Kept for reference) ---
export async function getProviderProfiles_Supabase(): Promise<Provider[]> { // Return type needs adjustment
    console.log('[Server Action] getProviderProfiles (Supabase) called');

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    try {
        const { data, error } = await supabase.from('providers').select(`
            id, 
            user_id, 
            first_name, 
            last_name, 
            specialization, 
            bio, 
            experience_years, 
            education, 
            certifications, 
            created_at, 
            updated_at
            // users ( id, email ) // Temporarily remove nested user select if it complicates typing/mapping
        `);

        if (error) { 
            console.error('Error fetching provider profiles:', error);
            return []; // Return empty array on error
        }

        const transformedProviders: Provider[] = (data || []).map((provider: any): Provider | null => {
            if (!provider || !provider.id || !provider.user_id) { // Check essential fields
                 console.warn("Skipping provider with missing essential fields:", provider);
                 return null;
            }
            return {
                id: provider.id,
                user_id: provider.user_id,
                first_name: provider.first_name ?? '', // Provide defaults for all fields
                last_name: provider.last_name ?? '',
                specialization: provider.specialization ?? null,
                bio: provider.bio ?? null,
                experience_years: provider.experience_years ?? null,
                education: provider.education ?? null,
                certifications: provider.certifications ?? null,
                created_at: provider.created_at ?? new Date().toISOString(),
                updated_at: provider.updated_at ?? new Date().toISOString(),
            };
        }).filter((provider): provider is Provider => provider !== null); // Type guard to filter out nulls

        return transformedProviders;

    } catch (error: any) {
        console.error('[Server Action] Error in getProviderProfiles (Supabase):', error?.message || error);
        return []; // Return empty array on exception
    }
}

// --- SERVER ACTION: Get Available Dates for a Provider (Drizzle Version - Main focus) ---
export async function getAvailableDatesForProvider(providerId: string): Promise<{
  availableDates: Date[];
  error: string | null;
}> {
  console.log(`[Server Action] getAvailableDatesForProvider (Drizzle) called for provider: ${providerId}`);
  try {
    // Use the Drizzle client `db` and schema imports
    const providerData = await db.query.providers.findFirst({
      where: eq(providers.id, providerId),
      with: {
        weeklySchedules: true, // Use correct relation name: weeklySchedules
        appointments: { // Fetch related appointments
          where: and(
            // Use AppointmentStatus enum/const from @/lib/types
            inArray(appointments.status, [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
            // Use appointment_date
            gte(appointments.appointment_date, startOfDay(new Date())) // Filter appointments starting from today
          ),
          // Use appointment_date
          orderBy: (appointmentsTable, { asc }) => [asc(appointmentsTable.appointment_date)], // Use alias for orderBy
          // Select only necessary fields
          columns: {
            // Use appointment_date
            appointment_date: true,
            // duration: true // uncomment if needed for more complex slot checking
          }
        },
      },
      // Select necessary fields from provider
      columns: {
        id: true,
        // slotDuration: true, // Removed: slotDuration is not on the provider table
      }
    });

    if (!providerData) {
      console.warn(`Provider not found: ${providerId}`);
      return { availableDates: [], error: 'Provider not found' };
    }
    // Use correct relation name: weeklySchedules
    if (!providerData.weeklySchedules || providerData.weeklySchedules.length === 0) {
      console.warn(`Provider ${providerId} has no working hours set.`);
      return { availableDates: [], error: 'Provider has no working hours set' };
    }

    // --- Map Working Hours ---
    // Use inferred type for provider_weekly_schedules
    const workingHoursMap = new Map<number, (typeof provider_weekly_schedules.$inferSelect)[]>();
    // Use correct relation name: weeklySchedules
    providerData.weeklySchedules.forEach(wh => {
      // Basic validation for working hour data (using snake_case)
      if (typeof wh.day_of_week !== 'number' || !wh.start_time || !wh.end_time) {
          console.warn("Skipping invalid working hour entry:", wh);
          return;
      }
      // Use day_of_week
      if (!workingHoursMap.has(wh.day_of_week)) {
        workingHoursMap.set(wh.day_of_week, []);
      }
      workingHoursMap.get(wh.day_of_week)?.push(wh);
    });

    if (workingHoursMap.size === 0) {
        console.warn(`Provider ${providerId} has working hour entries, but none were valid.`);
        return { availableDates: [], error: 'Provider has no valid working hours configured.' };
    }

    // --- Map Appointments By Date ---
    // Use appointment_date in Pick
    const appointmentsByDate = new Map<string, Pick<typeof appointments.$inferSelect, 'appointment_date'>[]>();
    providerData.appointments.forEach(appt => {
        // Ensure appointment_date is a valid Date object
        if (!(appt.appointment_date instanceof Date) || !isValid(appt.appointment_date)) {
            console.warn("Skipping appointment with invalid appointment_date:", appt);
            return;
        }
      // Use appointment_date
      const dateKey = format(appt.appointment_date, 'yyyy-MM-dd');
      if (!appointmentsByDate.has(dateKey)) {
        appointmentsByDate.set(dateKey, []);
      }
      // Store appointment_date
      appointmentsByDate.get(dateKey)?.push({ appointment_date: appt.appointment_date }); // Store only appointment_date
    });

    // --- Iterate through dates and check availability ---
    const availableDates: Date[] = [];
    const today = startOfDay(new Date());
    const endDate = addDays(today, 60); // Check next 60 days

    for (let currentDate = today; currentDate <= endDate; currentDate = addDays(currentDate, 1)) {
      const dayOfWeek = getDay(currentDate); // 0 (Sun) - 6 (Sat)
      const workingHoursForDay = workingHoursMap.get(dayOfWeek);

      if (workingHoursForDay && workingHoursForDay.length > 0) {
        let dayHasAvailableSlots = false;
        for (const wh of workingHoursForDay) {
          // Parse time string HH:MM:SS from schema into Date object for today (using snake_case)
          const startTimeParts = wh.start_time.split(':').map(Number);
          const endTimeParts = wh.end_time.split(':').map(Number);

          if (startTimeParts.length < 2 || endTimeParts.length < 2) {
              console.warn("Invalid time format in working hour, skipping:", wh);
              continue;
          }

          const intervalStart = set(currentDate, { hours: startTimeParts[0], minutes: startTimeParts[1], seconds: startTimeParts[2] || 0, milliseconds: 0 });
          const intervalEnd = set(currentDate, { hours: endTimeParts[0], minutes: endTimeParts[1], seconds: endTimeParts[2] || 0, milliseconds: 0 });

          if (!isValid(intervalStart) || !isValid(intervalEnd) || intervalStart >= intervalEnd) {
              console.warn("Generated invalid interval from working hour, skipping:", { wh, intervalStart, intervalEnd });
              continue;
          }

          const appointmentsForDate = appointmentsByDate.get(format(currentDate, 'yyyy-MM-dd')) || [];

          const { availableSlots } = generateSlotsForDay(
            intervalStart,
            intervalEnd,
            DEFAULT_SLOT_DURATION_MINUTES, // Use default slot duration
            appointmentsForDate // Pass the filtered appointments
          );

          if (availableSlots.length > 0) {
            dayHasAvailableSlots = true;
            break; // Found a slot for this day, no need to check other working hour intervals
          }
        }

        if (dayHasAvailableSlots) {
          availableDates.push(currentDate);
        }
      }
    }
    console.log(`[Server Action] getAvailableDatesForProvider returning ${availableDates.length} dates for provider ${providerId}`);
    return { availableDates, error: null };

  } catch (error) {
    console.error(`[Server Action] Error in getAvailableDatesForProvider (Drizzle) for provider ${providerId}:`, error);
    let errorMessage = 'Failed to fetch available dates due to an internal error.';
    if (error instanceof Error) {
      errorMessage = `Failed to fetch available dates: ${error.message}`;
    }
    // Consider logging more specific DB errors if available
    return { availableDates: [], error: errorMessage };
  }
}

// Renaming Supabase versions to avoid conflict, keeping Drizzle versions as primary
export const getAvailableSlots = getAvailableSlots_Supabase;
export const bookAppointment = bookAppointment_Supabase;
export const getAppointmentsForUser = getAppointmentsForUser_Supabase;
export const updateAppointmentStatus = updateAppointmentStatus_Supabase;
export const getProviderProfiles = getProviderProfiles_Supabase;