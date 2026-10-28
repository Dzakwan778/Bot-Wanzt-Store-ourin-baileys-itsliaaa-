import { useState, useEffect } from 'react';
import {
  PremiumProduct,
  SmmService,
  TopUpItem,
  XavieraProfileState,
  detectSmmPlatform,
} from '../types/dashboard.types';

export function useXavieraData(showToast: (msg: string) => void) {
  // Xaviera API Config
  const [xavieraApiKey, setXavieraApiKey] = useState<string>('');
  const [xavieraBaseUrl, setXavieraBaseUrl] = useState<string>('https://xavierastore.com/api/v1');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Profile data
  const [xavieraProfile, setXavieraProfile] = useState<XavieraProfileState>({
    loading: false,
    configured: false,
    data: null,
    error: null,
  });

  const fetchXavieraProfile = async () => {
    try {
      setXavieraProfile((prev) => ({ ...prev, loading: true }));
      const res = await fetch('/api/xaviera/profile');
      if (res.ok) {
        const json = await res.json();
        if (!json.configured) {
          setXavieraProfile({
            loading: false,
            configured: false,
            data: null,
            error: null,
          });
        } else if (json.success && json.data) {
          const raw = json.data;
          const userObj = raw.data || raw.user || raw;
          setXavieraProfile({
            loading: false,
            configured: true,
            data: {
              storeName:
                userObj.store_name ||
                userObj.storeName ||
                userObj.store ||
                userObj.username ||
                userObj.name ||
                'Wanzt Store',
              username: userObj.username || 'wanztstore',
              name: userObj.name || userObj.nama || 'Store Owner',
              email: userObj.email || '-',
              balance:
                userObj.balance !== undefined
                  ? userObj.balance
                  : userObj.saldo !== undefined
                  ? userObj.saldo
                  : 0,
              role: userObj.role || 'Member / Reseller',
              status: userObj.status || (userObj.is_active !== false ? 'Aktif' : 'Nonaktif'),
              isVerified: userObj.is_verified ?? true,
            },
            error: null,
          });
        } else {
          setXavieraProfile({
            loading: false,
            configured: true,
            data: null,
            error: json.error || 'Gagal memuat profil',
          });
        }
      }
    } catch (err: any) {
      setXavieraProfile((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Koneksi gagal',
      }));
    }
  };

  // Premium Products Data (Tab Produk)
  const [productsList, setProductsList] = useState<PremiumProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('Semua');

  const fetchXavieraProducts = async () => {
    try {
      setLoadingProducts(true);
      const url = xavieraApiKey?.trim()
        ? `/api/xaviera/products?apikey=${encodeURIComponent(xavieraApiKey.trim())}`
        : '/api/xaviera/products';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const rawItems = Array.isArray(json.data)
            ? json.data
            : json.data.products || json.data.items || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const mapped: PremiumProduct[] = [];
            rawItems.forEach((item: any, pIdx: number) => {
              const pName = (item.name || item.title || item.product_name || 'Akun Premium').trim();
              const cat = item.category || 'Premium Apps';
              if (item.hasVariants && Array.isArray(item.variants) && item.variants.length > 0) {
                item.variants.forEach((v: any, vIdx: number) => {
                  const stockNum = Number(v.stock);
                  mapped.push({
                    id: v.id || `${item.id || pIdx}-${vIdx}`,
                    name: pName,
                    variant: v.name || v.variant || 'Standard',
                    stock: !isNaN(stockNum) ? stockNum : (v.stock || 0),
                    price: Number(v.price || 0),
                    category: cat,
                    status: stockNum > 0 ? 'available' : 'empty',
                  });
                });
              } else {
                const stockNum = Number(item.stock);
                mapped.push({
                  id: item.id || pIdx + 1,
                  name: pName,
                  variant: item.variant || item.type || item.durasi || '1 Bulan',
                  stock: !isNaN(stockNum) ? stockNum : (item.stock !== undefined ? item.stock : 0),
                  price: Number(item.price || item.harga || 0),
                  category: cat,
                  status: item.status || (stockNum > 0 ? 'available' : 'empty'),
                });
              }
            });
            setProductsList(mapped);
            return;
          }
        }
      }
      setProductsList([]);
    } catch {
      setProductsList([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // SMM Services State
  const [smmList, setSmmList] = useState<SmmService[]>([]);
  const [loadingSmm, setLoadingSmm] = useState<boolean>(false);
  const [smmSearch, setSmmSearch] = useState<string>('');
  const [selectedSmmCategory, setSelectedSmmCategory] = useState<string>('Semua');
  const [smmPage, setSmmPage] = useState<number>(1);
  const [smmItemsPerPage, setSmmItemsPerPage] = useState<number>(25);

  const fetchXavieraSmm = async () => {
    try {
      setLoadingSmm(true);
      const res = await fetch('/api/xaviera/smm');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const rawServices = Array.isArray(json.data)
            ? json.data
            : json.data.services || json.data.items || json.data.data || [];

          if (Array.isArray(rawServices) && rawServices.length > 0) {
            const mapped: SmmService[] = rawServices.map((item: any, idx: number) => {
              const cat = item.category || item.kategori || 'Layanan SMM';
              const name = item.name || item.service_name || 'Layanan SMM';
              return {
                service: item.service || item.id || idx + 1,
                name: name,
                category: cat,
                rate: Number(item.rate || item.price || item.harga || 0),
                min: Number(item.min || 1),
                max: Number(item.max || 1000000),
                refill: item.refill === true || item.refill === 1 || String(item.refill).toLowerCase() === 'true',
                platformCategory: detectSmmPlatform(cat, name),
              };
            });
            setSmmList(mapped);
            setSmmPage(1);
            return;
          }
        }
      }
      setSmmList([]);
    } catch {
      setSmmList([]);
    } finally {
      setLoadingSmm(false);
    }
  };

  // Top Up Games & Digital Services State
  const [topUpList, setTopUpList] = useState<TopUpItem[]>([]);
  const [loadingTopUp, setLoadingTopUp] = useState<boolean>(false);
  const [topUpSearch, setTopUpSearch] = useState<string>('');
  const [selectedTopUpCategory, setSelectedTopUpCategory] = useState<string>('Semua');
  const [topUpPage, setTopUpPage] = useState<number>(1);
  const [topUpItemsPerPage, setTopUpItemsPerPage] = useState<number>(25);

  const fetchXavieraGames = async () => {
    try {
      setLoadingTopUp(true);
      const res = await fetch('/api/xaviera/games');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const rawGames = Array.isArray(json.data.games)
            ? json.data.games
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (rawGames.length > 0) {
            const mapped: TopUpItem[] = [];
            for (const g of rawGames) {
              const gameTitle = g.name || g.title || g.game || 'Game';
              const items = Array.isArray(g.items) ? g.items : Array.isArray(g.variants) ? g.variants : [];
              if (items.length > 0) {
                for (const it of items) {
                  mapped.push({
                    id: it.id || `${g.id}-${it.name}`,
                    game: gameTitle,
                    item: it.name || it.item || `${gameTitle} Item`,
                    category: gameTitle,
                    originalPrice: Number(it.price || it.harga || 0),
                    stock: it.stock !== undefined ? String(it.stock) : 'Tersedia',
                    server: it.server || g.target || 'Server/ID',
                    badge: it.badge,
                    status: 'available',
                  });
                }
              } else {
                mapped.push({
                  id: g.id || `game-${mapped.length}`,
                  game: gameTitle,
                  item: g.desc || `${gameTitle} Voucher / Top Up`,
                  category: gameTitle,
                  originalPrice: Number(g.price || g.harga || 0),
                  stock: 'Tersedia',
                  server: g.target || 'User ID & Server',
                  status: 'available',
                });
              }
            }
            if (mapped.length > 0) {
              setTopUpList(mapped);
              return;
            }
          }
        }
      }
      setTopUpList([]);
    } catch {
      setTopUpList([]);
    } finally {
      setLoadingTopUp(false);
    }
  };

  useEffect(() => {
    fetchXavieraProfile();
    fetchXavieraProducts();
  }, [xavieraApiKey, xavieraBaseUrl]);

  useEffect(() => {
    if (xavieraApiKey && xavieraApiKey.trim()) {
      fetchXavieraSmm();
      fetchXavieraGames();
    } else {
      setSmmList([]);
      setTopUpList([]);
    }
  }, [xavieraApiKey, xavieraBaseUrl]);

  return {
    xavieraApiKey,
    setXavieraApiKey,
    xavieraBaseUrl,
    setXavieraBaseUrl,
    showApiKey,
    setShowApiKey,
    xavieraProfile,
    fetchXavieraProfile,
    productsList,
    loadingProducts,
    productSearch,
    setProductSearch,
    selectedProductCategory,
    setSelectedProductCategory,
    fetchXavieraProducts,
    smmList,
    loadingSmm,
    smmSearch,
    setSmmSearch,
    selectedSmmCategory,
    setSelectedSmmCategory,
    smmPage,
    setSmmPage,
    smmItemsPerPage,
    setSmmItemsPerPage,
    fetchXavieraSmm,
    topUpList,
    loadingTopUp,
    topUpSearch,
    setTopUpSearch,
    selectedTopUpCategory,
    setSelectedTopUpCategory,
    topUpPage,
    setTopUpPage,
    topUpItemsPerPage,
    setTopUpItemsPerPage,
    fetchXavieraGames,
  };
}
