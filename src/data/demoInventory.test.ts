import { describe, expect, it, beforeEach } from 'vitest';
import { demoInventory } from './demoInventory';

describe('demo inventory adapter', () => {
  beforeEach(() => demoInventory.reset());

  it('finds a synthetic product and adjusts stock', async () => {
    const product = await demoInventory.findProductByBarcode(' DEMO-1001 ');
    expect(product?.current_stock).toBe(12);
    const updated = await demoInventory.adjustStock({ productId: product!.id, quantity: 3, type: 'receive' });
    expect(updated.current_stock).toBe(15);
  });

  it('rejects duplicate barcodes and negative stock', async () => {
    await expect(demoInventory.createProduct({ name: 'Duplicate', barcode: 'DEMO-1001' })).rejects.toThrow('already exists');
    await expect(demoInventory.adjustStock({ productId: 'DEMO-PRODUCT-002', quantity: 5, type: 'sold' })).rejects.toThrow('negative');
  });

  it('creates and uploads a synthetic product image', async () => {
    const product = await demoInventory.createProduct({ name: 'Synthetic Charger', barcode: 'DEMO-NEW' });
    const updated = await demoInventory.uploadProductImage(product.id, new File(['image'], 'charger.png', { type: 'image/png' }));
    expect(updated.image_url).toContain('data:image/png');
  });
});
