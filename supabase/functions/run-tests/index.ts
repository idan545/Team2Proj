import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface TestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executedAt: string;
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return {
      name,
      passed: true,
      message: 'Test passed',
      duration: Date.now() - start,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      name,
      passed: false,
      message: errorMessage,
      duration: Date.now() - start,
    };
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const results: TestResult[] = [];

  // Test 1: Database connection test
  results.push(await runTest('Database connection', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.from('conferences').select('id').limit(1);
    assert(!error, `Database connection failed: ${error?.message}`);
  }));

  // Test 2: Profiles table exists and is accessible
  results.push(await runTest('Profiles table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('profiles').select('id').limit(1);
    assert(!error, `Profiles table not accessible: ${error?.message}`);
  }));

  // Test 3: User roles table exists
  results.push(await runTest('User roles table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('user_roles').select('id').limit(1);
    assert(!error, `User roles table not accessible: ${error?.message}`);
  }));

  // Test 4: Conferences table structure
  results.push(await runTest('Conferences table structure', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.from('conferences').select('*').limit(1);
    assert(!error, `Conferences query failed: ${error?.message}`);
  }));

  // Test 5: Projects table accessible
  results.push(await runTest('Projects table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('projects').select('id').limit(1);
    assert(!error, `Projects table not accessible: ${error?.message}`);
  }));

  // Test 6: Evaluations table accessible
  results.push(await runTest('Evaluations table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('evaluations').select('id').limit(1);
    assert(!error, `Evaluations table not accessible: ${error?.message}`);
  }));

  // Test 7: Criteria table accessible
  results.push(await runTest('Criteria table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('evaluation_criteria').select('id').limit(1);
    assert(!error, `Criteria table not accessible: ${error?.message}`);
  }));

  // Test 8: is_admin function exists
  results.push(await runTest('is_admin function exists', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Test with a random UUID - should return false, not error
    const { data, error } = await supabase.rpc('is_admin', { 
      _user_id: '00000000-0000-0000-0000-000000000000' 
    });
    assert(!error, `is_admin function failed: ${error?.message}`);
    assertEqual(data, false, 'is_admin should return false for non-existent user');
  }));

  // Test 9: has_role function exists
  results.push(await runTest('has_role function exists', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.rpc('has_role', { 
      _user_id: '00000000-0000-0000-0000-000000000000',
      _role: 'judge'
    });
    assert(!error, `has_role function failed: ${error?.message}`);
    assertEqual(data, false, 'has_role should return false for non-existent user');
  }));

  // Test 10: Storage bucket exists
  results.push(await runTest('Presentations storage bucket exists', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.storage.getBucket('presentations');
    assert(!error, `Storage bucket not found: ${error?.message}`);
    assert(data !== null, 'Presentations bucket should exist');
  }));

  // Test 11: Admin update password - requires auth header
  results.push(await runTest('Admin update password requires auth', async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ userId: 'test', newPassword: 'test123' }),
    });
    assertEqual(response.status, 401, 'Should return 401 without auth header');
  }));

  // Test 12: Invitations table accessible
  results.push(await runTest('Invitations table accessible', async () => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('invitations').select('id').limit(1);
    assert(!error, `Invitations table not accessible: ${error?.message}`);
  }));

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const suite: TestSuite = {
    totalTests: results.length,
    passed,
    failed,
    results,
    executedAt: new Date().toISOString(),
  };

  console.log(`Test suite completed: ${passed}/${results.length} passed`);
  results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} (${r.duration}ms)`);
  });

  return new Response(JSON.stringify(suite, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
