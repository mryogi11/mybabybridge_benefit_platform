import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableInfo {
  exists: boolean;
  schema?: any;
  count: number;
  error: string | null;
  code?: string | null;
  hint?: string | null;
  details?: string | null;
  sample: any[];
}

interface TestResults {
  connection: {
    url: string;
    keyType: string;
    hasKey: boolean;
  };
  tables: Record<string, TableInfo>;
  authSession: {
    exists: boolean;
    user: string | null;
    userId: string | null;
    error: string | null;
  } | null;
  policies: Record<string, any>;
  error: string | null;
}

export async function GET() {
  const results: TestResults = {
    connection: {
      url: supabaseUrl,
      keyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon_key',
      hasKey: !!supabaseServiceKey,
    },
    tables: {},
    authSession: null,
    policies: {},
    error: null
  };

  try {
    // Check auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    results.authSession = {
      exists: !!sessionData?.session,
      user: sessionData?.session?.user?.email || null,
      userId: sessionData?.session?.user?.id || null,
      error: sessionError ? sessionError.message : null
    };

    // Try to check RLS policies
    try {
      const { data: policiesData, error: policiesError } = await supabase.rpc('list_policies');
      if (policiesError) {
        results.policies = { error: policiesError.message };
      } else {
        results.policies = { data: policiesData || [] };
      }
    } catch (err: any) {
      results.policies = { error: 'Cannot check policies. May require higher permissions.' };
    }

    // Test tables we might want to check
    const tablesToCheck = [
      'users',
      'auth.users',
      'profiles',
      'user_profiles'
    ];

    for (const table of tablesToCheck) {
      try {
        // First check if the table exists by trying to get the schema
        const { data: tableInfo, error: tableInfoError } = await supabase
          .from('information_schema.tables')
          .select('*')
          .eq('table_name', table.replace(/^.*\./, ''))
          .limit(1);
        
        const tableExists = !tableInfoError && tableInfo && tableInfo.length > 0;
        
        // Now try to select from the table
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(5);

        results.tables[table] = {
          exists: tableExists,
          schema: tableExists ? tableInfo[0] : null,
          count: data?.length || 0,
          error: error ? error.message : null,
          code: error ? error.code : null,
          hint: error ? error.hint : null,
          details: error ? error.details : null,
          sample: data || []
        };
      } catch (err: any) {
        results.tables[table] = {
          exists: false,
          error: err.message,
          sample: [],
          count: 0
        };
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    results.error = error.message;
    return NextResponse.json(results, { status: 500 });
  }
} 