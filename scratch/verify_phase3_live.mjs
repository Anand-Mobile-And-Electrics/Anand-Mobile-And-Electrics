import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = process.env[key] || val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error("❌ ERROR: Missing required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).");
  process.exitCode = 1;
  process.exit();
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

function assertCheck(condition, successMsg, failMsg, details = null) {
  if (condition) {
    console.log(`✅ PASS: ${successMsg}`);
  } else {
    console.error(`❌ FAIL: ${failMsg}`);
    if (details) console.error(JSON.stringify(details, null, 2));
    throw new Error(failMsg);
  }
}

async function runPhase3Tests() {
  console.log("=== PHASE 3 VERIFICATION ===\n");
  const suffix = Date.now();
  let createdUsers = [];
  let testRecords = { customers: [], devices: [], repairs: [], photos: [], photoMetadata: [] };

  const createUser = async (role) => {
    const email = `test_${role}_${suffix}_${createdUsers.length}@test.com`;
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({ email, password: 'password123', email_confirm: true });
    assertCheck(!authErr && authUser?.user?.id, `Created ${role} user`, `Failed to create ${role} user`, authErr);
    
    createdUsers.push(authUser.user.id);

    const { error: profErr } = await adminClient.from('profiles').update({ role }).eq('id', authUser.user.id);
    assertCheck(!profErr, `Assigned ${role} role`, `Failed to update profile for ${role}`, profErr);
    
    const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: session, error: sessErr } = await tempAuthClient.auth.signInWithPassword({ email, password: 'password123' });
    assertCheck(!sessErr && session?.session?.access_token, `Signed in as ${role}`, `Failed to sign in as ${role}`, sessErr);
    
    return { id: authUser.user.id, client: createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } }) };
  };

  try {
    const techA = await createUser('technician');
    const techB = await createUser('technician');
    const owner = await createUser('owner');
    const manager = await createUser('manager');

    console.log("\n--- Testing Role Escalation ---");
    const { data: escData1, error: escErr1 } = await techA.client.from('profiles').update({ role: 'owner' }).eq('id', techA.id).select('id, role');
    assertCheck(!escErr1 && escData1.length === 0, "Tech A cannot escalate to owner", "Role escalation bypassed!", escErr1);
    const { data: escData2, error: escErr2 } = await techA.client.from('profiles').update({ role: 'manager' }).eq('id', techA.id).select('id, role');
    assertCheck(!escErr2 && escData2.length === 0, "Tech A cannot escalate to manager", "Role escalation bypassed!", escErr2);
    const { data: escData3, error: escErr3 } = await techA.client.from('profiles').update({ role: 'owner' }).eq('id', techB.id).select('id, role');
    assertCheck(!escErr3 && escData3.length === 0, "Tech A cannot escalate Tech B to owner", "Role escalation bypassed!", escErr3);

    const { data: profChk } = await adminClient.from('profiles').select('role').in('id', [techA.id, techB.id]);
    assertCheck(profChk.every(p => p.role === 'technician'), "Admin confirms profiles retained original role", "Profiles were mutated during escalation attempt!");

    // Old Anonymous Access Tests removed from here to be tested against real records at the end.

    // --- 1. Customer & Device Setup ---
    console.log("\n--- Setup Phase ---");
    const custId = uuidv4();
    const devId = uuidv4();
    const custId2 = uuidv4();
    
    const { error: custAInsErr } = await techA.client.from('customers').insert({ id: custId, full_name: 'Customer A', phone: '123' });
    assertCheck(!custAInsErr, "Tech A inserted Customer A", "Customer A insert failed", custAInsErr);
    testRecords.customers.push(custId);

    const { error: custBInsErr } = await techA.client.from('customers').insert({ id: custId2, full_name: 'Customer B', phone: '123' });
    assertCheck(!custBInsErr, "Tech A inserted Customer B", "Customer B insert failed", custBInsErr);
    testRecords.customers.push(custId2);

    const { error: devInsErr } = await techA.client.from('devices').insert({ id: devId, customer_id: custId, brand: 'Apple', model: 'iPhone' });
    assertCheck(!devInsErr, "Tech A inserted Device", "Device insert failed", devInsErr);
    testRecords.devices.push(devId);

    // Consistency Check: Insert repair for Customer B using Customer A's Device
    const { data: consistData, error: consistErr } = await techA.client.from('repairs').insert({
      customer_id: custId2, device_id: devId, assigned_to: techA.id, required_work: 'Screen'
    }).select('id');
    assertCheck(
      (consistErr && consistErr.code === '23503') || (!consistErr && consistData && consistData.length === 0),
      "Cross-customer device assignment safely blocked",
      "Consistency failure bypassed!",
      consistErr
    );
    if (!consistErr && consistData && consistData.length > 0) testRecords.repairs.push(consistData[0].id);

    // --- 2. 5-Way Concurrency Test ---
    console.log("\n--- Testing Concurrency ---");
    const concurrentRepairs = await Promise.all([
      techA.client.from('repairs').insert({ customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'Work 1' }).select(),
      techA.client.from('repairs').insert({ customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'Work 2' }).select(),
      techA.client.from('repairs').insert({ customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'Work 3' }).select(),
      techA.client.from('repairs').insert({ customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'Work 4' }).select(),
      techA.client.from('repairs').insert({ customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'Work 5', job_number: 'MALICIOUS-JOB-1' }).select(),
    ]);

    const repIds = new Set();
    const repJobs = new Set();
    let maliciousOverrideFailed = true;

    for (let i = 0; i < concurrentRepairs.length; i++) {
      const res = concurrentRepairs[i];
      assertCheck(!res.error, `Concurrent insert ${i+1} succeeded`, `Concurrent insert ${i+1} failed`, res.error);
      const row = res.data[0];
      repIds.add(row.id);
      repJobs.add(row.job_number);
      testRecords.repairs.push(row.id);
      if (row.job_number === 'MALICIOUS-JOB-1') maliciousOverrideFailed = false;
    }

    assertCheck(repIds.size === 5, "All 5 concurrent IDs are unique", "Duplicate IDs generated in concurrency!");
    assertCheck(repJobs.size === 5, "All 5 concurrent job numbers are unique", "Duplicate job numbers generated!");
    assertCheck(maliciousOverrideFailed, "Client-supplied job number was safely ignored", "Client job number accepted!");

    const repA = concurrentRepairs[0].data[0];

    // Create a repair for Tech B
    const devIdB = uuidv4();
    const { error: techBDevErr } = await techB.client.from('devices').insert({ id: devIdB, customer_id: custId2, brand: 'Samsung', model: 'Galaxy' });
    assertCheck(!techBDevErr, "Tech B inserted device", "Tech B device insert failed", techBDevErr);
    testRecords.devices.push(devIdB);

    const { data: repBData, error: repBErr } = await techB.client.from('repairs').insert({
      customer_id: custId2, device_id: devIdB, assigned_to: techB.id, required_work: 'Battery'
    }).select();
    assertCheck(!repBErr, "Tech B created valid repair", "Tech B repair creation failed", repBErr);
    const repB = repBData[0];
    testRecords.repairs.push(repB.id);

    // Cross-Tech Assignment Test
    const { data: repCrossData, error: repCrossErr } = await techA.client.from('repairs').insert({
      customer_id: custId, device_id: devId, assigned_to: techB.id, required_work: 'Cross Assignment'
    }).select('id');
    assertCheck(
      (repCrossErr && repCrossErr.code === '42501') || (!repCrossErr && repCrossData && repCrossData.length === 0),
      "Tech A cannot assign repair to Tech B",
      "Tech A successfully assigned repair to Tech B!",
      repCrossErr
    );
    if (!repCrossErr && repCrossData && repCrossData.length > 0) {
      testRecords.repairs.push(repCrossData[0].id);
    }

    // --- 3. Isolation & Permissions ---
    console.log("\n--- Testing Isolation ---");
    const { data: techA_repB, error: techARepBErr } = await techA.client.from('repairs').select('*').eq('id', repB.id);
    assertCheck(!techARepBErr && techA_repB.length === 0, "Tech A cannot read Tech B's repairs", "Isolation leak!");
    const { data: techA_custB, error: techACustBErr } = await techA.client.from('customers').select('*').eq('id', custId2);
    assertCheck(!techACustBErr && techA_custB.length === 0, "Tech A cannot read Tech B's customers", "Isolation leak!");
    const { data: techA_devB, error: techADevBErr } = await techA.client.from('devices').select('*').eq('id', devIdB);
    assertCheck(!techADevBErr && techA_devB.length === 0, "Tech A cannot read Tech B's devices", "Isolation leak!");
    
    // --- 4. Owner/Manager Role Capabilities ---
    console.log("\n--- Owner/Manager Permission Checks ---");
    const testLifecycle = async (client, roleName) => {
        const cId = uuidv4();
        const { error: cInsErr } = await client.from('customers').insert({ id: cId, full_name: `${roleName} Cust`, phone: '123' });
        assertCheck(!cInsErr, `${roleName} can insert customer`, `${roleName} customer insert failed`, cInsErr);
        testRecords.customers.push(cId);

        const { error: cUpdErr } = await client.from('customers').update({ full_name: 'Updated' }).eq('id', cId);
        assertCheck(!cUpdErr, `${roleName} can update customer`, `${roleName} customer update failed`, cUpdErr);

        const { data: cSel, error: cSelErr } = await client.from('customers').select('*').eq('id', cId);
        assertCheck(!cSelErr && cSel.length === 1, `${roleName} can read customer`, `${roleName} customer read failed`, cSelErr);

        const dId = uuidv4();
        const { error: dInsErr } = await client.from('devices').insert({ id: dId, customer_id: cId, brand: 'Apple', model: 'iPad' });
        assertCheck(!dInsErr, `${roleName} can insert device`, `${roleName} device insert failed`, dInsErr);
        testRecords.devices.push(dId);

        const { error: dUpdErr } = await client.from('devices').update({ model: 'Pro' }).eq('id', dId);
        assertCheck(!dUpdErr, `${roleName} can update device`, `${roleName} device update failed`, dUpdErr);

        const { data: dSel, error: dSelErr } = await client.from('devices').select('*').eq('id', dId);
        assertCheck(!dSelErr && dSel.length === 1, `${roleName} can read device`, `${roleName} device read failed`, dSelErr);

        const { data: rData, error: rInsErr } = await client.from('repairs').insert({ customer_id: cId, device_id: dId, assigned_to: techA.id, required_work: 'Test' }).select();
        assertCheck(!rInsErr, `${roleName} can insert repair`, `${roleName} repair insert failed`, rInsErr);
        const rId = rData[0].id;
        testRecords.repairs.push(rId);

        const { error: rUpdErr } = await client.from('repairs').update({ repair_notes: 'Notes' }).eq('id', rId);
        assertCheck(!rUpdErr, `${roleName} can update repair`, `${roleName} repair update failed`, rUpdErr);

        const { error: rDelErr } = await client.from('repairs').delete().eq('id', rId).select();
        assertCheck(!rDelErr && rDelErr === null, `${roleName} can delete repair`, `${roleName} repair delete failed`, rDelErr);

        const { error: dDelErr } = await client.from('devices').delete().eq('id', dId).select();
        assertCheck(!dDelErr && dDelErr === null, `${roleName} can delete device`, `${roleName} device delete failed`, dDelErr);

        const { error: cDelErr } = await client.from('customers').delete().eq('id', cId).select();
        assertCheck(!cDelErr && cDelErr === null, `${roleName} can delete customer`, `${roleName} customer delete failed`, cDelErr);
    };
    await testLifecycle(owner.client, 'Owner');
    await testLifecycle(manager.client, 'Manager');

    // --- 5. Immutable Fields Updates (Technician) ---
    console.log("\n--- Testing Immutability ---");
    const { data: techJobData, error: techJobErr } = await techA.client.from('repairs').update({ job_number: 'NEW-JOB' }).eq('id', repA.id).select('id');
    assertCheck((techJobErr && techJobErr.code === 'P0001') || (!techJobErr && techJobData.length === 0), "Technician cannot alter job_number", "Job number bypassed by Tech!", techJobErr);
    const { data: mgrJobData, error: mgrJobErr } = await manager.client.from('repairs').update({ job_number: 'NEW-JOB' }).eq('id', repA.id).select('id');
    assertCheck((mgrJobErr && mgrJobErr.code === 'P0001') || (!mgrJobErr && mgrJobData.length === 0), "Manager cannot alter job_number", "Job number bypassed by Manager!", mgrJobErr);
    const { data: ownJobData, error: ownJobErr } = await owner.client.from('repairs').update({ job_number: 'NEW-JOB' }).eq('id', repA.id).select('id');
    assertCheck((ownJobErr && ownJobErr.code === 'P0001') || (!ownJobErr && ownJobData.length === 0), "Owner cannot alter job_number", "Job number bypassed by Owner!", ownJobErr);

    // Customer
    const { data: techCustIdData, error: techCustIdErr } = await techA.client.from('customers').update({ id: uuidv4() }).eq('id', custId).select('id');
    assertCheck((techCustIdErr && techCustIdErr.code === 'P0001') || (!techCustIdErr && techCustIdData.length === 0), "Technician update of customer id blocked", "Customer ID altered!", techCustIdErr);
    const { data: techCustCrData, error: techCustCrErr } = await techA.client.from('customers').update({ created_at: new Date().toISOString() }).eq('id', custId).select('id');
    assertCheck((techCustCrErr && techCustCrErr.code === 'P0001') || (!techCustCrErr && techCustCrData.length === 0), "Technician update of customer created_at blocked", "Customer created_at altered!", techCustCrErr);

    // Device
    const { data: techDevIdData, error: techDevIdErr } = await techA.client.from('devices').update({ id: uuidv4() }).eq('id', devId).select('id');
    assertCheck((techDevIdErr && techDevIdErr.code === 'P0001') || (!techDevIdErr && techDevIdData.length === 0), "Technician update of device id blocked", "Device ID altered!", techDevIdErr);
    const { data: techDevCustData, error: techDevCustErr } = await techA.client.from('devices').update({ customer_id: custId2 }).eq('id', devId).select('id');
    assertCheck((techDevCustErr && techDevCustErr.code === 'P0001') || (!techDevCustErr && techDevCustData.length === 0), "Technician update of device customer_id blocked", "Device customer_id altered!", techDevCustErr);

    // Repair
    const { data: techRepCustData, error: techRepCustErr } = await techA.client.from('repairs').update({ customer_id: custId2 }).eq('id', repA.id).select('id');
    assertCheck((techRepCustErr && techRepCustErr.code === 'P0001') || (!techRepCustErr && techRepCustData.length === 0), "Technician update of repair customer_id blocked", "Repair customer_id altered!", techRepCustErr);
    const { data: techRepDevData, error: techRepDevErr } = await techA.client.from('repairs').update({ device_id: devIdB }).eq('id', repA.id).select('id');
    assertCheck((techRepDevErr && techRepDevErr.code === 'P0001') || (!techRepDevErr && techRepDevData.length === 0), "Technician update of repair device_id blocked", "Repair device_id altered!", techRepDevErr);
    const { data: techRepAsnData, error: techRepAsnErr } = await techA.client.from('repairs').update({ assigned_to: techB.id }).eq('id', repA.id).select('id');
    assertCheck((techRepAsnErr && techRepAsnErr.code === 'P0001') || (!techRepAsnErr && techRepAsnData.length === 0), "Technician update of repair assigned_to blocked", "Repair assigned_to altered!", techRepAsnErr);

    // --- 6. Completed At Tests (Strict) ---
    console.log("\n--- Testing Completed At ---");
    // Direct manipulation rejection
    const { data: techCompData, error: techCompErr } = await techA.client.from('repairs').update({ completed_at: new Date().toISOString() }).eq('id', repA.id).select('id');
    assertCheck((techCompErr && techCompErr.code === 'P0001') || (!techCompErr && techCompData.length === 0), "Technician direct completed_at modification blocked", "Tech modified completed_at!", techCompErr);
    const { data: mgrCompData, error: mgrCompErr } = await manager.client.from('repairs').update({ completed_at: new Date().toISOString() }).eq('id', repA.id).select('id');
    assertCheck((mgrCompErr && mgrCompErr.code === 'P0001') || (!mgrCompErr && mgrCompData.length === 0), "Manager direct completed_at modification blocked", "Manager modified completed_at!", mgrCompErr);
    const { data: ownCompData, error: ownCompErr } = await owner.client.from('repairs').update({ completed_at: new Date().toISOString() }).eq('id', repA.id).select('id');
    assertCheck((ownCompErr && ownCompErr.code === 'P0001') || (!ownCompErr && ownCompData.length === 0), "Owner direct completed_at modification blocked", "Owner modified completed_at!", ownCompErr);

    // Status transitions
    const { error: transErr1 } = await techA.client.from('repairs').update({ status: 'completed' }).eq('id', repA.id);
    assertCheck(!transErr1, "Transition to completed succeeded", "Status transition failed", transErr1);
    const { data: repCompleted } = await adminClient.from('repairs').select('completed_at').eq('id', repA.id).single();
    assertCheck(repCompleted.completed_at !== null, "Status received -> completed sets completed_at", "Completed at was not updated!");

    const { error: transErr2 } = await owner.client.from('repairs').update({ status: 'ready' }).eq('id', repA.id);
    assertCheck(!transErr2, "Transition to ready succeeded", "Status transition failed", transErr2);
    const { data: repReady } = await adminClient.from('repairs').select('completed_at').eq('id', repA.id).single();
    assertCheck(repReady.completed_at === null, "Status completed -> ready clears completed_at", "Completed at was not cleared!");

    const { error: transErr3 } = await owner.client.from('repairs').update({ status: 'completed' }).eq('id', repA.id);
    assertCheck(!transErr3, "Transition to completed (again) succeeded", "Status transition failed", transErr3);
    const { error: transErr4 } = await manager.client.from('repairs').update({ status: 'diagnosing' }).eq('id', repA.id);
    assertCheck(!transErr4, "Transition to diagnosing succeeded", "Status transition failed", transErr4);
    const { data: repDiag } = await adminClient.from('repairs').select('completed_at').eq('id', repA.id).single();
    assertCheck(repDiag.completed_at === null, "Status completed -> diagnosing clears completed_at", "Completed at was not cleared!");

    // --- 7. History Table Tests ---
    console.log("\n--- Testing Repair History ---");
    const { data: history1 } = await adminClient.from('repair_history').select('*').eq('repair_id', repA.id);
    assertCheck(history1 && history1.length > 0, "Initial repair history row exists", "Repair history trigger did not create the expected initial history row.");
    const histCount1 = history1.length;
    
    // Non-status update creates NO history
    const { error: nonStatErr } = await techA.client.from('repairs').update({ required_work: 'New Work', repair_notes: 'Notes' }).eq('id', repA.id);
    assertCheck(!nonStatErr, "Non-status update succeeded", "Update failed", nonStatErr);
    const { data: history2 } = await adminClient.from('repair_history').select('*').eq('repair_id', repA.id);
    assertCheck(history2.length === histCount1, "Non-status update created NO history row", "History polluted!");

    // Status update creates history
    const { error: statUpErr } = await techA.client.from('repairs').update({ status: 'in_repair' }).eq('id', repA.id);
    assertCheck(!statUpErr, "Status update succeeded", "Status update failed", statUpErr);
    const { data: history3 } = await adminClient.from('repair_history').select('*').eq('repair_id', repA.id);
    assertCheck(history3.length === histCount1 + 1, "Status update created EXACTLY ONE history row", "History row count invalid!");

    // Isolation
    const { data: techBHist } = await techB.client.from('repair_history').select('*').eq('repair_id', repA.id);
    assertCheck(techBHist.length === 0, "Tech B cannot read Tech A history", "History isolation leaked!");

    // Direct mutability blocked
    // Inserts
    const { data: histInsDataO, error: histInsErrO } = await owner.client.from('repair_history').insert({ repair_id: repA.id, new_status: 'ready', changed_by: owner.id }).select('id');
    assertCheck((histInsErrO && histInsErrO.code === '42501') || (!histInsErrO && histInsDataO.length === 0), "Direct INSERT to history blocked for Owner", "History INSERT vulnerability (Owner)!", histInsErrO);
    const { data: histInsDataM, error: histInsErrM } = await manager.client.from('repair_history').insert({ repair_id: repA.id, new_status: 'ready', changed_by: manager.id }).select('id');
    assertCheck((histInsErrM && histInsErrM.code === '42501') || (!histInsErrM && histInsDataM.length === 0), "Direct INSERT to history blocked for Manager", "History INSERT vulnerability (Manager)!", histInsErrM);
    const { data: histInsDataT, error: histInsErrT } = await techA.client.from('repair_history').insert({ repair_id: repA.id, new_status: 'ready', changed_by: techA.id }).select('id');
    assertCheck((histInsErrT && histInsErrT.code === '42501') || (!histInsErrT && histInsDataT.length === 0), "Direct INSERT to history blocked for Technician", "History INSERT vulnerability (Tech)!", histInsErrT);

    // Updates
    const { data: histUpdDataO, error: histUpdErrO } = await owner.client.from('repair_history').update({ new_status: 'cancelled' }).eq('id', history1[0].id).select('id');
    assertCheck(!histUpdErrO && histUpdDataO.length === 0, "Direct UPDATE to history blocked for Owner", "History UPDATE vulnerability (Owner)!", histUpdErrO);
    const { data: histUpdDataM, error: histUpdErrM } = await manager.client.from('repair_history').update({ new_status: 'cancelled' }).eq('id', history1[0].id).select('id');
    assertCheck(!histUpdErrM && histUpdDataM.length === 0, "Direct UPDATE to history blocked for Manager", "History UPDATE vulnerability (Manager)!", histUpdErrM);
    const { data: histUpdDataT, error: histUpdErrT } = await techA.client.from('repair_history').update({ new_status: 'cancelled' }).eq('id', history1[0].id).select('id');
    assertCheck(!histUpdErrT && histUpdDataT.length === 0, "Direct UPDATE to history blocked for Technician", "History UPDATE vulnerability (Tech)!", histUpdErrT);

    // Deletes
    const { data: histDelDataO, error: histDelErrO } = await owner.client.from('repair_history').delete().eq('id', history1[0].id).select('id');
    assertCheck(!!histDelErrO || (histDelDataO && histDelDataO.length === 0), "Direct DELETE to history blocked for Owner", "History DELETE vulnerability (Owner)!", histDelErrO);
    const { data: histDelDataM, error: histDelErrM } = await manager.client.from('repair_history').delete().eq('id', history1[0].id).select('id');
    assertCheck(!!histDelErrM || (histDelDataM && histDelDataM.length === 0), "Direct DELETE to history blocked for Manager", "History DELETE vulnerability (Manager)!", histDelErrM);
    const { data: histDelDataT, error: histDelErrT } = await techA.client.from('repair_history').delete().eq('id', history1[0].id).select('id');
    assertCheck(!!histDelErrT || (histDelDataT && histDelDataT.length === 0), "Direct DELETE to history blocked for Technician", "History DELETE vulnerability (Tech)!", histDelErrT);
    const { data: chkHistAfterDel, error: chkHistAfterDelErr } = await adminClient.from('repair_history').select('id').eq('id', history1[0].id);
    assertCheck(!chkHistAfterDelErr && chkHistAfterDel.length === 1, "Admin confirmed history row still exists", "History row improperly deleted!");

    // --- 8. Technician DELETE Table Tests ---
    console.log("\n--- Technician DELETE Table Tests ---");
    
    // Customer
    const { data: techDelCust, error: techDelCustErr } = await techA.client.from('customers').delete().eq('id', custId).select();
    assertCheck(!!techDelCustErr || (techDelCust && techDelCust.length === 0), "Technician delete assigned customer rejected", "Tech deleted customer!");
    const { data: chkCust, error: chkCustErr } = await adminClient.from('customers').select('id').eq('id', custId);
    assertCheck(!chkCustErr && chkCust.length === 1, "Technician failed to delete customer, record still exists", "Customer record is missing after Tech delete attempt!");

    // Device
    const { data: techDelDev, error: techDelDevErr } = await techA.client.from('devices').delete().eq('id', devId).select();
    assertCheck(!!techDelDevErr || (techDelDev && techDelDev.length === 0), "Technician delete assigned device rejected", "Tech deleted device!");
    const { data: chkDev, error: chkDevErr } = await adminClient.from('devices').select('id').eq('id', devId);
    assertCheck(!chkDevErr && chkDev.length === 1, "Technician failed to delete device, record still exists", "Device record is missing after Tech delete attempt!");

    // Repair
    const { data: techDelRep, error: techDelRepErr } = await techA.client.from('repairs').delete().eq('id', repA.id).select();
    assertCheck(!!techDelRepErr || (techDelRep && techDelRep.length === 0), "Technician delete assigned repair rejected", "Tech deleted repair!");
    const { data: chkRep, error: chkRepErr } = await adminClient.from('repairs').select('id').eq('id', repA.id);
    assertCheck(!chkRepErr && chkRep.length === 1, "Technician failed to delete repair, record still exists", "Repair record is missing after Tech delete attempt!");

    // --- 9. Storage Metadata Tests ---
    console.log("\n--- Testing Storage Metadata ---");
    const { data: metaData, error: metaErr } = await techA.client.from('repair_photos').insert({ repair_id: repA.id, storage_path: `${repA.id}/${uuidv4()}.jpg`, uploaded_by: techA.id }).select();
    assertCheck(!metaErr, "Tech A inserted valid photo metadata", "Metadata insert failed", metaErr);
    testRecords.photoMetadata.push(metaData[0].id);

    const { error: metaErrBadPath } = await techA.client.from('repair_photos').insert({ repair_id: repA.id, storage_path: `invalid/${uuidv4()}.jpg`, uploaded_by: techA.id });
    assertCheck(!!metaErrBadPath, "Metadata insert rejected for mismatched path", "Path bypass allowed!");

    const { error: metaErrBadUser } = await techA.client.from('repair_photos').insert({ repair_id: repA.id, storage_path: `${repA.id}/${uuidv4()}.jpg`, uploaded_by: owner.id });
    assertCheck(!!metaErrBadUser, "Metadata insert rejected for mismatched user", "User bypass allowed!");

    const { data: techBMeta } = await techB.client.from('repair_photos').select('*').eq('repair_id', repA.id);
    assertCheck(techBMeta.length === 0, "Tech B cannot read Tech A photo metadata", "Metadata isolation leaked!");

    // Tech delete metadata
    const metaId = testRecords.photoMetadata[0];
    const { data: techDelMeta, error: techDelMetaErr } = await techA.client.from('repair_photos').delete().eq('id', metaId).select();
    assertCheck(!!techDelMetaErr || (techDelMeta && techDelMeta.length === 0), "Technician delete photo metadata rejected", "Tech deleted metadata!");
    const { data: chkMeta, error: chkMetaErr } = await adminClient.from('repair_photos').select('id').eq('id', metaId);
    assertCheck(!chkMetaErr && chkMeta.length === 1, "Technician failed to delete photo metadata, record still exists", "Photo metadata record is missing after Tech delete attempt!");

    // --- 10. Storage Object Tests ---
    console.log("\n--- Testing Storage Objects ---");
    const dummyBlob = new Blob(["test"], { type: "image/jpeg" });
    const p1 = uuidv4();
    const p2 = uuidv4();
    const storagePath1 = `${repA.id}/${p1}.jpg`;
    
    // Uploads
    const pOwner = uuidv4();
    const storagePathOwner = `${repA.id}/${pOwner}.jpg`;
    const { error: ownStoreErr } = await owner.client.storage.from('repair-photos').upload(storagePathOwner, dummyBlob);
    assertCheck(!ownStoreErr, "Owner upload allowed", "Owner upload failed", ownStoreErr);
    testRecords.photos.push(storagePathOwner);

    const pManager = uuidv4();
    const storagePathManager = `${repA.id}/${pManager}.jpg`;
    const { error: mgrStoreErr } = await manager.client.storage.from('repair-photos').upload(storagePathManager, dummyBlob);
    assertCheck(!mgrStoreErr, "Manager upload allowed", "Manager upload failed", mgrStoreErr);
    testRecords.photos.push(storagePathManager);

    const { error: storeErr } = await techA.client.storage.from('repair-photos').upload(storagePath1, dummyBlob);
    assertCheck(!storeErr, "Tech A uploaded photo to own repair", "Upload failed", storeErr);
    testRecords.photos.push(storagePath1);
    
    const { error: storeErr2 } = await techA.client.storage.from('repair-photos').upload(`${repB.id}/${p2}.jpg`, dummyBlob);
    assertCheck(!!storeErr2, "Tech A blocked from uploading to Tech B's repair", "Tech A bypass!");

    // Cross-Tech Read
    const { error: techBReadErr } = await techB.client.storage.from('repair-photos').download(storagePath1);
    assertCheck(!!techBReadErr, "Tech B blocked from downloading Tech A's photo", "Cross-Tech read bypass!");
    const { error: techAReadErr } = await techA.client.storage.from('repair-photos').download(storagePath1);
    assertCheck(!techAReadErr, "Tech A can download own photo", "Tech A read blocked!", techAReadErr);

    // Updates
    const { error: techUpdStoreErr } = await techA.client.storage.from('repair-photos').update(storagePath1, dummyBlob);
    assertCheck(!!techUpdStoreErr, "Tech A update/overwrite blocked", "Tech A UPDATE bypass!");
    
    const { error: mgrUpdStoreErr } = await manager.client.storage.from('repair-photos').update(storagePath1, dummyBlob);
    assertCheck(!mgrUpdStoreErr, "Manager update/overwrite allowed", "Manager UPDATE failed", mgrUpdStoreErr);

    const { error: ownUpdStoreErr } = await owner.client.storage.from('repair-photos').update(storagePath1, dummyBlob);
    assertCheck(!ownUpdStoreErr, "Owner update/overwrite allowed", "Owner UPDATE failed", ownUpdStoreErr);

    // Deletes (Testing the Tech -> Manager sequence)
    const { data: techDelData, error: techDelErr } = await techA.client.storage.from('repair-photos').remove([storagePath1]);
    // Supabase returns an empty array when RLS blocks the delete, NOT an error. We must check length.
    assertCheck(techDelData && techDelData.length === 0, "Tech A delete blocked (returned empty array)", "Tech A DELETE bypass!");
    
    // Verify object still exists after Tech A failed delete
    const { error: existCheck1 } = await owner.client.storage.from('repair-photos').download(storagePath1);
    assertCheck(!existCheck1, "Object still exists after failed Tech delete", "Object improperly deleted!");

    const { data: mgrDelData, error: mgrDelErr } = await manager.client.storage.from('repair-photos').remove([storagePath1]);
    console.log("mgrDelData:", mgrDelData);
    assertCheck(!mgrDelErr && mgrDelData && mgrDelData.length > 0, "Manager delete allowed", "Manager DELETE blocked!", mgrDelErr);
    
    // We remove it from testRecords.photos because Manager successfully deleted it.
    // Wait, let's keep it there, removing it twice is fine (returns empty), and checking it's gone is better.
    
    // Verify object no longer exists using list()
    const { data: existCheckList, error: existCheckListErr } = await owner.client.storage.from('repair-photos').list(repA.id, { search: p1 });
    console.log("existCheckList:", existCheckList);
    const existCheck2 = existCheckList && existCheckList.length > 0 ? new Error("Still listed") : null;
    assertCheck(!existCheck2, "Object no longer exists after Manager delete", "Object still exists!", existCheck2);

    // Malicious paths
    const badPaths = [
      `../${repA.id}/test.jpg`,
      `../../test.jpg`,
      `${repB.id}/test.jpg`,
      `${uuidv4()}/test.jpg`,
      `invalid/test.jpg`
    ];
    for (const badPath of badPaths) {
      const { error: badPathErr } = await techA.client.storage.from('repair-photos').upload(badPath, dummyBlob);
      assertCheck(!!badPathErr, `Path traversal upload blocked for ${badPath}`, `Path traversal bypass on ${badPath}!`);
    }

    // --- 11. Anonymous Access Tests (Against Real Records) ---
    console.log("\n--- Anonymous Access Tests (Against Real Records) ---");
    
    // Selects
    const { data: anonSelCust, error: anonSelCustErr } = await anonClient.from('customers').select('*').eq('id', custId);
    assertCheck(!anonSelCustErr && anonSelCust.length === 0, "Anonymous SELECT blocked on customers", "Anon SELECT bypass on customers!");

    const { data: anonSelDev, error: anonSelDevErr } = await anonClient.from('devices').select('*').eq('id', devId);
    assertCheck(!anonSelDevErr && anonSelDev.length === 0, "Anonymous SELECT blocked on devices", "Anon SELECT bypass on devices!");

    const { data: anonSelRep, error: anonSelRepErr } = await anonClient.from('repairs').select('*').eq('id', repA.id);
    assertCheck(!anonSelRepErr && anonSelRep.length === 0, "Anonymous SELECT blocked on repairs", "Anon SELECT bypass on repairs!");

    const { data: anonSelHist, error: anonSelHistErr } = await anonClient.from('repair_history').select('*').eq('id', history1[0].id);
    assertCheck(!anonSelHistErr && anonSelHist.length === 0, "Anonymous SELECT blocked on repair_history", "Anon SELECT bypass on repair_history!");

    const { data: anonSelMeta, error: anonSelMetaErr } = await anonClient.from('repair_photos').select('*').eq('id', metaId);
    assertCheck(!anonSelMetaErr && anonSelMeta.length === 0, "Anonymous SELECT blocked on repair_photos", "Anon SELECT bypass on repair_photos!");

    // Inserts (Using real FKs)
    const badAnonCustId = uuidv4();
    const { data: anonInsCustData, error: anonInsCustErr } = await anonClient.from('customers').insert({ id: badAnonCustId, full_name: 'Anon', phone: '123' }).select('id');
    if (!anonInsCustErr && anonInsCustData && anonInsCustData.length > 0) await adminClient.from('customers').delete().eq('id', badAnonCustId);
    assertCheck((anonInsCustErr && anonInsCustErr.code === '42501') || (!anonInsCustErr && anonInsCustData && anonInsCustData.length === 0), "Anonymous INSERT explicitly blocked on customers", "Anon INSERT bypass on customers!", anonInsCustErr);

    const badAnonDevId = uuidv4();
    const { data: anonInsDevData, error: anonInsDevErr } = await anonClient.from('devices').insert({ id: badAnonDevId, customer_id: custId, brand: 'A', model: 'B' }).select('id');
    if (!anonInsDevErr && anonInsDevData && anonInsDevData.length > 0) await adminClient.from('devices').delete().eq('id', badAnonDevId);
    assertCheck((anonInsDevErr && anonInsDevErr.code === '42501') || (!anonInsDevErr && anonInsDevData && anonInsDevData.length === 0), "Anonymous INSERT explicitly blocked on devices", "Anon INSERT bypass on devices!", anonInsDevErr);

    const badAnonRepId = uuidv4();
    const { data: anonInsRepData, error: anonInsRepErr } = await anonClient.from('repairs').insert({ id: badAnonRepId, customer_id: custId, device_id: devId, assigned_to: techA.id, required_work: 'X' }).select('id');
    if (!anonInsRepErr && anonInsRepData && anonInsRepData.length > 0) await adminClient.from('repairs').delete().eq('id', badAnonRepId);
    assertCheck((anonInsRepErr && anonInsRepErr.code === '42501') || (!anonInsRepErr && anonInsRepData && anonInsRepData.length === 0), "Anonymous INSERT explicitly blocked on repairs", "Anon INSERT bypass on repairs!", anonInsRepErr);

    const badAnonHistId = uuidv4();
    const { data: anonInsHistData, error: anonInsHistErr } = await anonClient.from('repair_history').insert({ id: badAnonHistId, repair_id: repA.id, new_status: 'ready', changed_by: techA.id }).select('id');
    if (!anonInsHistErr && anonInsHistData && anonInsHistData.length > 0) await adminClient.from('repair_history').delete().eq('id', badAnonHistId);
    assertCheck((anonInsHistErr && anonInsHistErr.code === '42501') || (!anonInsHistErr && anonInsHistData && anonInsHistData.length === 0), "Anonymous INSERT explicitly blocked on repair_history", "Anon INSERT bypass on repair_history!", anonInsHistErr);

    const badAnonMetaId = uuidv4();
    const { data: anonInsMetaData, error: anonInsMetaErr } = await anonClient.from('repair_photos').insert({ id: badAnonMetaId, repair_id: repA.id, storage_path: 'a/b.jpg', uploaded_by: techA.id }).select('id');
    if (!anonInsMetaErr && anonInsMetaData && anonInsMetaData.length > 0) await adminClient.from('repair_photos').delete().eq('id', badAnonMetaId);
    assertCheck((anonInsMetaErr && (anonInsMetaErr.code === '42501' || anonInsMetaErr.code === 'P0001')) || (!anonInsMetaErr && anonInsMetaData && anonInsMetaData.length === 0), "Anonymous INSERT explicitly blocked on repair_photos", "Anon INSERT bypass on repair_photos!", anonInsMetaErr);

    // Storage Download
    const { error: anonDownloadErr } = await anonClient.storage.from('repair-photos').download(storagePathOwner);
    assertCheck(!!anonDownloadErr, "Anonymous storage download blocked against real object", "Anonymous storage download bypass!");

    // Storage Upload
    const dummyAnonBlob2 = new Blob(["test"], { type: "image/jpeg" });
    const anonPhotoPath2 = `${repA.id}/${uuidv4()}.jpg`;
    const { error: anonUploadErr2 } = await anonClient.storage.from('repair-photos').upload(anonPhotoPath2, dummyAnonBlob2);
    if (!anonUploadErr2) {
        await adminClient.storage.from('repair-photos').remove([anonPhotoPath2]);
    }
    assertCheck(!!anonUploadErr2, "Anonymous storage upload blocked", "Anonymous storage upload bypass!");

    console.log("\n=== ALL TESTS PASSED ===");

  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    console.log("\n--- Targeted Cleanup ---");
    // Clean Storage Objects
    if (testRecords.photos.length > 0) {
      const { error: cleanStoreErr } = await adminClient.storage.from('repair-photos').remove(testRecords.photos);
      if (cleanStoreErr) console.error("Storage cleanup error:", cleanStoreErr);
    }
    
    // Clean Metadata
    if (testRecords.photoMetadata.length > 0) {
       await adminClient.from('repair_photos').delete().in('id', testRecords.photoMetadata);
    }

    // Clean Repairs
    if (testRecords.repairs.length > 0) {
       await adminClient.from('repairs').delete().in('id', testRecords.repairs);
    }

    // Clean Devices
    if (testRecords.devices.length > 0) {
      await adminClient.from('devices').delete().in('id', testRecords.devices);
    }
    
    // Clean Customers
    if (testRecords.customers.length > 0) {
      await adminClient.from('customers').delete().in('id', testRecords.customers);
    }

    // Clean Users
    for (const uid of createdUsers) await adminClient.auth.admin.deleteUser(uid);
    
    // Verification of targeted cleanup
    let cleanupFailed = false;
    
    if (testRecords.customers.length > 0) {
      const { data: checkCust } = await adminClient.from('customers').select('id').in('id', testRecords.customers);
      if (checkCust.length > 0) {
        console.error(`❌ Cleanup failed: ${checkCust.length} test customers remain.`);
        cleanupFailed = true;
      }
    }

    if (testRecords.devices.length > 0) {
      const { data: checkDev } = await adminClient.from('devices').select('id').in('id', testRecords.devices);
      if (checkDev.length > 0) {
        console.error(`❌ Cleanup failed: ${checkDev.length} test devices remain.`);
        cleanupFailed = true;
      }
    }

    if (testRecords.repairs.length > 0) {
      const { data: checkRep } = await adminClient.from('repairs').select('id').in('id', testRecords.repairs);
      if (checkRep.length > 0) {
        console.error(`❌ Cleanup failed: ${checkRep.length} test repairs remain.`);
        cleanupFailed = true;
      }
    }
    
    if (testRecords.photoMetadata.length > 0) {
      const { data: checkMeta } = await adminClient.from('repair_photos').select('id').in('id', testRecords.photoMetadata);
      if (checkMeta.length > 0) {
        console.error(`❌ Cleanup failed: ${checkMeta.length} test photo metadata rows remain.`);
        cleanupFailed = true;
      }
    }

    if (testRecords.photos.length > 0) {
      // Check each explicitly via adminClient
      for (const photoPath of testRecords.photos) {
        const { error: checkPhotoErr } = await adminClient.storage.from('repair-photos').download(photoPath);
        if (!checkPhotoErr) {
          console.error(`❌ Cleanup failed: storage object ${photoPath} remains.`);
          cleanupFailed = true;
        }
      }
    }
    
    if (!cleanupFailed) {
       console.log("✅ Cleanup finished and verified. All test records absent.");
    } else {
       process.exitCode = 1;
    }
  }
}
runPhase3Tests();
