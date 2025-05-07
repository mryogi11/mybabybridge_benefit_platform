'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { db } from '@/lib/db';
import { users, appointments, providers, patient_profiles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { User } from '@/types';

const createSupabaseServerClient = () => {
  const cookieStorePromise = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn(`Supabase client failed to set cookie '${name}' in Server Action.`, error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`Supabase client failed to remove cookie '${name}' in Server Action.`, error);
          }
        },
      },
    }
  );
};

export interface ProviderPatientListItem {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    lastAppointmentDate?: string | null;
}

type ActionResponse<T> = Promise<{
    success: boolean;
    data?: T;
    error?: string;
}>;

export async function getPatientsForProvider(): ActionResponse<ProviderPatientListItem[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
        return { success: false, error: 'Provider not authenticated.' };
    }
    const providerAuthUserId = authUser.id;

    try {
        const providerProfile = await db.query.providers.findFirst({
            where: eq(providers.user_id, providerAuthUserId),
            columns: { id: true }
        });

        if (!providerProfile) {
            console.error(`[getPatientsForProvider] No provider profile found for auth user ID: ${providerAuthUserId}`);
            return { success: false, error: 'Provider profile not found.' };
        }
        const providerTableId = providerProfile.id;

        const allAppointmentsForProvider = await db.select({
                patientUserId: appointments.patient_id,
                appointmentDate: appointments.appointment_date 
            })
            .from(appointments)
            .where(eq(appointments.provider_id, providerTableId));

        if (!allAppointmentsForProvider || allAppointmentsForProvider.length === 0) {
            console.log(`[getPatientsForProvider] No patients found with appointments for provider profile ID: ${providerTableId}`);
            return { success: true, data: [] };
        }

        const patientLastAppointmentMap = new Map<string, Date>();
        for (const appt of allAppointmentsForProvider) {
            const existingDate = patientLastAppointmentMap.get(appt.patientUserId);
            const currentApptDate = new Date(appt.appointmentDate);
            if (!existingDate || currentApptDate > existingDate) {
                patientLastAppointmentMap.set(appt.patientUserId, currentApptDate);
            }
        }
        const patientUserIds = Array.from(patientLastAppointmentMap.keys());

        if (patientUserIds.length === 0) {
             console.log(`[getPatientsForProvider] No unique patient UserIDs after processing appointments for provider profile ID: ${providerTableId}`);
            return { success: true, data: [] };
        }

        const patientsData = await db.select({
            userId: users.id,
            firstName: users.first_name,
            lastName: users.last_name,
            email: users.email,
            dob: patient_profiles.date_of_birth,
            phone: patient_profiles.phone,
        })
        .from(users)
        .leftJoin(patient_profiles, eq(users.id, patient_profiles.user_id))
        .where(sql`${users.id} IN ${patientUserIds}`);
        
        const patientListItems: ProviderPatientListItem[] = patientsData.map(p => {
            const lastApptDateObject = patientLastAppointmentMap.get(p.userId);
            return {
                userId: p.userId,
                firstName: p.firstName,
                lastName: p.lastName,
                email: p.email,
                dateOfBirth: p.dob, 
                phone: p.phone,
                lastAppointmentDate: lastApptDateObject ? lastApptDateObject.toISOString() : null,
            };
        });

        patientListItems.sort((a, b) => {
            const dateA = a.lastAppointmentDate ? new Date(a.lastAppointmentDate).getTime() : 0;
            const dateB = b.lastAppointmentDate ? new Date(b.lastAppointmentDate).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;
            const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
            const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log(`[getPatientsForProvider] Final patient list count:`, patientListItems.length);
        return { success: true, data: patientListItems };

    } catch (error: any) {
        console.error('[Server Action Error] getPatientsForProvider:', error);
        return { success: false, error: error.message || 'Failed to fetch patients for provider.' };
    }
}