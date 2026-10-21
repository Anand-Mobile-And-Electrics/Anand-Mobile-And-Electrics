import type { Brand, Category, CreateProductInput, Product, StockAdjustmentInput } from '../services/inventory';

// Deliberately synthetic, session-only inventory. This adapter never contacts Supabase.
const categories: Category[] = [
  { id: 'DEMO-CAT-ACCESSORIES', name: 'Accessories' },
  { id: 'DEMO-CAT-PARTS', name: 'Parts' },
];
const brands: Brand[] = [
  { id: 'DEMO-BRAND-GENERIC', name: 'Generic (demo)' },
  { id: 'DEMO-BRAND-ANAND', name: 'Anand (demo)' },
];
let products: Product[] = [
  { id: 'DEMO-PRODUCT-001', name: 'Synthetic USB-C Cable', barcode: 'DEMO-1001', description: 'Synthetic demo record', category_id: categories[0].id, brand_id: brands[0].id, current_stock: 12, image_url: null, image_storage_path: null },
  { id: 'DEMO-PRODUCT-002', name: 'Synthetic Phone Battery', barcode: 'DEMO-1002', description: 'Synthetic demo record', category_id: categories[1].id, brand_id: brands[1].id, current_stock: 4, image_url: null, image_storage_path: null },
];

export const demoInventory = {
  async listCategories() { return [...categories]; },
  async listBrands() { return [...brands]; },
  async findProductByBarcode(barcode: string) { return products.find(p => p.barcode === barcode.trim()) ?? null; },
  async createProduct(input: CreateProductInput) {
    const name = input.name.trim();
    if (!name) throw new Error('Product name is required.');
    const barcode = input.barcode?.trim() || null;
    if (barcode && products.some((p) => p.barcode === barcode)) throw new Error('A product with this barcode already exists.');
    const product: Product = { id: `DEMO-PRODUCT-${String(products.length + 1).padStart(3, '0')}`, name, barcode, description: input.description?.trim() || null, category_id: input.category_id ?? null, brand_id: input.brand_id ?? null, current_stock: 0, image_url: null, image_storage_path: null };
    products = [...products, product];
    return product;
  },
  async adjustStock(input: StockAdjustmentInput) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('Stock quantity must be a positive whole number.');
    const product = products.find(p => p.id === input.productId);
    if (!product) throw new Error('Product not found.');
    const increases = input.type === 'receive' || input.type === 'returned';
    const current_stock = product.current_stock + (increases ? input.quantity : -input.quantity);
    if (current_stock < 0) throw new Error('Stock cannot become negative.');
    product.current_stock = current_stock;
    return { ...product };
  },
  async uploadProductImage(productId: string, file: File) {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found.');
    const path = `${productId}.${file.type.split('/')[1] || 'bin'}`;
    product.image_storage_path = path;
    product.image_url = `data:${file.type};base64,DEMO_IMAGE`;
    return { ...product };
  },
  reset() { products = products.filter(p => p.id.startsWith('DEMO-PRODUCT-00')); },
};
