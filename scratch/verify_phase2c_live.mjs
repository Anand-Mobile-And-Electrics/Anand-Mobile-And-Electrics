import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env manually because dotenv is not installed and Node doesn't do it automatically
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = process.env[key] || value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
let ownerClient, managerClient, technicianClient;
let ownerId, managerId, technicianId;
let categoryId, brandId;
let uploadedFiles = [];
let createdProducts = [];

function assertCheck(condition, successMsg, failMsg, errorDetails = null) {
  if (condition) {
    console.log(`✅ PASS: ${successMsg}`);
  } else {
    console.error(`❌ FAIL: ${failMsg}`);
    if (errorDetails) {
      console.error(JSON.stringify(errorDetails, null, 2));
    }
    throw new Error(failMsg);
  }
}

async function runTests() {
  console.log("=== PHASE 2C LIVE VERIFICATION STARTED ===\n");

  const suffix = Date.now();
  
  try {
    // 1. Setup Test Environment
    console.log("--- SETUP: Creating test users and base data ---");
    
    // Create Category
    const { data: cat, error: catErr } = await adminClient.from('categories').insert({ name: `Cat_${suffix}` }).select().single();
    assertCheck(!catErr && cat, "Created test category", "Failed to create test category", catErr);
    categoryId = cat.id;

    // Create Brand
    const { data: brnd, error: brndErr } = await adminClient.from('brands').insert({ name: `Brnd_${suffix}` }).select().single();
    assertCheck(!brndErr && brnd, "Created test brand", "Failed to create test brand", brndErr);
    brandId = brnd.id;

    // Create Users
    const createUser = async (role) => {
      const email = `test_${role}_${suffix}@test.com`;
      const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({ email, password: 'password123', email_confirm: true });
      assertCheck(!authErr && authUser, `Created test user ${role}`, `Failed to create auth user ${role}`, authErr);
      
      const { error: profileErr } = await adminClient.from('profiles').update({ role }).eq('id', authUser.user.id);
      assertCheck(!profileErr, `Updated profile role for ${role}`, `Failed to update profile role ${role}`, profileErr);
      
      const { data: session, error: sessionErr } = await anonClient.auth.signInWithPassword({ email, password: 'password123' });
      assertCheck(!sessionErr && session, `Signed in as ${role}`, `Failed to sign in as ${role}`, sessionErr);
      
      return { id: authUser.user.id, client: createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } }) };
    };

    const owner = await createUser('owner');
    ownerId = owner.id; ownerClient = owner.client;
    
    const manager = await createUser('manager');
    managerId = manager.id; managerClient = manager.client;

    const technician = await createUser('technician');
    technicianId = technician.id; technicianClient = technician.client;


    // 2. Storage Bucket Verification
    console.log("\n--- TEST: Storage Bucket & Policies ---");
    
    const dummyImage = new Blob(["dummy content"], { type: "image/jpeg" });
    const ownerFileName = `owner_${suffix}.jpg`;
    
    const { error: ownerUploadError } = await ownerClient.storage.from('product-images').upload(ownerFileName, dummyImage);
    assertCheck(!ownerUploadError, "1 & 4. Bucket exists and Owner can upload", "Owner upload failed", ownerUploadError);
    if (!ownerUploadError) uploadedFiles.push(ownerFileName);

    const { data: publicUrlData } = anonClient.storage.from('product-images').getPublicUrl(ownerFileName);
    assertCheck(publicUrlData && publicUrlData.publicUrl, "3. Public read URL available", "Public URL missing");

    const managerFileName = `manager_${suffix}.jpg`;
    const { error: managerUploadError } = await managerClient.storage.from('product-images').upload(managerFileName, dummyImage);
    assertCheck(!managerUploadError, "5. Manager can upload", "Manager upload failed", managerUploadError);
    if (!managerUploadError) uploadedFiles.push(managerFileName);

    const techFileName = `tech_${suffix}.jpg`;
    const { error: techUploadError } = await technicianClient.storage.from('product-images').upload(techFileName, dummyImage);
    assertCheck(techUploadError, "6. Technician upload safely blocked", "Technician bypass!");

    const { error: anonUploadError } = await anonClient.storage.from('product-images').upload(`anon_${suffix}.jpg`, dummyImage);
    assertCheck(anonUploadError, "7. Anonymous upload safely blocked", "Anonymous bypass!");

    const { error: techDeleteError } = await technicianClient.storage.from('product-images').remove([ownerFileName]);
    assertCheck(techDeleteError, "8. Unauthorized delete blocked", "Technician was able to delete owner's image!");


    // 3. Inventory UI / Barcode Workflows
    console.log("\n--- TEST: Inventory Barcode & Product Workflows ---");
    
    const newBarcode = `BC_${suffix}`;
    const { data: newProd, error: newProdErr } = await ownerClient.from('products').insert({
      name: "New Flow Prod", barcode: `  ${newBarcode}  `, category_id: categoryId, brand_id: brandId
    }).select().single();
    assertCheck(!newProdErr && newProd && newProd.barcode === newBarcode, "10. New barcode flow works (trimmed safely)", "Failed new product creation", newProdErr);
    if (newProd) createdProducts.push(newProd.id);

    const { data: existingProd, error: existErr } = await ownerClient.from('products').select('*').eq('barcode', newBarcode).single();
    assertCheck(!existErr && existingProd && existingProd.id === newProd.id, "9. Existing barcode lookup works", "Failed to lookup existing product", existErr);

    const { data: manualProd, error: manualErr } = await ownerClient.from('products').insert({
      name: "Manual Prod", barcode: null, category_id: categoryId, brand_id: brandId
    }).select().single();
    assertCheck(!manualErr && manualProd && manualProd.id, "11. Manual product creation (no barcode) works", "Failed manual product creation", manualErr);
    if (manualProd) createdProducts.push(manualProd.id);

    const { error: rpcErr1 } = await ownerClient.rpc('adjust_stock', { p_product_id: existingProd.id, p_quantity: 10, p_type: 'receive' });
    assertCheck(!rpcErr1, "12. Stock RPC integration (receive)", "RPC receive failed", rpcErr1);

    const { error: techRpcErr } = await technicianClient.rpc('adjust_stock', { p_product_id: existingProd.id, p_quantity: 2, p_type: 'used_for_repair' });
    assertCheck(!techRpcErr, "13. Technician used_for_repair works", "Technician repair reduction failed", techRpcErr);
    
    const { error: techRpcErrBad } = await technicianClient.rpc('adjust_stock', { p_product_id: existingProd.id, p_quantity: 2, p_type: 'receive' });
    assertCheck(techRpcErrBad, "13. Technician restricted from receiving stock", "Technician bypass on receive");

    const { error: rpcErrNeg } = await ownerClient.rpc('adjust_stock', { p_product_id: existingProd.id, p_quantity: 100, p_type: 'sold' });
    assertCheck(rpcErrNeg, "14. Negative stock protection enforces constraint", "Stock went negative!");

    const { error: directUpdateErr } = await ownerClient.from('products').update({ current_stock: 99 }).eq('id', existingProd.id);
    assertCheck(directUpdateErr, "15. Direct current_stock manipulation remains blocked", "Direct update bypassed trigger!");

    const { data: finalProd, error: finalProdErr } = await adminClient.from('products').select('current_stock').eq('id', existingProd.id).single();
    assertCheck(!finalProdErr && finalProd.current_stock === 8, "Stock logic calculated perfectly (10 - 2 = 8)", "Stock calculation drift detected!", finalProdErr);

    console.log("\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:", error.message);
  } finally {
    // 4. Cleanup
    console.log("\n--- TEST: Cleanup ---");
    if (uploadedFiles.length > 0) {
      await adminClient.storage.from('product-images').remove(uploadedFiles);
      console.log("Cleaned up storage objects");
    }
    if (createdProducts.length > 0) {
      await adminClient.from('products').delete().in('id', createdProducts);
      console.log("Cleaned up products");
    }
    if (brandId) {
      await adminClient.from('brands').delete().eq('id', brandId);
      console.log("Cleaned up brand");
    }
    if (categoryId) {
      await adminClient.from('categories').delete().eq('id', categoryId);
      console.log("Cleaned up category");
    }
    if (ownerId) await adminClient.auth.admin.deleteUser(ownerId);
    if (managerId) await adminClient.auth.admin.deleteUser(managerId);
    if (technicianId) await adminClient.auth.admin.deleteUser(technicianId);
    console.log("Cleaned up test users");
    
    console.log("16. Cleanup of all test data finished.");
  }
}

runTests().catch(console.error);
