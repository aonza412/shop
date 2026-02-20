

"use client";
import { useEffect, useState, useRef } from "react";
import { signInWithPopup, User, onAuthStateChanged, signOut, signInWithRedirect } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
}

const deleteCloudinaryImage = async (imageUrl: string) => {
  if (!imageUrl) return;
  try {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl })
    });
  } catch (error) {
    console.error("Failed to delete image", error);
  }
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const showAdminControls = user !== null && !isPreviewMode;

  const cCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretTrigger = () => {
    cCountRef.current += 1;
    if (cCountRef.current === 10) {
      setShowLoginModal(true);
      cCountRef.current = 0;
    }

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      cCountRef.current = 0;
    }, 600); // 600ms window for next tap
  };
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Settings State
  interface ShopSettings {
    shopName: string;
    logoUrl: string;
    bannerUrl: string;
    logoShape: string;
    logoSize: number;
    bannerHeight: number;
    theme: string;
    categories: string[];
    facebookUrl?: string;
    tiktokUrl?: string;
    mapEmbedUrl?: string;
    slideUrls?: string[];
  }

  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    shopName: "Elegant Collection",
    logoUrl: "",
    bannerUrl: "",
    logoShape: "rectangle",
    logoSize: 80,
    bannerHeight: 400,
    theme: "dark",
    categories: ["General", "Electronics", "Fashion", "Home", "Art"],
    slideUrls: []
  });
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'social' | 'activities'>('appearance');
  const [settingsForm, setSettingsForm] = useState({
    shopName: "",
    logoUrl: "",
    bannerUrl: "",
    logoShape: "rectangle",
    logoSize: 80,
    bannerHeight: 400,
    facebookUrl: "",
    tiktokUrl: "",
    mapEmbedUrl: "",
    slideUrls: [] as string[]
  });
  const [settingsFiles, setSettingsFiles] = useState<{ logoFile: File | null; bannerFile: File | null; slideFiles: File[] }>({ logoFile: null, bannerFile: null, slideFiles: [] });
  const [isSettingsUploading, setIsSettingsUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  // Product Management State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    category: "General"
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [slideLightboxUrl, setSlideLightboxUrl] = useState<string | null>(null);

  // Slideshow State
  const [currentSlide, setCurrentSlide] = useState(0);

  const applyTheme = (theme: string) => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  // Slideshow Effect
  useEffect(() => {
    if (!shopSettings.slideUrls || shopSettings.slideUrls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % shopSettings.slideUrls!.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [shopSettings.slideUrls]);

  const nextSlide = () => {
    if (!shopSettings.slideUrls) return;
    setCurrentSlide((prev) => (prev + 1) % shopSettings.slideUrls!.length);
  };

  const prevSlide = () => {
    if (!shopSettings.slideUrls) return;
    setCurrentSlide((prev) => (prev - 1 + shopSettings.slideUrls!.length) % shopSettings.slideUrls!.length);
  };

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setShopSettings({
            shopName: data.shopName || "Elegant Collection",
            logoUrl: data.logoUrl || "",
            bannerUrl: data.bannerUrl || "",
            logoShape: data.logoShape || "rectangle",
            logoSize: data.logoSize || 80,
            bannerHeight: data.bannerHeight || 400,
            facebookUrl: data.facebookUrl || "",
            tiktokUrl: data.tiktokUrl || "",
            mapEmbedUrl: data.mapEmbedUrl || "",
            theme: data.theme || "dark",
            categories: data.categories || ["General", "Electronics", "Fashion", "Home", "Art"],
            slideUrls: data.slideUrls || []
          });

          const initialTheme = data.theme || "dark";
          setCurrentTheme(initialTheme);
          applyTheme(initialTheme);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Restore login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);



  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setShowLoginModal(false);
    } catch (error: any) {
      console.error("Login failed", error);
      // Fallback to redirect if popup fails (common on mobile/tablet)
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error("Redirect login failed", redirectError);
        alert(`Login Failed: ${redirectError.message || 'Unknown error'}`);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- Admin Handlers ---

  const openSettingsModal = () => {
    setSettingsForm({
      shopName: shopSettings.shopName,
      logoUrl: shopSettings.logoUrl,
      bannerUrl: shopSettings.bannerUrl,
      logoShape: shopSettings.logoShape,
      logoSize: shopSettings.logoSize,
      bannerHeight: shopSettings.bannerHeight || 400,
      facebookUrl: shopSettings.facebookUrl || "",
      tiktokUrl: shopSettings.tiktokUrl || "",
      mapEmbedUrl: shopSettings.mapEmbedUrl || "",
      slideUrls: shopSettings.slideUrls || []
    });
    setSettingsFiles({ logoFile: null, bannerFile: null, slideFiles: [] });
    setNewCategory("");
    setShowSettingsModal(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    const updatedCategories = [...shopSettings.categories, newCategory.trim()];
    try {
      const docRef = doc(db, "settings", "general");
      await setDoc(docRef, { categories: updatedCategories }, { merge: true });

      setShopSettings(prev => ({ ...prev, categories: updatedCategories }));
      setNewCategory("");
      setShowCategoryInput(false);
    } catch (error) {
      console.error("Failed to add category", error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Check if products exist in this category
    const hasProducts = products.some(p => (p.category || 'General') === categoryToDelete);

    if (hasProducts) {
      showNotification(`Cannot delete "${categoryToDelete}". Please delete all products in this category first.`, 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${categoryToDelete}"?`)) return;

    const updatedCategories = shopSettings.categories.filter(c => c !== categoryToDelete);
    try {
      const docRef = doc(db, "settings", "general");
      await setDoc(docRef, { categories: updatedCategories }, { merge: true });

      setShopSettings(prev => ({ ...prev, categories: updatedCategories }));
      showNotification(`Category "${categoryToDelete}" deleted successfully.`, 'success');
    } catch (error) {
      console.error("Failed to delete category", error);
      showNotification("Failed to delete category.", 'error');
    }
  };

  const handleAddPendingSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    setSettingsFiles(prev => ({ ...prev, slideFiles: [...prev.slideFiles, ...filesArray] }));
    // Reset input value so same files can be selected again if removed
    e.target.value = "";
  };

  const handleRemoveExistingSlide = (urlToRemove: string) => {
    setSettingsForm(prev => ({ ...prev, slideUrls: prev.slideUrls.filter(url => url !== urlToRemove) }));
  };

  const handleRemovePendingSlide = (indexToRemove: number) => {
    setSettingsFiles(prev => ({ ...prev, slideFiles: prev.slideFiles.filter((_, i) => i !== indexToRemove) }));
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsUploading(true);
    let updatedForm = { ...settingsForm };

    try {
      // Upload Logo
      if (settingsFiles.logoFile) {
        const formData = new FormData();
        formData.append('file', settingsFiles.logoFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Failed to upload logo');
        const data = await res.json();
        updatedForm.logoUrl = data.url;

        // Delete old logo after successful new upload
        if (shopSettings.logoUrl && shopSettings.logoUrl !== updatedForm.logoUrl) {
          await deleteCloudinaryImage(shopSettings.logoUrl);
        }
      } else if (updatedForm.logoUrl === "" && shopSettings.logoUrl) {
        // User cleared the logo
        await deleteCloudinaryImage(shopSettings.logoUrl);
      }

      // Upload Banner
      if (settingsFiles.bannerFile) {
        const formData = new FormData();
        formData.append('file', settingsFiles.bannerFile);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Failed to upload banner');
        const data = await res.json();
        updatedForm.bannerUrl = data.url;

        // Delete old banner after successful new upload
        if (shopSettings.bannerUrl && shopSettings.bannerUrl !== updatedForm.bannerUrl) {
          await deleteCloudinaryImage(shopSettings.bannerUrl);
        }
      } else if (updatedForm.bannerUrl === "" && shopSettings.bannerUrl) {
        // User cleared the banner
        await deleteCloudinaryImage(shopSettings.bannerUrl);
      }

      const docRef = doc(db, "settings", "general");

      // Upload Activity Slides
      let finalSlideUrls = [...(settingsForm.slideUrls || [])];

      // Delete removed slides
      const removedSlides = (shopSettings.slideUrls || []).filter(url => !finalSlideUrls.includes(url));
      for (const url of removedSlides) {
        await deleteCloudinaryImage(url);
      }

      // Upload new slides
      if (settingsFiles.slideFiles && settingsFiles.slideFiles.length > 0) {
        for (const file of settingsFiles.slideFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            finalSlideUrls.push(data.url);
          }
        }
      }
      updatedForm.slideUrls = finalSlideUrls;

      await setDoc(docRef, updatedForm, { merge: true });

      setShopSettings({ ...shopSettings, ...updatedForm });
      setShowSettingsModal(false);
      showNotification("Settings updated successfully.", 'success');
    } catch (error) {
      console.error("Failed to update settings", error);
      showNotification("Failed to update settings.", 'error');
    } finally {
      setIsSettingsUploading(false);
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      imageUrl: "",
      category: selectedCategory || "General"
    });
    setImageFile(null);
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      category: product.category
    });
    setImageFile(null);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = productForm.imageUrl;

      if (imageFile) {
        // Delete old image if editing and replacing
        if (editingProduct && editingProduct.imageUrl) {
          await deleteCloudinaryImage(editingProduct.imageUrl);
        }

        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Failed to upload image');

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // Add or Update Product
      if (editingProduct) {
        const docRef = doc(db, "products", editingProduct.id);
        await updateDoc(docRef, {
          ...productForm,
          imageUrl,
          updatedAt: new Date().toISOString()
        });
        showNotification("Product updated successfully.", 'success');
      } else {
        await addDoc(collection(db, "products"), {
          ...productForm,
          imageUrl,
          createdAt: new Date().toISOString()
        });
        showNotification("Product added successfully.", 'success');
      }

      await fetchProducts();
      setShowProductModal(false);
    } catch (error) {
      console.error("Failed to save product", error);
      showNotification("Failed to save product.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const productToDelete = products.find(p => p.id === id);
    if (!productToDelete) return;

    try {
      if (productToDelete.imageUrl) {
        await deleteCloudinaryImage(productToDelete.imageUrl);
      }
      await deleteDoc(doc(db, "products", id));
      await fetchProducts();
      showNotification("Product deleted successfully.", 'success');
    } catch (error) {
      console.error("Failed to delete product", error);
      showNotification("Failed to delete product.", 'error');
    }
  };

  return (
    <>
      <div className="container" style={{ position: 'relative' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            cursor: 'pointer',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)'
          }}
          title="Toggle Theme"
        >
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
          }}>
            <div className="modal-content-container" style={{ textAlign: 'center', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Admin Access</h2>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={() => setShowLoginModal(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleLogin} className="btn">Login with Google</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
          }}>
            <div className="modal-content-container">
              <h2 style={{ marginBottom: '1.5rem' }}>Shop Settings</h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                <button type="button" onClick={() => setSettingsTab('appearance')} style={{ background: 'none', border: 'none', borderBottom: settingsTab === 'appearance' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'appearance' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Appearance</button>
                <button type="button" onClick={() => setSettingsTab('activities')} style={{ background: 'none', border: 'none', borderBottom: settingsTab === 'activities' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'activities' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Activities</button>
                <button type="button" onClick={() => setSettingsTab('social')} style={{ background: 'none', border: 'none', borderBottom: settingsTab === 'social' ? '2px solid var(--accent)' : '2px solid transparent', color: settingsTab === 'social' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Social/Map</button>
              </div>

              <form onSubmit={handleSettingsSubmit}>
                {settingsTab === 'appearance' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Shop Name</label>
                      <input type="text" className="form-input" value={settingsForm.shopName} onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Shop Logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSettingsFiles({ ...settingsFiles, logoFile: e.target.files[0] });
                          }
                        }}
                      />
                      {(settingsFiles.logoFile || settingsForm.logoUrl) && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{ width: '100px', height: '100px', borderRadius: settingsForm.logoShape === 'circle' ? '50%' : '8px', overflow: 'hidden', border: '1px solid var(--card-border)', background: '#222' }}>
                            <img
                              src={settingsFiles.logoFile ? URL.createObjectURL(settingsFiles.logoFile) : settingsForm.logoUrl}
                              alt="Logo Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSettingsFiles({ ...settingsFiles, logoFile: null }); setSettingsForm({ ...settingsForm, logoUrl: "" }); }}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Logo Size ({settingsForm.logoSize}px)</label>
                      <input
                        type="range"
                        min="40"
                        max="200"
                        step="5"
                        className="form-input"
                        value={settingsForm.logoSize}
                        onChange={(e) => setSettingsForm({ ...settingsForm, logoSize: parseInt(e.target.value) })}
                        style={{ padding: 0 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Logo Shape</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        {['rectangle', 'square', 'circle'].map(shape => (
                          <label key={shape} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', textTransform: 'capitalize' }}>
                            <input type="radio" value={shape} checked={settingsForm.logoShape === shape} onChange={(e) => setSettingsForm({ ...settingsForm, logoShape: e.target.value })} style={{ marginRight: '0.5rem' }} />
                            {shape}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Shop Banner</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSettingsFiles({ ...settingsFiles, bannerFile: e.target.files[0] });
                          }
                        }}
                      />
                      {(settingsFiles.bannerFile || settingsForm.bannerUrl) && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                            <img
                              src={settingsFiles.bannerFile ? URL.createObjectURL(settingsFiles.bannerFile) : settingsForm.bannerUrl}
                              alt="Banner Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSettingsFiles({ ...settingsFiles, bannerFile: null }); setSettingsForm({ ...settingsForm, bannerUrl: "" }); }}
                            className="btn btn-secondary"
                            style={{ alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Remove Flag/Banner
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Banner Height ({settingsForm.bannerHeight || 400}px)</label>
                      <input
                        type="range"
                        min="200"
                        max="800"
                        step="50"
                        className="form-input"
                        value={settingsForm.bannerHeight || 400}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bannerHeight: parseInt(e.target.value) })}
                        style={{ padding: 0 }}
                      />
                    </div>



                  </>
                )}

                {settingsTab === 'social' && (
                  <>

                    <div className="form-group">
                      <label className="form-label">Facebook URL</label>
                      <input type="text" className="form-input" value={settingsForm.facebookUrl} onChange={(e) => setSettingsForm({ ...settingsForm, facebookUrl: e.target.value })} placeholder="https://facebook.com/..." />
                    </div>

                    <div className="form-group">
                      <label className="form-label">TikTok URL</label>
                      <input type="text" className="form-input" value={settingsForm.tiktokUrl} onChange={(e) => setSettingsForm({ ...settingsForm, tiktokUrl: e.target.value })} placeholder="https://tiktok.com/@..." />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Google Maps Embed URL</label>
                      <input type="text" className="form-input" value={settingsForm.mapEmbedUrl} onChange={(e) => setSettingsForm({ ...settingsForm, mapEmbedUrl: e.target.value })} placeholder="Paste <iframe src='...'> or just the URL" />
                      <small style={{ color: 'var(--text-secondary)' }}>Paste the full Embed HTML or just the src URL.</small>
                    </div>
                  </>
                )}

                {settingsTab === 'activities' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Activity Slides</label>
                      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: '1rem' }}>
                        {/* Existing Slides */}
                        {(settingsForm.slideUrls || []).map((url, i) => (
                          <div key={`existing-${i}`} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                            <img src={url} alt={`Slide ${i}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingSlide(url)}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: '#ff4d4f', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {/* Pending Slides */}
                        {(settingsFiles.slideFiles || []).map((file, i) => (
                          <div key={`pending-${i}`} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '2px dashed var(--accent)', padding: '2px' }}>
                            <span style={{ position: 'absolute', top: '5px', left: '5px', background: 'var(--accent)', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', zIndex: 10 }}>NEW</span>
                            <img src={URL.createObjectURL(file)} alt={`New Slide ${i}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                            <button
                              type="button"
                              onClick={() => handleRemovePendingSlide(i)}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: '#ff4d4f', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', zIndex: 10 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: '1rem', border: '1px dashed var(--card-border)', borderRadius: '8px', textAlign: 'center' }}>
                        <label style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 500 }}>
                          + Select Slide Images
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddPendingSlide} multiple />
                        </label>
                      </div>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-secondary" disabled={isSettingsUploading}>Cancel</button>
                  <button type="submit" className="btn" disabled={isSettingsUploading}>{isSettingsUploading ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {showProductModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)'
          }}>
            <div className="modal-content-container">
              <h2 style={{ marginBottom: '1.5rem' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <form onSubmit={handleProductSubmit}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input required type="text" className="form-input" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    disabled={!editingProduct} // Lock category when adding new product
                    style={!editingProduct ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  >
                    {shopSettings.categories && shopSettings.categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea required className="form-textarea" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                  />
                  {(imageFile || productForm.imageUrl) && (
                    <div style={{ marginTop: '1rem', width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : productForm.imageUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary" disabled={isUploading}>Cancel</button>
                  <button type="submit" className="btn" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : (editingProduct ? 'Update' : 'Add') + ' Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <header
          className="hero"
          style={{
            position: 'relative',
            backgroundImage: shopSettings.bannerUrl ? `url(${shopSettings.bannerUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '20px',
            marginBottom: '2rem',
            minHeight: `${shopSettings.bannerHeight || 400}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {shopSettings.bannerUrl && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
              borderRadius: '20px',
              zIndex: 1
            }}></div>
          )}

          {user && (
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', zIndex: 3 }}>
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: isPreviewMode ? 'var(--accent)' : 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', width: 'auto' }}
              >
                {isPreviewMode ? 'Exit Preview' : 'Preview'}
              </button>
              <div style={{ padding: '0.4rem 0.6rem', background: 'rgba(94, 106, 210, 0.6)', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{user.displayName?.split(" ")[0]}</span>
              </div>
              <button onClick={() => signOut(auth)} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', width: 'auto' }}>
                Logout
              </button>
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ position: 'relative', display: 'inline-block' }} onClick={handleSecretTrigger}>
              {shopSettings.logoUrl && (
                <img
                  src={shopSettings.logoUrl}
                  alt="Logo"
                  style={{
                    height: `${shopSettings.logoSize}px`,
                    width: shopSettings.logoShape === 'rectangle' ? 'auto' : `${shopSettings.logoSize}px`,
                    borderRadius: shopSettings.logoShape === 'circle' ? '50%' : '0',
                    objectFit: shopSettings.logoShape === 'rectangle' ? 'contain' : 'cover',
                    marginBottom: '1rem',
                    display: 'block',
                    margin: '0 auto 1rem auto',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                  }}
                />
              )}
              {showAdminControls && (
                <button onClick={openSettingsModal} title="Edit Shop Settings" style={{
                  position: 'absolute', top: -10, right: -40, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  ⚙️
                </button>
              )}
            </div>




          </div>
        </header>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className="title" onClick={handleSecretTrigger} style={{ cursor: 'pointer', userSelect: 'none' }}>{shopSettings.shopName}</h1>
          <p className="subtitle">Discover our curated selection of premium goods.</p>
        </div>

        {/* Activity Slides */}
        {shopSettings.slideUrls && shopSettings.slideUrls.length > 0 && selectedCategory === null && (
          <div className="slideshow-container">
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Activities & Promotions</h2>
            <div style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              background: 'var(--card-bg)',
              aspectRatio: '16/9' // Maintain a nice wide aspect ratio
            }}>
              {shopSettings.slideUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Activity Slide ${index + 1}`}
                  onClick={() => setSlideLightboxUrl(url)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: index === currentSlide ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                    zIndex: index === currentSlide ? 1 : 0,
                    cursor: 'pointer'
                  }}
                />
              ))}

              {/* Prev/Next Buttons */}
              {shopSettings.slideUrls.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '10px',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    ❮
                  </button>
                  <button
                    onClick={nextSlide}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '10px',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    ❯
                  </button>
                </>
              )}

              {/* Navigation Dots */}
              {shopSettings.slideUrls.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: '15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 2
                }}>
                  {shopSettings.slideUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        background: index === currentSlide ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'background 0.3s ease'
                      }}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {user && selectedCategory === null && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            {/* Logic moved to Add Category card, so this main button might be redundant or can be kept for quick product add if needed. 
                Based on user request "Create and delete categories via button on page, add items inside category", 
                we hide the global 'Add Product' button when in category view.
            */}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading curation...</div>
        ) : (
          <div className="grid">
            {selectedCategory === null ? (
              // Show Categories
              <>
                {shopSettings.categories && shopSettings.categories
                  .filter(category => showAdminControls || products.some(p => (p.category || 'General') === category))
                  .map((category) => {
                    // Find first product in category to use as cover image
                    const coverProduct = products.find(p => (p.category || 'General') === category);
                    return (
                      <article
                        key={category}
                        className="card"
                        style={{ cursor: 'pointer', position: 'relative' }}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <div className="card-image-container">
                          <img
                            src={coverProduct?.imageUrl || "https://placehold.co/600x400/1a1a23/FFF?text=No+Image"}
                            alt={category}
                            className="card-image"
                            loading="lazy"
                          />
                        </div>
                        <div className="card-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <h2 className="card-title" style={{ fontSize: '1.5rem' }}>{category}</h2>
                          <p className="card-desc">{products.filter(p => (p.category || 'General') === category).length} Products</p>
                        </div>

                        {showAdminControls && (
                          <div style={{
                            position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem',
                            background: 'rgba(0,0,0,0.6)', padding: '0.5rem', borderRadius: '8px', backdropFilter: 'blur(4px)'
                          }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ff6347' }}
                              title="Delete Category"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                {/* Add Category Card */}
                {showAdminControls && (
                  <article className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', borderStyle: 'dashed' }}>
                    {showCategoryInput ? (
                      <form onSubmit={handleAddCategory} style={{ padding: '1rem', width: '100%', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem' }}>New Category</h3>
                        <input
                          autoFocus
                          type="text"
                          className="form-input"
                          style={{ marginBottom: '1rem' }}
                          placeholder="Category Name"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button type="button" onClick={() => setShowCategoryInput(false)} className="btn btn-secondary">Cancel</button>
                          <button type="submit" className="btn">Add</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setShowCategoryInput(true)} className="btn btn-secondary" style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '3rem' }}>+</span>
                        Add Category
                      </button>
                    )}
                  </article>
                )}
              </>
            ) : (
              // Show Products in Selected Category
              <>
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setSelectedCategory(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      ← Back
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedCategory}</h2>
                  </div>
                  {showAdminControls && (
                    <button onClick={openAddProduct} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      <span>+</span> Add Product
                    </button>
                  )}
                </div>
                {products
                  .filter(product => (product.category || 'General') === selectedCategory)
                  .map((product) => (
                    <article
                      key={product.id}
                      className="card"
                      style={{ position: 'relative', cursor: 'pointer' }}
                      onClick={() => setViewingProduct(product)}
                    >
                      <div className="card-image-container">
                        <img
                          src={product.imageUrl || "https://placehold.co/600x400/1a1a23/FFF?text=No+Image"}
                          alt={product.name}
                          className="card-image"
                          loading="lazy"
                        />
                      </div>
                      <div className="card-content">
                        {/* Removing Badge since we are IN the category view already <span className="badge">{product.category}</span> */}
                        <h2 className="card-title">{product.name}</h2>
                        <p className="card-desc" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>{product.description}</p>
                      </div>

                      {showAdminControls && (
                        <div style={{
                          position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem',
                          background: 'rgba(0,0,0,0.6)', padding: '0.5rem', borderRadius: '8px', backdropFilter: 'blur(4px)'
                        }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); openEditProduct(product); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Edit">
                            ✏️
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Delete">
                            🗑️
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--card-border)', position: 'relative' }}>
          {showAdminControls && (
            <button
              onClick={openSettingsModal}
              title="Edit Footer Info"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
            >
              ✏️
            </button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Social Links */}
            <div>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Connect</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {shopSettings.facebookUrl && (
                  <a href={shopSettings.facebookUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#1877F2' }}>
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                    </svg>
                    Facebook
                  </a>
                )}
                {shopSettings.tiktokUrl && (
                  <a href={shopSettings.tiktokUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: currentTheme === 'dark' ? '#ffffff' : '#000000' }}>
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    TikTok
                  </a>
                )}
                {!shopSettings.facebookUrl && !shopSettings.tiktokUrl && (
                  <p style={{ color: 'var(--text-secondary)' }}>No social links configured.</p>
                )}
              </div>
            </div>

            {/* Map */}
            <div>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Location</h3>
              {shopSettings.mapEmbedUrl ? (
                (() => {
                  const src = shopSettings.mapEmbedUrl.includes('<iframe')
                    ? shopSettings.mapEmbedUrl.match(/src="([^"]+)"/)?.[1]
                    : shopSettings.mapEmbedUrl;

                  if (src && (src.includes('/maps/embed') || src.includes('output=embed'))) {
                    return (
                      <div style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                        <iframe src={src} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Map cannot be embedded.</p>
                        <a href={src} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: 'none' }}>View on Google Maps</a>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tip: Use "Share" &rarr; "Embed a map" URL.</p>
                      </div>
                    );
                  }
                })()
              ) : (
                <div style={{ width: '100%', height: '200px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No map configured
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            &copy; {new Date().getFullYear()} {shopSettings.shopName}. All rights reserved.
          </div>
        </footer>

      </div>
      {/* Product Detail Modal */}
      {viewingProduct && (
        <div className="modal-overlay" onClick={() => setViewingProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setViewingProduct(null)}>×</button>
            <div className="product-modal-image-container" onClick={() => setShowLightbox(true)} style={{ cursor: 'zoom-in' }}>
              <img
                src={viewingProduct.imageUrl || "https://placehold.co/800x800/1a1a23/FFF?text=No+Image"}
                alt={viewingProduct.name}
                className="product-modal-image"
              />
            </div>
            <div className="product-modal-content">
              <span className="badge" style={{ alignSelf: 'flex-start' }}>{viewingProduct.category}</span>
              <h2 style={{ fontSize: '2rem', margin: '1rem 0', lineHeight: 1.2 }}>{viewingProduct.name}</h2>
              <div style={{
                width: '50px',
                height: '4px',
                background: 'var(--accent)',
                borderRadius: '2px',
                marginBottom: '1.5rem'
              }} />
              <p style={{
                fontSize: '1.1rem',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap'
              }}>
                {viewingProduct.description}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox for Full Image */}
      {showLightbox && viewingProduct && (
        <div
          className="modal-overlay"
          style={{ zIndex: 3000, background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setShowLightbox(false)}
        >
          <button style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '3rem',
            cursor: 'pointer'
          }}>×</button>
          <img
            src={viewingProduct.imageUrl}
            alt="Full View"
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lightbox for Activity Slides */}
      {slideLightboxUrl && (
        <div
          className="modal-overlay"
          style={{ zIndex: 3000, background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSlideLightboxUrl(null)}
        >
          <button style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '3rem',
            lineHeight: 1,
            cursor: 'pointer'
          }}>×</button>
          <img
            src={slideLightboxUrl}
            alt="Full Slide View"
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Global Loading Overlay */}
      {(isUploading || isSettingsUploading) && (
        <div className="modal-overlay" style={{ zIndex: 9999, flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.8)' }}>
          <div className="spinner"></div>
          <p style={{ color: 'white', fontWeight: 500, fontSize: '1.2rem', letterSpacing: '0.5px' }}>Processing...</p>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: notification.type === 'error' ? '#ff4d4f' : notification.type === 'warning' ? '#faad14' : '#52c41a',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {notification.type === 'warning' ? '⚠️' : notification.type === 'error' ? '❌' : '✅'}
          {notification.message}
        </div>
      )}
    </>
  );
}
