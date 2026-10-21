import { describe, it, expect } from 'vitest';
import * as demo from './demoRepairs';

describe('demoRepairs adapter', () => {
  it('lists seeded repairs with a total count', async () => {
    const res = await demo.listRepairs({ page: 1, pageSize: 10 });
    expect(res.count).toBeGreaterThanOrEqual(2);
    expect(res.rows.length).toBeGreaterThanOrEqual(2);
    // all seeded data is clearly labelled synthetic
    expect(res.rows.every((r) => r.required_work.startsWith('DEMO'))).toBe(true);
  });

  it('filters by customer name (case-insensitive)', async () => {
    const res = await demo.listRepairs({ search: 'asha', page: 1, pageSize: 10 });
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].customers?.full_name).toContain('Asha');
  });

  it('returns status counts that sum to total', async () => {
    const c = await demo.getStatusCounts();
    const sum = (['received','diagnosing','waiting_for_approval','in_repair','ready','completed','cancelled'] as const)
      .reduce((a, s) => a + c[s], 0);
    expect(sum).toBe(c.total);
  });

  it('rejects a repair whose device does not belong to the customer', async () => {
    await expect(
      demo.createRepair({ customer_id: 'demo-c1', device_id: 'demo-d2', assigned_to: 'demo-tech', required_work: 'x' }),
    ).rejects.toThrow();
  });

  it('sets completed_at only when status becomes completed, and logs history', async () => {
    const r = await demo.createRepair({ customer_id: 'demo-c1', device_id: 'demo-d1', assigned_to: 'demo-tech', required_work: 'DEMO test' });
    expect(r.completed_at).toBeNull();
    expect(r.job_number).toMatch(/^JOB-\d+$/);
    await demo.updateRepairStatus(r.id, 'completed');
    const after = await demo.getRepair(r.id);
    expect(after.completed_at).not.toBeNull();
    const hist = await demo.getRepairHistory(r.id);
    expect(hist.some((h) => h.new_status === 'completed')).toBe(true);
  });
});
