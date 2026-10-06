import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// The secure environment approach: require the service role key from the environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aepceztinwxcxaewtfld.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_csyySkatWaZG0EEnIedP0g_Ivc8lNQS';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is missing.");
  console.error("Please run this script using your secure environment, e.g.:");
  console.error("  $env:SUPABASE_SERVICE_ROLE_KEY='sb_secret_...'; node scratch/verify_phase2b_live.mjs");
  process.exit(1);
}

// 1. Service Role Client (for setup and cleanup)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. Anonymous Client
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper to create an authenticated client
async function createAuthClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
}

// Helper to log test results
function assertCheck(condition, successMsg, failMsg) {
  if (condition) {
    console.log(`✅ PASS: ${successMsg}`);
  } else {
    console.error(`❌ FAIL: ${failMsg}`);
  }
}

async function runVerification() {
  console.log("=== PHASE 2B LIVE VERIFICATION STARTED ===");

  const testSuffix = crypto.randomBytes(4).toString('hex');
  const ownerEmail = `test_owner_${testSuffix}@example.com`;
  const managerEmail = `test_manager_${testSuffix}@example.com`;
  const techEmail = `test_tech_${testSuffix}@example.com`;
  const password = "TestPassword123!";
  
  const testUsers = [];
  let categoryId, brandId, productId;

  try {
    console.log("\n--- SETUP: Creating test users and base data ---");
    // Create users
    for (const email of [ownerEmail, managerEmail, techEmail]) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
      testUsers.push(data.user.id);
    }

    // Set roles
    await adminClient.from('profiles').update({ role: 'owner' }).eq('id', testUsers[0]);
    await adminClient.from('profiles').update({ role: 'manager' }).eq('id', testUsers[1]);
    await adminClient.from('profiles').update({ role: 'technician' }).eq('id', testUsers[2]);

    // Create Category & Brand
    const { data: catData, error: catError } = await adminClient.from('categories').insert({ name: `Test Cat ${testSuffix}` }).select('id').single();
    if (catError) throw new Error("Category creation failed: " + catError.message);
    categoryId = catData.id;

    const { data: brandData, error: brandError } = await adminClient.from('brands').insert({ name: `Test Brand ${testSuffix}` }).select('id').single();
    if (brandError) throw new Error("Brand creation failed: " + brandError.message);
    brandId = brandData.id;

    console.log("Setup complete. Test users, category, and brand created.");

    // Sign in users
    const ownerClient = await createAuthClient(ownerEmail, password);
    const managerClient = await createAuthClient(managerEmail, password);
    const techClient = await createAuthClient(techEmail, password);

    console.log("\n--- TEST 1: Table & RLS Verifications ---");
    // Anon client should NOT be able to insert into products
    const anonInsert = await anonClient.from('products').insert({
      name: 'Anon Product', category_id: categoryId, brand_id: brandId
    });
    assertCheck(anonInsert.error !== null, "Anonymous cannot insert product", "Anonymous inserted product!");

    // Owner can insert product
    const barcode = `BARCODE-${testSuffix}`;
    const ownerInsert = await ownerClient.from('products').insert({
      name: `Test Product ${testSuffix}`, 
      barcode: barcode,
      category_id: categoryId, 
      brand_id: brandId
    }).select('id').single();
    assertCheck(ownerInsert.error === null, "Owner can insert product", "Owner failed to insert product: " + ownerInsert.error?.message);
    productId = ownerInsert.data.id;

    console.log("\n--- TEST 2: Barcode Duplicate Rejection ---");
    const dupInsert = await ownerClient.from('products').insert({
      name: `Test Product Dup`, 
      barcode: `  ${barcode}  `, // With whitespace to test TRIM trigger
      category_id: categoryId, 
      brand_id: brandId
    });
    assertCheck(dupInsert.error !== null, "Duplicate barcode rejected (including trimmed whitespaces)", "Duplicate barcode was accepted!");

    console.log("\n--- TEST 3: RPC adjust_stock (Owner/Manager capabilities) ---");
    // Receive 10 stock as owner
    const rpc1 = await ownerClient.rpc('adjust_stock', { p_product_id: productId, p_quantity: 10, p_type: 'receive' });
    assertCheck(rpc1.error === null && rpc1.data.new_stock === 10, "Owner can receive stock (+10)", "Owner receive stock failed: " + rpc1.error?.message);

    // Manager sells 2
    const rpc2 = await managerClient.rpc('adjust_stock', { p_product_id: productId, p_quantity: 2, p_type: 'sold' });
    assertCheck(rpc2.error === null && rpc2.data.new_stock === 8, "Manager can mark stock sold (-2)", "Manager sold stock failed: " + rpc2.error?.message);

    console.log("\n--- TEST 4: RPC adjust_stock (Technician restrictions) ---");
    // Technician tries to receive stock (Should fail)
    const rpc3 = await techClient.rpc('adjust_stock', { p_product_id: productId, p_quantity: 5, p_type: 'receive' });
    assertCheck(rpc3.error !== null, "Technician rejected from receiving stock", "Technician was allowed to receive stock!");

    // Technician uses for repair
    const rpc4 = await techClient.rpc('adjust_stock', { p_product_id: productId, p_quantity: 1, p_type: 'used_for_repair' });
    assertCheck(rpc4.error === null && rpc4.data.new_stock === 7, "Technician can use stock for repair (-1)", "Technician use for repair failed: " + rpc4.error?.message);

    console.log("\n--- TEST 5: Insufficient Stock Rejection ---");
    const rpc5 = await techClient.rpc('adjust_stock', { p_product_id: productId, p_quantity: 20, p_type: 'used_for_repair' });
    assertCheck(rpc5.error !== null, "Insufficient stock gracefully rejected", "Allowed negative stock!");

    console.log("\n--- TEST 6: Direct current_stock manipulation prevention ---");
    // Try to bypass RPC and directly update current_stock
    const directUpdate = await ownerClient.from('products').update({ current_stock: 99 }).eq('id', productId);
    assertCheck(directUpdate.error !== null, "Direct modification of current_stock blocked by trigger", "Direct modification of current_stock allowed!");

    console.log("\n=== ALL VERIFICATION TESTS COMPLETED ===");

  } catch (err) {
    console.error("UNEXPECTED ERROR DURING VERIFICATION:", err);
  } finally {
    console.log("\n--- CLEANUP: Removing test data ---");
    if (productId) await adminClient.from('products').delete().eq('id', productId);
    if (categoryId) await adminClient.from('categories').delete().eq('id', categoryId);
    if (brandId) await adminClient.from('brands').delete().eq('id', brandId);
    for (const id of testUsers) {
      await adminClient.auth.admin.deleteUser(id);
    }
    console.log("Cleanup finished.");
  }
}

runVerification();
