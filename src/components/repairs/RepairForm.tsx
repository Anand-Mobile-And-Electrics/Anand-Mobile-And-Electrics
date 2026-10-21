import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Customer, Device, Technician } from '../../services/repairs';
import {
  searchCustomers,
  getCustomerDevices,
  createCustomer,
  createDevice,
  createRepair,
} from '../../services/repairs';
import styles from '../../pages/admin/RepairCreate.module.css';

interface Props {
  technicians: Technician[];
  onCreated: (jobNumber: string, repairId: string) => void;
  onMessage: (text: string, type: 'error' | 'success' | 'info') => void;
}

const RepairForm = ({ technicians, onCreated, onMessage }: Props) => {
  const { user } = useAuth();

  // Customer selection
  const [custTerm, setCustTerm] = useState('');
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');

  // Device selection
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [newDeviceMode, setNewDeviceMode] = useState(false);
  const [devBrand, setDevBrand] = useState('');
  const [devModel, setDevModel] = useState('');
  const [devImei, setDevImei] = useState('');

  // Repair
  const [requiredWork, setRequiredWork] = useState('');
  const [repairNotes, setRepairNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSearch = async () => {
    const t = custTerm.trim();
    if (!t) return;
    setSearching(true);
    try {
      setCustResults(await searchCustomers(t));
    } catch {
      onMessage('Customer search failed.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = async (c: Customer) => {
    setSelectedCustomer(c);
    setNewCustomerMode(false);
    setSelectedDeviceId('');
    setNewDeviceMode(false);
    try {
      setDevices(await getCustomerDevices(c.id));
    } catch {
      onMessage('Could not load devices for this customer.', 'error');
    }
  };

  const resetCustomer = () => {
    setSelectedCustomer(null);
    setDevices([]);
    setSelectedDeviceId('');
    setNewDeviceMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFieldError('');

    try {
      setSubmitting(true);

      // 1. Resolve customer
      let customer = selectedCustomer;
      if (!customer && newCustomerMode) {
        if (!custName.trim() || !custPhone.trim()) {
          setFieldError('Customer name and phone are required.');
          setSubmitting(false);
          return;
        }
        customer = await createCustomer({
          full_name: custName,
          phone: custPhone,
          email: custEmail || null,
        });
      }
      if (!customer) {
        setFieldError('Please select or create a customer.');
        setSubmitting(false);
        return;
      }

      // 2. Resolve device
      let deviceId = selectedDeviceId;
      if (newDeviceMode) {
        if (!devBrand.trim() || !devModel.trim()) {
          setFieldError('Device brand and model are required.');
          setSubmitting(false);
          return;
        }
        const device = await createDevice({
          customer_id: customer.id,
          brand: devBrand,
          model: devModel,
          imei_serial: devImei || null,
        });
        deviceId = device.id;
      }
      if (!deviceId) {
        setFieldError('Please select or add a device.');
        setSubmitting(false);
        return;
      }

      // 3. Resolve assignee automatically (handled by anyone free in shop)
      const assignee = user?.id || (technicians[0]?.id ?? 'shop-staff');


      if (!requiredWork.trim()) {
        setFieldError('Reported problem / required work is required.');
        setSubmitting(false);
        return;
      }

      const repair = await createRepair({
        customer_id: customer.id,
        device_id: deviceId,
        assigned_to: assignee,
        required_work: requiredWork,
        repair_notes: repairNotes || null,
      });

      onCreated(repair.job_number, repair.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create repair job.';
      onMessage(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* STEP 1: CUSTOMER */}
      <section className={styles.step}>
        <h3>1. Customer</h3>
        {selectedCustomer ? (
          <div className={styles.selectedBox}>
            <div>
              <strong>{selectedCustomer.full_name}</strong>
              <div className={styles.muted}>{selectedCustomer.phone}</div>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={resetCustomer}>
              Change
            </button>
          </div>
        ) : newCustomerMode ? (
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="cust-name">Full name *</label>
              <input id="cust-name" value={custName} onChange={(e) => setCustName(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="cust-phone">Phone *</label>
              <input
                id="cust-phone"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                inputMode="tel"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="cust-email">Email</label>
              <input
                id="cust-email"
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup} style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setNewCustomerMode(false)}
              >
                Back to search
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.searchRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="cust-search">Search name or phone</label>
                <input
                  id="cust-search"
                  value={custTerm}
                  onChange={(e) => setCustTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSearch();
                    }
                  }}
                />
              </div>
              <button type="button" className={styles.primaryButton} onClick={handleSearch}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {custResults.length > 0 && (
              <ul className={styles.resultList}>
                {custResults.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => selectCustomer(c)}>
                      <strong>{c.full_name}</strong> — {c.phone}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setNewCustomerMode(true);
                setCustResults([]);
              }}
            >
              + New customer
            </button>
          </>
        )}
      </section>

      {/* STEP 2: DEVICE */}
      {(selectedCustomer || newCustomerMode) && (
        <section className={styles.step}>
          <h3>2. Device</h3>
          {!newDeviceMode && selectedCustomer && devices.length > 0 && (
            <div className={styles.inputGroup}>
              <label htmlFor="device-select">Existing device</label>
              <select
                id="device-select"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                <option value="">Select a device…</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.brand} {d.model}
                    {d.imei_serial ? ` (${d.imei_serial})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {newDeviceMode ? (
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="dev-brand">Brand *</label>
                <input id="dev-brand" value={devBrand} onChange={(e) => setDevBrand(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="dev-model">Model *</label>
                <input id="dev-model" value={devModel} onChange={(e) => setDevModel(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="dev-imei">IMEI / Serial</label>
                <input id="dev-imei" value={devImei} onChange={(e) => setDevImei(e.target.value)} />
              </div>
              {selectedCustomer && (
                <div className={styles.inputGroup} style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setNewDeviceMode(false)}
                  >
                    Use existing device
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setNewDeviceMode(true);
                setSelectedDeviceId('');
              }}
            >
              + New device
            </button>
          )}
        </section>
      )}

      {/* STEP 3: REPAIR */}
      {(selectedCustomer || newCustomerMode) && (
        <section className={styles.step}>
          <h3>3. Repair details</h3>
          <div className={styles.inputGroup}>
            <label htmlFor="required-work">Reported problem / required work *</label>
            <textarea
              id="required-work"
              rows={3}
              value={requiredWork}
              onChange={(e) => setRequiredWork(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="repair-notes">Internal notes</label>
            <textarea
              id="repair-notes"
              rows={2}
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
            />
          </div>
        </section>
      )}

      {fieldError && <div className={styles.errorText}>{fieldError}</div>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create repair job'}
        </button>
      </div>
    </form>
  );
};

export default RepairForm;
