import { supabase } from '../lib/supabase';
import { isDemoMode } from '../data/demoMode';
import { demoInventory } from '../data/demoInventory';

export interface Category { id: string; name: string; }
export interface Brand { id: string; name: string; }
export interface Product { id: string; name: string; barcode: string | null; description: string | null; category_id: string | null; brand_id: string | null; current_stock: number; image_url: string | null; image_storage_path: string | null; }
export type StockAdjustmentType = 'receive' | 'sold' | 'used_for_repair' | 'returned' | 'damaged' | 'adjustment';
export interface CreateProductInput { name: string; barcode?: string | null; description?: string | null; category_id?: string | null; brand_id?: string | null; }
export interface StockAdjustmentInput { productId: string; quantity: number; type: StockAdjustmentType; note?: string; }

export async function listCategories(): Promise<Category[]> {
  if (isDemoMode()) return demoInventory.listCategories();
  const { data, error } = await supabase.from('categories').select('*').order('name'); if (error) throw error; return data as Category[];
}
export async function listBrands(): Promise<Brand[]> {
  if (isDemoMode()) return demoInventory.listBrands();
  const { data, error } = await supabase.from('brands').select('*').order('name'); if (error) throw error; return data as Brand[];
}
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  if (isDemoMode()) return demoInventory.findProductByBarcode(barcode);
  const normalized = barcode.trim();
  if (!normalized) return null;
  const { data, error } = await supabase.from('products').select('*').eq('barcode', normalized).maybeSingle(); if (error) throw error; return data as Product | null;
}
export async function createProduct(input: CreateProductInput): Promise<Product> {
  if (isDemoMode()) return demoInventory.createProduct(input);
  const name = input.name.trim();
  if (!name) throw new Error('Product name is required.');
  const barcode = input.barcode?.trim() || null;
  const { data, error } = await supabase.from('products').insert({
    ...input,
    name,
    barcode,
    description: input.description?.trim() || null,
  }).select().single(); if (error) throw error; return data as Product;
}
export async function adjustStock(input: StockAdjustmentInput): Promise<Product> {
  if (isDemoMode()) return demoInventory.adjustStock(input);
  if (!input.productId) throw new Error('A product is required.');
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error('Quantity must be a whole number of at least 1.');
  if (!['receive', 'sold', 'used_for_repair', 'returned', 'damaged', 'adjustment'].includes(input.type)) throw new Error('Invalid stock adjustment type.');
  const { error } = await supabase.rpc('adjust_stock', { p_product_id: input.productId, p_quantity: input.quantity, p_type: input.type, p_reference: input.note || null }); if (error) throw error;
  const { data, error: readError } = await supabase.from('products').select('*').eq('id', input.productId).single(); if (readError) throw readError; return data as Product;
}
export async function uploadProductImage(productId: string, file: File): Promise<Product> {
  if (isDemoMode()) return demoInventory.uploadProductImage(productId, file);
  const path = `${productId}.${file.type.split('/')[1] || 'bin'}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true }); if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  const { data: product, error: updateError } = await supabase.from('products').update({ image_url: data.publicUrl, image_storage_path: path }).eq('id', productId).select().single(); if (updateError) throw updateError; return product as Product;
}
