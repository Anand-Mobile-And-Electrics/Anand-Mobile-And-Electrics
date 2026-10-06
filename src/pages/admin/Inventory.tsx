import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './Inventory.module.css';

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Product {
  id: string;
  name: string;
  barcode: string;
  current_stock: number;
  image_url: string;
}

const Inventory = () => {
  const { role } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // New Product State
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newBrandId, setNewBrandId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjustment State
  const [stockQty, setStockQty] = useState(1);
  const [stockType, setStockType] = useState('receive');
  const [stockNote, setStockNote] = useState('');

  useEffect(() => {
    loadCategoriesAndBrands();
  }, []);

  const loadCategoriesAndBrands = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    const { data: brnds } = await supabase.from('brands').select('*').order('name');
    if (cats) setCategories(cats);
    if (brnds) setBrands(brnds);
  };

  const handleBarcodeSearch = async (code: string) => {
    setMessage({ text: '', type: '' });
    const trimmed = code.trim();
    if (!trimmed) return;
    
    setBarcodeInput(trimmed);
    
    // Stop scanner if active
    if (isScanning) {
      stopScanner();
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', trimmed)
      .maybeSingle();

    if (error) {
      setMessage({ text: 'Error looking up barcode', type: 'error' });
      return;
    }

    if (data) {
      setActiveProduct(data);
      setIsNewProduct(false);
      setMessage({ text: `Found product: ${data.name}`, type: 'success' });
    } else {
      setActiveProduct(null);
      setIsNewProduct(true);
      setMessage({ text: 'Barcode not found. Create new product?', type: 'info' });
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    // HTML5 Qrcode Scanner needs a timeout to ensure the DOM element exists
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          scanner.clear();
          setIsScanning(false);
          handleBarcodeSearch(decodedText);
        },
        () => {
          // Ignore frequent scanning errors (e.g. no barcode detected)
        }
      );
    }, 100);
  };

  const stopScanner = () => {
    setIsScanning(false);
    // Note: Html5QrcodeScanner cleans itself up via UI buttons, 
    // but a proper manual unmount logic requires keeping the instance.
    // For simplicity, we just unmount the div using React conditional rendering, 
    // though the library might log a warning.
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      setMessage({ text: 'Name is required', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Insert product first (without image) to validate barcode/constraints
      const { data: newProduct, error: insertError } = await supabase.from('products').insert({
        name: newName,
        barcode: barcodeInput.trim() || null,
        description: newDesc,
        category_id: newCatId || null,
        brand_id: newBrandId || null
      }).select().single();
      
      if (insertError) {
        if (insertError.code === '23505') {
           throw new Error('A product with this barcode already exists (possibly created concurrently).');
        }
        throw insertError;
      }

      let imageUrl = null;
      let storagePath = null;
      
      // 2. Upload image if provided, using product ID for safety
      if (imageFile && newProduct) {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(imageFile, options);
        
        const fileExt = compressedFile.name.split('.').pop();
        const filePath = `${newProduct.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, compressedFile);
          
        if (uploadError) {
          // Note: The product is created but image failed. 
          console.error("Image upload failed", uploadError);
          setMessage({ text: 'Product created, but image upload failed.', type: 'error' });
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
            
          imageUrl = urlData.publicUrl;
          storagePath = filePath;

          // 3. Update product with image URL
          await supabase.from('products')
            .update({ image_url: imageUrl, image_storage_path: storagePath })
            .eq('id', newProduct.id);
            
          newProduct.image_url = imageUrl;
          newProduct.image_storage_path = storagePath;
        }
      }
      
      setMessage({ text: 'Product created successfully', type: 'success' });
      setIsNewProduct(false);
      setActiveProduct(newProduct);
      
      // Clear form
      setNewName('');
      setNewDesc('');
      setImageFile(null);
      setImagePreview('');
      
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create product', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('adjust_stock', {
        p_product_id: activeProduct.id,
        p_quantity: stockQty,
        p_type: stockType,
        p_reference: stockNote || null
      });
      
      if (error) throw error;
      
      setMessage({ text: 'Stock updated successfully', type: 'success' });
      setStockQty(1);
      setStockNote('');
      
      // Refresh active product stock
      const { data: updatedProduct } = await supabase
        .from('products')
        .select('*')
        .eq('id', activeProduct.id)
        .single();
        
      if (updatedProduct) {
        setActiveProduct(updatedProduct);
      }
      
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to adjust stock', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setActiveProduct(null);
    setIsNewProduct(false);
    setBarcodeInput('');
    setMessage({ text: '', type: '' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Inventory Management</h2>
        
        {message.text && (
          <div className={message.type === 'error' ? styles.error : styles.success} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {!activeProduct && !isNewProduct && (
          <div className={styles.scannerSection}>
            <div className={styles.scannerRow}>
              <div className={styles.inputGroup}>
                <label>Scan or Enter Barcode</label>
                <input 
                  type="text" 
                  value={barcodeInput} 
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBarcodeSearch(barcodeInput);
                  }}
                  placeholder="Enter barcode..."
                />
              </div>
              <button 
                className={styles.primaryButton}
                onClick={() => handleBarcodeSearch(barcodeInput)}
              >
                Search
              </button>
              <button 
                className={styles.secondaryButton}
                style={{ marginTop: '22px' }}
                onClick={() => isScanning ? stopScanner() : startScanner()}
              >
                {isScanning ? 'Stop Camera' : 'Camera Scan'}
              </button>
            </div>
            
            {isScanning && (
              <div id="reader"></div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button 
                className={styles.secondaryButton}
                onClick={() => {
                  setBarcodeInput('');
                  setIsNewProduct(true);
                }}
              >
                Manual Entry (No Barcode)
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE PRODUCT (STOCK ADJUSTMENT) */}
        {activeProduct && (
          <div>
            <div className={styles.productInfo}>
              <h3>{activeProduct.name}</h3>
              <p>Barcode: {activeProduct.barcode || 'N/A'}</p>
              <p>Current Stock: <strong>{activeProduct.current_stock}</strong></p>
              {activeProduct.image_url && (
                <img src={activeProduct.image_url} alt="Product" className={styles.imagePreview} style={{ maxHeight: '150px' }} />
              )}
            </div>

            <form onSubmit={handleAdjustStock} className={styles.scannerSection}>
              <h4>Adjust Stock</h4>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Type</label>
                  <select value={stockType} onChange={(e) => setStockType(e.target.value)}>
                    {role !== 'technician' && <option value="receive">Receive (+)</option>}
                    {role !== 'technician' && <option value="sold">Sold (-)</option>}
                    <option value="used_for_repair">Used for Repair (-)</option>
                    {role !== 'technician' && <option value="returned">Returned (+)</option>}
                    {role !== 'technician' && <option value="damaged">Damaged (-)</option>}
                    {role !== 'technician' && <option value="adjustment">Adjustment</option>}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={stockQty} 
                    onChange={(e) => setStockQty(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Reference Note (Optional)</label>
                <input 
                  type="text" 
                  value={stockNote} 
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder="e.g. Invoice #1234, Repair #55"
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Apply Stock Change'}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={resetFlow}>
                  Done
                </button>
              </div>
            </form>
          </div>
        )}

        {/* NEW PRODUCT FORM */}
        {isNewProduct && (
          <form onSubmit={handleCreateProduct} className={styles.scannerSection}>
            <div className={styles.productInfo}>
              <h3>Create New Product</h3>
              <p>Barcode: {barcodeInput ? barcodeInput : 'None (Manual Entry)'}</p>
            </div>

            {role === 'technician' ? (
              <div className={styles.error}>Technicians cannot create new products.</div>
            ) : (
              <>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Product Name *</label>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Barcode</label>
                    <input 
                      type="text" 
                      value={barcodeInput} 
                      onChange={(e) => setBarcodeInput(e.target.value)} 
                      placeholder="Optional"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Category</label>
                    <select value={newCatId} onChange={(e) => setNewCatId(e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Brand</label>
                    <select value={newBrandId} onChange={(e) => setNewBrandId(e.target.value)}>
                      <option value="">Select Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Description</label>
                  <input 
                    type="text" 
                    value={newDesc} 
                    onChange={(e) => setNewDesc(e.target.value)} 
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Product Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                  )}
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Product'}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={resetFlow}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default Inventory;
