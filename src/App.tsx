import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  KeyRound,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Play,
  Square,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Link as LinkIcon,
  Phone as PhoneIcon,
  MessageSquare,
  X,
  ChevronDown,
  ListFilter,
  FileText,
  Bell,
  Image as ImageIcon,
  Upload,
  Globe,
  Eye,
  EyeOff,
  Save,
  Key,
  Store,
  Wallet,
  User,
  BadgeCheck,
  Package,
  Search,
  Filter
} from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'code';
  message: string;
}

interface BotStatusResponse {
  status: 'idle' | 'connecting' | 'waiting_code' | 'code_ready' | 'connected' | 'closed' | 'error';
  phoneNumber: string;
  pairingCode: string;
  customCode: string;
  user: { id?: string; name?: string } | null;
  logs: LogEntry[];
  hasSession: boolean;
  isRegistered: boolean;
}

export type WhatsAppButtonType =
  | 'quick_reply'
  | 'cta_url'
  | 'cta_copy'
  | 'cta_call'
  | 'cta_reminder'
  | 'cta_cancel_reminder';

export interface WhatsAppButton {
  id: string;
  type: WhatsAppButtonType;
  name: string;
  output: string;
  triggerAction?: 'list' | 'unknown';
  callTargetName?: string;
  callPhoneNumber?: string;
}

export interface PremiumProduct {
  id: string | number;
  name: string;
  variant: string;
  stock: number | string;
  price: number;
  category?: string;
  status?: 'available' | 'empty' | 'preorder';
}

export default function App() {
  const [phone, setPhone] = useState('87783369472');
  const [customCode, setCustomCode] = useState('WANZTSTR');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('Command');

  // Command State
  const [selectedCommand, setSelectedCommand] = useState<'Menu' | 'List'>('Menu');
  const [menuOutputText, setMenuOutputText] = useState<string>(
    'Halo kak! Selamat datang di wanztstore.web.id 🛒\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:'
  );
  const [menuButtons, setMenuButtons] = useState<WhatsAppButton[]>([
    {
      id: 'btn-1',
      type: 'quick_reply',
      name: '📦 Katalog Produk',
      output: '.katalog',
    },
    {
      id: 'btn-2',
      type: 'cta_url',
      name: '🌐 Buka Website',
      output: 'https://wanztstore.web.id',
    },
    {
      id: 'btn-3',
      type: 'cta_call',
      name: '📞 Hubungi Admin',
      output: 'Admin Store (6285712439395)',
      callTargetName: 'Admin Store',
      callPhoneNumber: '6285712439395',
    },
  ]);

  const [listOutputText, setListOutputText] = useState<string>(
    'Silakan pilih kategori produk dari daftar list di bawah ini untuk melihat detail produk:'
  );

  // Media Menu from ./src/media/picture
  const [includeMedia, setIncludeMedia] = useState<boolean>(false);
  const [selectedPicture, setSelectedPicture] = useState<string>('');
  const [availablePictures, setAvailablePictures] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/media/pictures')
      .then(res => res.json())
      .then(data => {
        if (data.pictures) {
          setAvailablePictures(data.pictures);
          if (data.pictures.length > 0 && !selectedPicture) {
            setSelectedPicture(data.pictures[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Modal Add / Edit Button State (State terisolasi untuk tiap tipe agar https:// tidak bocor)
  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [modalBtnType, setModalBtnType] = useState<WhatsAppButtonType>('quick_reply');
  const [modalBtnName, setModalBtnName] = useState('');
  
  // Dedicated inputs per type (Bebas dari kontaminasi https://)
  const [quickReplyOutput, setQuickReplyOutput] = useState('');
  const [quickReplyAction, setQuickReplyAction] = useState<'list' | 'unknown'>('unknown');
  const [urlOutput, setUrlOutput] = useState('https://');
  const [copyOutput, setCopyOutput] = useState('');
  const [reminderOutput, setReminderOutput] = useState('');
  const [cancelReminderOutput, setCancelReminderOutput] = useState('');
  const [callTarget, setCallTarget] = useState('');
  const [callPhone, setCallPhone] = useState('');

  const [botData, setBotData] = useState<BotStatusResponse>({
    status: 'idle',
    phoneNumber: '',
    pairingCode: '',
    customCode: 'WANZTSTR',
    user: null,
    logs: [],
    hasSession: false,
    isRegistered: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Xaviera API State (tab06)
  const [xavieraApiKey, setXavieraApiKey] = useState<string>('');
  const [xavieraBaseUrl, setXavieraBaseUrl] = useState<string>('https://xavierastore.com/api/v1');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Profile data from Xaviera API
  interface XavieraProfileData {
    storeName?: string;
    username?: string;
    name?: string;
    email?: string;
    balance?: number | string;
    role?: string;
    status?: string;
    isVerified?: boolean;
    phone?: string;
    createdAt?: string;
  }

  const [xavieraProfile, setXavieraProfile] = useState<{
    loading: boolean;
    configured: boolean;
    data: XavieraProfileData | null;
    error: string | null;
  }>({
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
              storeName: userObj.store_name || userObj.storeName || userObj.store || userObj.username || userObj.name || 'Wanzt Store',
              username: userObj.username || 'wanztstore',
              name: userObj.name || userObj.nama || 'Store Owner',
              email: userObj.email || '-',
              balance: userObj.balance !== undefined ? userObj.balance : userObj.saldo !== undefined ? userObj.saldo : 0,
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

  useEffect(() => {
    fetchXavieraProfile();
  }, [xavieraApiKey, xavieraBaseUrl]);

  // Premium Products Data (Tab Produk)
  const SAMPLE_PREMIUM_PRODUCTS: PremiumProduct[] = [
    // YouTube
    { id: 'yt-1', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan', stock: 9, price: 3000, category: 'Streaming', status: 'available' },
    { id: 'yt-2', name: 'YouTube', variant: 'YouTube Famplan 2 Bulan', stock: 14, price: 5000, category: 'Streaming', status: 'available' },
    { id: 'yt-3', name: 'YouTube', variant: 'YouTube Indplan 3 Bulan', stock: 7, price: 11000, category: 'Streaming', status: 'available' },
    { id: 'yt-4', name: 'YouTube', variant: 'YouTube Premium 1 Bulan', stock: 12, price: 4000, category: 'Streaming', status: 'available' },
    { id: 'yt-5', name: 'YouTube', variant: 'YouTube Premium 3 Bulan', stock: 6, price: 10000, category: 'Streaming', status: 'available' },
    { id: 'yt-6', name: 'YouTube', variant: 'YouTube Premium 6 Bulan', stock: 3, price: 18000, category: 'Streaming', status: 'available' },
    { id: 'yt-7', name: 'YouTube', variant: 'YouTube Premium 12 Bulan', stock: 5, price: 32000, category: 'Streaming', status: 'available' },
    { id: 'yt-8', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan No Garansi', stock: 11, price: 2500, category: 'Streaming', status: 'available' },
    // Spotify
    { id: 'sp-1', name: 'Spotify', variant: 'Spotify Famplan 2 Bulan', stock: 4, price: 7000, category: 'Music', status: 'available' },
    { id: 'sp-2', name: 'Spotify', variant: 'Spotify Indplan 3 Bulan No Garansi', stock: 8, price: 5000, category: 'Music', status: 'available' },
    { id: 'sp-3', name: 'Spotify', variant: 'Spotify Premium 1 Bulan', stock: 15, price: 3000, category: 'Music', status: 'available' },
    { id: 'sp-4', name: 'Spotify', variant: 'Spotify Premium 2 Bulan', stock: 10, price: 5500, category: 'Music', status: 'available' },
    { id: 'sp-5', name: 'Spotify', variant: 'Spotify Premium 3 Bulan', stock: 7, price: 8000, category: 'Music', status: 'available' },
    { id: 'sp-6', name: 'Spotify', variant: 'Spotify Premium 6 Bulan', stock: 5, price: 15000, category: 'Music', status: 'available' },
    { id: 'sp-7', name: 'Spotify', variant: 'Spotify Premium 12 Bulan', stock: 2, price: 28000, category: 'Music', status: 'available' },
    { id: 'sp-8', name: 'Spotify', variant: 'Spotify Famplan 1 Bulan', stock: 13, price: 4000, category: 'Music', status: 'available' },
    // Netflix
    { id: 'nf-1', name: 'Netflix', variant: 'Netflix Premium 1 Bulan', stock: 6, price: 12000, category: 'Streaming', status: 'available' },
    { id: 'nf-2', name: 'Netflix', variant: 'Netflix Premium 2 Bulan', stock: 4, price: 22000, category: 'Streaming', status: 'available' },
    { id: 'nf-3', name: 'Netflix', variant: 'Netflix Sharing 1 Bulan', stock: 12, price: 5000, category: 'Streaming', status: 'available' },
    { id: 'nf-4', name: 'Netflix', variant: 'Netflix Sharing 2 Bulan', stock: 8, price: 9000, category: 'Streaming', status: 'available' },
    { id: 'nf-5', name: 'Netflix', variant: 'Netflix Private 1 Bulan', stock: 3, price: 25000, category: 'Streaming', status: 'available' },
    { id: 'nf-6', name: 'Netflix', variant: 'Netflix Private 3 Bulan', stock: 2, price: 65000, category: 'Streaming', status: 'available' },
    // Canva
    { id: 'cv-1', name: 'Canva', variant: 'Canva Pro 1 Bulan', stock: 10, price: 4000, category: 'Design', status: 'available' },
    { id: 'cv-2', name: 'Canva', variant: 'Canva Pro 3 Bulan', stock: 7, price: 10000, category: 'Design', status: 'available' },
    { id: 'cv-3', name: 'Canva', variant: 'Canva Pro 6 Bulan', stock: 5, price: 18000, category: 'Design', status: 'available' },
    { id: 'cv-4', name: 'Canva', variant: 'Canva Pro 12 Bulan', stock: 3, price: 30000, category: 'Design', status: 'available' },
    { id: 'cv-5', name: 'Canva', variant: 'Canva Teams 1 Bulan', stock: 8, price: 6000, category: 'Design', status: 'available' },
    { id: 'cv-6', name: 'Canva', variant: 'Canva Teams 3 Bulan', stock: 4, price: 15000, category: 'Design', status: 'available' },
    // CapCut
    { id: 'cc-1', name: 'CapCut', variant: 'CapCut Pro 1 Bulan', stock: 9, price: 8000, category: 'Editing', status: 'available' },
    { id: 'cc-2', name: 'CapCut', variant: 'CapCut Pro 3 Bulan', stock: 6, price: 20000, category: 'Editing', status: 'available' },
    { id: 'cc-3', name: 'CapCut', variant: 'CapCut Pro 12 Bulan', stock: 2, price: 70000, category: 'Editing', status: 'available' },
  ];

  const [productsList, setProductsList] = useState<PremiumProduct[]>(SAMPLE_PREMIUM_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('Semua');

  const fetchXavieraProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/xaviera/products');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const rawItems = Array.isArray(json.data)
            ? json.data
            : json.data.products || json.data.items || json.data.data || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const mapped: PremiumProduct[] = [];

            for (const item of rawItems) {
              const productName = item.name || item.title || item.product_name || 'Produk';
              const productCategory = item.category || item.kategori || 'Premium';

              // Jika produk memiliki daftar sub-varian di item.variants
              if (Array.isArray(item.variants) && item.variants.length > 0) {
                for (const variant of item.variants) {
                  const stockNum = variant.stock !== undefined ? variant.stock : variant.stok !== undefined ? variant.stok : 0;
                  const priceNum = Number(variant.price || variant.harga || 0);

                  mapped.push({
                    id: variant.id || `${item.id}-${variant.name}`,
                    name: productName,
                    variant: variant.name || variant.title || variant.package || `${productName} Varian`,
                    stock: stockNum,
                    price: priceNum,
                    category: productCategory,
                    status: Number(stockNum) > 0 ? 'available' : 'empty',
                  });
                }
              } else {
                // Jika produk tunggal tanpa sub-varian
                const stockNum = item.stock !== undefined ? item.stock : item.stok !== undefined ? item.stok : 0;
                const priceNum = Number(item.price || item.harga || 0);

                mapped.push({
                  id: item.id || `prod-${mapped.length}`,
                  name: productName,
                  variant: item.variant || item.desc?.slice(0, 30) || `${productName} Reguler`,
                  stock: stockNum,
                  price: priceNum,
                  category: productCategory,
                  status: Number(stockNum) > 0 ? 'available' : 'empty',
                });
              }
            }

            if (mapped.length > 0) {
              setProductsList(mapped);
              return;
            }
          }
        }
      }
    } catch {
      // Pertahankan sample produk berkualitas
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (xavieraApiKey) {
      fetchXavieraProducts();
    }
  }, [xavieraApiKey, xavieraBaseUrl]);

  // Polling status secara real-time
  useEffect(() => {
    let hasLoadedInitialConfig = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/bot/status');
        if (res.ok) {
          const data: any = await res.json();
          setBotData(data);
          if (data.customCode && customCode === 'WANZTSTR') {
            setCustomCode(data.customCode);
          }

          // Inisialisasi teks command, tombol, & gambar dari server jika pertama kali load
          if (!hasLoadedInitialConfig && data.config) {
            hasLoadedInitialConfig = true;
            if (data.config.menuOutputText) setMenuOutputText(data.config.menuOutputText);
            if (data.config.menuButtons) setMenuButtons(data.config.menuButtons);
            if (data.config.listOutputText) setListOutputText(data.config.listOutputText);
            if (data.config.includeMedia !== undefined) setIncludeMedia(data.config.includeMedia);
            if (data.config.selectedPicture) setSelectedPicture(data.config.selectedPicture);
            if (data.config.xavieraApiKey !== undefined) setXavieraApiKey(data.config.xavieraApiKey);
            if (data.config.xavieraBaseUrl) setXavieraBaseUrl(data.config.xavieraBaseUrl);
          }
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [customCode]);

  // Simpan otomatis perubahan Menu/List/Gambar/API ke server backend bot
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const syncConfigToServer = async (
    newMenuText: string = menuOutputText,
    newButtons: WhatsAppButton[] = menuButtons,
    newListText: string = listOutputText,
    newIncludeMedia: boolean = includeMedia,
    newSelectedPicture: string = selectedPicture,
    newApiKey: string = xavieraApiKey,
    newBaseUrl: string = xavieraBaseUrl
  ) => {
    setIsSavingConfig(true);
    try {
      await fetch('/api/bot/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuOutputText: newMenuText,
          menuButtons: newButtons,
          listOutputText: newListText,
          includeMedia: newIncludeMedia,
          selectedPicture: newSelectedPicture,
          xavieraApiKey: newApiKey,
          xavieraBaseUrl: newBaseUrl,
        }),
      });
    } catch (e) {
      console.error('Gagal menyimpan config ke server', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('62') ? cleanPhone : cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : '62' + cleanPhone;

    if (fullPhone.length < 10) {
      showToast('Nomor WhatsApp tidak valid (minimal 10 digit).');
      return;
    }

    const code = customCode.trim().toUpperCase();
    if (code.length !== 8) {
      showToast('Custom pairing code wajib tepat 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          customCode: code,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Memulai permintaan pairing code...');
      } else {
        showToast(data.error || 'Gagal memulai penautan');
      }
    } catch (err: any) {
      showToast('Koneksi ke backend gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch('/api/bot/stop', { method: 'POST' });
      showToast('Koneksi bot dimatikan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Hapus seluruh folder sesi penautan? Anda perlu menautkan ulang WhatsApp.')) return;
    setLoading(true);
    try {
      await fetch('/api/bot/reset', { method: 'POST' });
      showToast('Sesi lama berhasil dibersihkan.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    const code = botData.pairingCode || customCode || 'WANZTSTR';
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast(`Kode ${code} berhasil disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAddButtonModal = () => {
    setEditingButtonId(null);
    setModalBtnType('quick_reply');
    setModalBtnName('');
    setQuickReplyOutput('');
    setQuickReplyAction('unknown');
    setUrlOutput('https://');
    setCopyOutput('');
    setReminderOutput('');
    setCancelReminderOutput('');
    setCallTarget('');
    setCallPhone('');
    setIsAddButtonModalOpen(true);
  };

  const handleEditButton = (btn: WhatsAppButton) => {
    setEditingButtonId(btn.id);
    setModalBtnType(btn.type);
    setModalBtnName(btn.name);

    // Reset default values
    setQuickReplyOutput('');
    setQuickReplyAction(btn.triggerAction || 'unknown');
    setUrlOutput('https://');
    setCopyOutput('');
    setReminderOutput('');
    setCancelReminderOutput('');
    setCallTarget('');
    setCallPhone('');

    if (btn.type === 'quick_reply') {
      setQuickReplyOutput(btn.output);
    } else if (btn.type === 'cta_url') {
      setUrlOutput(btn.output.startsWith('https://') ? btn.output : `https://${btn.output}`);
    } else if (btn.type === 'cta_copy') {
      setCopyOutput(btn.output);
    } else if (btn.type === 'cta_call') {
      if (btn.callTargetName) setCallTarget(btn.callTargetName);
      if (btn.callPhoneNumber) setCallPhone(btn.callPhoneNumber);
      if (!btn.callTargetName && !btn.callPhoneNumber && btn.output.includes('(')) {
        const match = btn.output.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          setCallTarget(match[1].trim());
          setCallPhone(match[2].trim());
        } else {
          setCallTarget('Admin');
          setCallPhone(btn.output.replace(/[^0-9+]/g, ''));
        }
      }
    } else if (btn.type === 'cta_reminder') {
      setReminderOutput(btn.output);
    } else if (btn.type === 'cta_cancel_reminder') {
      setCancelReminderOutput(btn.output);
    }

    setIsAddButtonModalOpen(true);
  };

  const handleSaveButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBtnName.trim()) {
      showToast('Nama tombol wajib diisi.');
      return;
    }

    let finalOutput = '';

    if (modalBtnType === 'quick_reply') {
      if (!quickReplyOutput.trim()) {
        showToast('Output respon balasan wajib diisi.');
        return;
      }
      finalOutput = quickReplyOutput.trim();
    } else if (modalBtnType === 'cta_url') {
      const cleanUrl = urlOutput.trim();
      if (!cleanUrl.startsWith('https://') || cleanUrl === 'https://') {
        showToast('Output cta_url wajib diisi dengan URL valid yang diawali https://');
        return;
      }
      finalOutput = cleanUrl;
    } else if (modalBtnType === 'cta_copy') {
      if (!copyOutput.trim()) {
        showToast('Teks yang akan disalin wajib diisi.');
        return;
      }
      finalOutput = copyOutput.trim();
    } else if (modalBtnType === 'cta_call') {
      if (!callTarget.trim()) {
        showToast('Nama target panggilan wajib diisi (misal: Owner atau Admin).');
        return;
      }
      const cleanPhone = callPhone.replace(/[^0-9+]/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        showToast('Nomor telepon tujuan tidak valid.');
        return;
      }
      finalOutput = `${callTarget.trim()} (${cleanPhone})`;
    } else if (modalBtnType === 'cta_reminder') {
      if (!reminderOutput.trim()) {
        showToast('Judul atau ID pengingat wajib diisi.');
        return;
      }
      finalOutput = reminderOutput.trim();
    } else if (modalBtnType === 'cta_cancel_reminder') {
      if (!cancelReminderOutput.trim()) {
        showToast('ID pengingat yang dibatalkan wajib diisi.');
        return;
      }
      finalOutput = cancelReminderOutput.trim();
    }

    if (editingButtonId) {
      const updatedButtons = menuButtons.map((btn) => {
        if (btn.id === editingButtonId) {
          return {
            ...btn,
            type: modalBtnType,
            name: modalBtnName.trim(),
            output: finalOutput,
            triggerAction: modalBtnType === 'quick_reply' ? quickReplyAction : undefined,
            callTargetName: modalBtnType === 'cta_call' ? callTarget.trim() : undefined,
            callPhoneNumber: modalBtnType === 'cta_call' ? callPhone.trim() : undefined,
          };
        }
        return btn;
      });

      setMenuButtons(updatedButtons);
      syncConfigToServer(menuOutputText, updatedButtons, listOutputText);
      setIsAddButtonModalOpen(false);
      setEditingButtonId(null);
      showToast(`Tombol "${modalBtnName.trim()}" berhasil diperbarui & disimpan!`);
    } else {
      const newBtn: WhatsAppButton = {
        id: 'btn-' + Date.now(),
        type: modalBtnType,
        name: modalBtnName.trim(),
        output: finalOutput,
        triggerAction: modalBtnType === 'quick_reply' ? quickReplyAction : undefined,
        callTargetName: modalBtnType === 'cta_call' ? callTarget.trim() : undefined,
        callPhoneNumber: modalBtnType === 'cta_call' ? callPhone.trim() : undefined,
      };

      const updatedButtons = [...menuButtons, newBtn];
      setMenuButtons(updatedButtons);
      syncConfigToServer(menuOutputText, updatedButtons, listOutputText);
      setIsAddButtonModalOpen(false);
      showToast(`Tombol "${newBtn.name}" berhasil ditambahkan & disimpan!`);
    }
  };

  const handleDeleteButton = (id: string) => {
    const updatedButtons = menuButtons.filter((b) => b.id !== id);
    setMenuButtons(updatedButtons);
    syncConfigToServer(menuOutputText, updatedButtons, listOutputText);
    showToast('Tombol berhasil dihapus & disimpan.');
  };

  const getStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            CONNECTED
          </span>
        );
      case 'code_ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
            PAIRING READY
          </span>
        );
      case 'waiting_code':
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            CONNECTING...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            DISCONNECTED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500/20 antialiased flex flex-col">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs font-bold text-sm tracking-wider">
              WS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">wanztstore.web.id</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Bot Console
                </span>
              </div>
              <p className="text-xs text-slate-500">WhatsApp Bot Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge()}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Profil Toko & Informasi Saldo Xaviera - Sesuai DESIGN (2).md (Clean, High-Utility, Light Surface, 1px Slate-200 Border) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Sisi Kiri: Identitas Toko & Informasi Profil */}
            <div className="flex items-start sm:items-center gap-4">
              {/* Avatar Toko: Slate surface dengan border tipis & aksen sky */}
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Store className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Xaviera Developer API
                  </span>
                  {xavieraProfile.configured && (
                    <span className="text-xs text-slate-500 font-mono">
                      @{xavieraProfile.data?.username || 'wanztstore'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {xavieraProfile.data?.storeName || (xavieraProfile.configured ? 'Wanzt Store' : 'Wanzt Store Official')}
                  </h1>
                  <BadgeCheck className="w-4 h-4 text-sky-600 shrink-0" />
                </div>

                <p className="text-xs text-slate-500">
                  {xavieraProfile.configured
                    ? 'Terhubung dengan endpoint katalog, SMM, dan transaksi bot otomatis.'
                    : 'Koneksi akun toko Xaviera Store untuk katalog produk, SMM, & transaksi otomatis.'}
                </p>
              </div>
            </div>

            {/* Sisi Kanan: Metrik Saldo & Status Akun */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              {/* Kotak Metrik Saldo: Sesuai Panduan Card Metric DESIGN (2).md (24px-28px Numeric Tabular / Monospace) */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 min-w-[200px]">
                <div className="flex items-center justify-between gap-3 text-slate-500 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    Saldo Xaviera
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchXavieraProfile();
                      showToast('Menyinkronkan saldo Xaviera Store...');
                    }}
                    disabled={xavieraProfile.loading}
                    className="text-slate-400 hover:text-sky-600 transition cursor-pointer p-0.5 rounded"
                    title="Perbarui Saldo"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${xavieraProfile.loading ? 'animate-spin text-sky-600' : ''}`} />
                  </button>
                </div>

                <div className="font-mono font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
                  {xavieraProfile.loading ? (
                    <span className="text-xs text-slate-400 font-normal">Memuat saldo...</span>
                  ) : xavieraProfile.data?.balance !== undefined ? (
                    typeof xavieraProfile.data.balance === 'number'
                      ? `Rp ${Number(xavieraProfile.data.balance).toLocaleString('id-ID')}`
                      : `Rp ${xavieraProfile.data.balance}`
                  ) : (
                    'Rp 0'
                  )}
                </div>
              </div>

              {/* Status Akun & Role Badge (Pojok Kanan) */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex flex-col justify-between min-w-[150px]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Status Akun
                </div>
                <div className="flex items-center justify-between gap-2">
                  {xavieraProfile.configured && !xavieraProfile.error ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      {xavieraProfile.data?.status || 'Aktif'}
                    </span>
                  ) : xavieraProfile.error ? (
                    <span
                      onClick={() => setSelectedTab('Connection')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100/70 transition"
                      title={xavieraProfile.error}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Cek API Key
                    </span>
                  ) : (
                    <span
                      onClick={() => setSelectedTab('Connection')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200/70 transition"
                      title="Atur API Key di tab Connection"
                    >
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Belum Diisi
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                    {xavieraProfile.data?.role || 'Developer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: WhatsApp Connection Panel & Kode Display (5 Kolom) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Kartu Form Koneksi */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  <h2 className="font-semibold text-sm text-slate-900">WhatsApp Connection</h2>
                </div>
                {botData.hasSession && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sesi Tersimpan
                  </span>
                )}
              </div>

              <form onSubmit={handleStartPairing} className="space-y-4">
                {/* Input Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nomor WhatsApp Target
                  </label>
                  <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-3 py-2.5 flex items-center gap-1 border-r border-slate-200 text-slate-700 text-xs font-mono font-semibold select-none">
                      <span>🇮🇩</span>
                      <span>+62</span>
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="857xxxxxxxx"
                      disabled={loading || botData.status === 'connected'}
                      className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Masukkan nomor tanpa angka 0 di depan (contoh: 85712439395).
                  </p>
                </div>

                {/* Input Custom Pairing Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Custom Pairing Code (8 Karakter)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={8}
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      placeholder="WANZTSTR"
                      disabled={loading || botData.status === 'connected'}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-sky-800 tracking-widest focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 uppercase transition shadow-2xs"
                    />
                    <span className="text-xs px-2.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-mono font-medium shrink-0">
                      8 Chars
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Kode alfanumerik tepat 8 karakter untuk dimasukkan di WhatsApp ponsel.
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading || botData.status === 'connecting' || botData.status === 'connected'}
                    className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    {botData.status === 'connected' ? 'WhatsApp Bot Telah Terhubung' : 'Minta Kode Pairing (WANZTSTR)'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStop}
                      disabled={loading || botData.status === 'idle'}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-300 text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Square className="w-3.5 h-3.5 fill-current text-slate-500" />
                      Putuskan
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={loading}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 active:scale-[0.99] border border-slate-300 text-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Sesi
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Display Box Kode Pairing */}
            {(botData.pairingCode || botData.status === 'code_ready' || botData.status === 'waiting_code') && (
              <div className="bg-white border-2 border-sky-600/30 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
                    <KeyRound className="w-4 h-4 text-sky-600" />
                    Kode Pairing Tersedia
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Status: {botData.status}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center space-y-3">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Ketik kode ini di aplikasi WhatsApp ponsel Anda:
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-widest text-slate-900 select-all py-1">
                    {botData.pairingCode || customCode || 'WANZTSTR'}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Tersalin ke Clipboard!' : 'Salin Kode Pairing'}
                  </button>
                </div>

                {/* Panduan 4 Langkah di HP */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Panduan Memasukkan Kode di WhatsApp HP:
                  </div>
                  <ol className="space-y-1.5 list-decimal list-inside leading-relaxed text-slate-600">
                    <li>Buka aplikasi WhatsApp di smartphone Anda.</li>
                    <li>
                      Buka menu <strong className="text-slate-800 font-medium">Titik 3</strong> (Android) atau <strong className="text-slate-800 font-medium">Pengaturan</strong> (iOS).
                    </li>
                    <li>
                      Pilih <strong className="text-sky-700 font-semibold">Perangkat Tertaut</strong> &gt; <strong className="text-slate-800 font-medium">Tautkan Perangkat</strong>.
                    </li>
                    <li>
                      Ketuk tautan teks di bawah scanner:{' '}
                      <strong className="text-sky-700 font-semibold">&quot;Tautkan dengan nomor telepon saja&quot;</strong>.
                    </li>
                    <li>
                      Ketikkan 8 karakter kode:{' '}
                      <strong className="font-mono text-slate-900 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                        {botData.pairingCode || customCode || 'WANZTSTR'}
                      </strong>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Info Bot Ketika Connected */}
            {botData.status === 'connected' && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bot WhatsApp Aktif &amp; Terhubung
                </div>
                <p className="text-slate-600">
                  Nomor Bot: <span className="font-mono font-semibold text-slate-900">+{botData.phoneNumber}</span>
                </p>
                <p className="text-slate-600">
                  ID JID: <span className="font-mono text-[11px] text-slate-700">{botData.user?.id || 'Connected'}</span>
                </p>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Live Socket Console (7 Kolom) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[520px]">
              {/* Terminal Header */}
              <div className="bg-slate-900 text-slate-200 px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <span className="text-xs font-mono text-slate-300 ml-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" /> Live Socket Stream
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Port: 3000 • WebSocket Active
                </div>
              </div>

              {/* Terminal Output */}
              <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-2 selection:bg-slate-800">
                {botData.logs.length === 0 ? (
                  <div className="text-slate-500 italic py-20 text-center space-y-2">
                    <Terminal className="w-8 h-8 mx-auto text-slate-700" />
                    <div>Belum ada log soket aktif.</div>
                    <div className="text-[11px] text-slate-600">
                      Masukkan nomor target di sebelah kiri lalu klik &quot;Minta Kode Pairing&quot;.
                    </div>
                  </div>
                ) : (
                  botData.logs.map((log) => {
                    let colorClass = 'text-slate-300';
                    if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
                    if (log.type === 'code') colorClass = 'text-sky-300 font-bold bg-sky-950/60 p-1 rounded border border-sky-800/50';
                    if (log.type === 'warning') colorClass = 'text-amber-400';
                    if (log.type === 'error') colorClass = 'text-rose-400 font-semibold';

                    return (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                        <span className={`${colorClass} break-all`}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Terminal Footer */}
              <div className="bg-slate-900/90 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                <span>Mesin: <code className="text-slate-300 font-mono">@itsliaaa/baileys</code> (Carousel & Native Flow)</span>
                <span className="flex items-center gap-1.5 text-sky-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  Ready to link
                </span>
              </div>
            </div>

            {/* Note & Info Tambahan */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <span className="font-semibold text-slate-700 block">Catatan Teknis Penautan:</span>
              <p>
                Ketika Anda mengetikkan kode <strong className="text-slate-800 font-mono">WANZTSTR</strong> di WhatsApp HP, WhatsApp akan merespon dengan status <code className="font-mono text-slate-700">restartRequired (515)</code>. Sistem ini secara otomatis akan menangkap respon tersebut dan merestart sesi ke status <strong className="text-emerald-600 font-semibold">CONNECTED</strong> tanpa perlu memasukkan kode lagi.
              </p>
            </div>

            {/* Tab Container: Command & Dummy Tabs tab01 - tab06 */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              {/* Tab Navigation Bar */}
              <div className="border-b border-slate-200 bg-slate-50/70 px-2 sm:px-4 flex items-center gap-1 overflow-x-auto scrollbar-none">
                {['Command', 'Produk', 'tab02', 'tab03', 'tab04', 'tab05', 'Connection'].map((tabName) => {
                  const isActive = selectedTab === tabName;
                  return (
                    <button
                      key={tabName}
                      type="button"
                      onClick={() => setSelectedTab(tabName)}
                      className={`px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                        isActive
                          ? 'border-sky-600 text-sky-700 font-semibold bg-white -mb-px'
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                      }`}
                    >
                      {tabName}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="p-4 sm:p-5">
                {selectedTab === 'Command' ? (
                  <div className="space-y-5">
                    {/* Header & Dropdown Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Pilih Command
                        </label>
                        <div className="relative inline-block w-48">
                          <select
                            value={selectedCommand}
                            onChange={(e) => setSelectedCommand(e.target.value as 'Menu' | 'List')}
                            className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
                          >
                            <option value="Menu">Menu</option>
                            <option value="List">List</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                          Command Aktif: {selectedCommand}
                        </span>
                      </div>
                    </div>

                    {/* Jika Command "Menu" Dipilih */}
                    {selectedCommand === 'Menu' && (
                      <div className="space-y-4">
                        {/* Kolom Teks Output Command Menu */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                              <span>Teks Output Command Menu</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Prefix: / . ! ? # $ % &
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                syncConfigToServer(menuOutputText, menuButtons, listOutputText);
                                showToast('Teks respon command Menu berhasil disimpan!');
                              }}
                              className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Simpan Teks
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={menuOutputText}
                            onChange={(e) => setMenuOutputText(e.target.value)}
                            onBlur={() => syncConfigToServer(menuOutputText, menuButtons, listOutputText)}
                            placeholder="Ketikkan teks pesan yang akan keluar saat command Menu dipanggil..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs leading-relaxed"
                          />
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span>Format teks mendukung *tebal*, _miring_, atau baris baru.</span>
                            <span className="text-[11px] text-slate-400">Pemicu: tombol Quick Reply tidak butuh prefix</span>
                          </div>
                        </div>

                        {/* Sertakan Media (Opsional) & Dropdown Pilihan Foto dari ./src/media/picture */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={includeMedia}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setIncludeMedia(val);
                                  syncConfigToServer(menuOutputText, menuButtons, listOutputText, val, selectedPicture);
                                }}
                                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                              />
                              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                                Sertakan media (opsional)
                              </span>
                            </label>
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Folder: ./src/media/picture
                            </span>
                          </div>

                          {includeMedia && (
                            <div className="space-y-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Pilih Foto dari `./src/media/picture`
                                </label>
                                {availablePictures.length === 0 ? (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                    Belum ada foto di dalam folder <code>./src/media/picture</code>. Silakan letakkan foto (JPG/PNG) secara manual ke folder tersebut.
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={selectedPicture}
                                      onChange={(e) => {
                                        const pic = e.target.value;
                                        setSelectedPicture(pic);
                                        syncConfigToServer(menuOutputText, menuButtons, listOutputText, includeMedia, pic);
                                      }}
                                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 shadow-2xs"
                                    >
                                      {availablePictures.map((picName) => (
                                        <option key={picName} value={picName}>
                                          {picName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              {selectedPicture && (
                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                  <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                                    <img
                                      src={`/api/media/view?name=${encodeURIComponent(selectedPicture)}`}
                                      alt="Selected Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="text-xs space-y-0.5">
                                    <p className="font-semibold text-slate-800 font-mono">{selectedPicture}</p>
                                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Foto terpilih akan dikirim bersama pesan menu.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tombol Add Button & List Tombol Terpasang */}
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-sky-600" />
                              Tombol Interaktif WhatsApp ({menuButtons.length})
                            </label>

                            <button
                              type="button"
                              onClick={handleOpenAddButtonModal}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Button
                            </button>
                          </div>

                          {/* List of Added Buttons */}
                          {menuButtons.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-400 space-y-1">
                              <div>Belum ada tombol interaktif yang ditambahkan.</div>
                              <div className="text-[11px] text-slate-500">Klik tombol &quot;Add Button&quot; di atas untuk membuat tombol baru.</div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {menuButtons.map((btn, index) => {
                                let badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                                let badgeLabel = 'Quick Reply';
                                if (btn.type === 'cta_url') {
                                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                  badgeLabel = 'CTA URL';
                                } else if (btn.type === 'cta_copy') {
                                  badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                                  badgeLabel = 'CTA Copy';
                                } else if (btn.type === 'cta_call') {
                                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                                  badgeLabel = 'CTA Call';
                                } else if (btn.type === 'cta_reminder') {
                                  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                                  badgeLabel = 'CTA Reminder';
                                } else if (btn.type === 'cta_cancel_reminder') {
                                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                                  badgeLabel = 'Cancel Reminder';
                                }

                                return (
                                  <div
                                    key={btn.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs gap-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                                        {index + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-xs text-slate-900 truncate">
                                            {btn.name}
                                          </span>
                                          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${badgeColor}`}>
                                            {badgeLabel}
                                          </span>
                                          {btn.type === 'quick_reply' && (
                                            <span
                                              className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${
                                                btn.triggerAction === 'list'
                                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}
                                            >
                                              {btn.triggerAction === 'list' ? '⚡ Command: List' : '⚪ Unknown'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                                          Output: <span className="text-slate-700 font-medium">{btn.output}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleEditButton(btn)}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                                        title="Edit tombol"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteButton(btn.id)}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Hapus tombol"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Jika Command "List" Dipilih */}
                    {selectedCommand === 'List' && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Teks Output Command List
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const placeholder = '{daftarProduk}';
                                if (!listOutputText.includes(placeholder)) {
                                  const updated = listOutputText ? `${listOutputText.trim()}\n\n${placeholder}` : placeholder;
                                  setListOutputText(updated);
                                  syncConfigToServer(menuOutputText, menuButtons, updated);
                                  showToast('Placeholder {daftarProduk} berhasil disisipkan!');
                                } else {
                                  showToast('Placeholder {daftarProduk} sudah ada di dalam teks.');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition cursor-pointer"
                              title="Klik untuk menyisipkan placeholder otomatis"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              + Sisipkan {'{daftarProduk}'}
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={listOutputText}
                            onChange={(e) => setListOutputText(e.target.value)}
                            placeholder="Silakan pilih produk yang tersedia:\n\n{daftarProduk}\n\nKetik nama produk untuk memesan."
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs leading-relaxed font-sans"
                          />
                        </div>

                        {/* Petunjuk & Dokumentasi Placeholder {daftarProduk} */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-sky-600" />
                              Placeholder Otomatis: <code className="text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded font-mono font-bold text-xs">{'{daftarProduk}'}</code>
                            </span>
                            <span className="text-[10px] uppercase font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Auto-Grouped
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Saat pesan command <strong>List</strong> dikirim ke pelanggan, tag <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">{'{daftarProduk}'}</code> akan otomatis diubah menjadi daftar nama produk (bukan varian) bernomor urut berlanjut dan dikelompokkan rapi per kategori:
                          </p>
                          <div className="bg-white rounded-lg border border-slate-200 p-3 font-mono text-[11px] text-slate-700 leading-relaxed shadow-2xs">
                            <div className="text-slate-900 font-bold">*Streaming:*</div>
                            <div className="text-slate-600">• 1. YouTube</div>
                            <div className="text-slate-600">• 2. Netflix</div>
                            <div className="text-slate-600">• 3. Spotify</div>
                            <div className="text-slate-600">• 4. Viu</div>
                            <div className="text-slate-600">...</div>
                            <div className="text-slate-900 font-bold mt-2">*Editing:*</div>
                            <div className="text-slate-600">• 12. Canva Premium</div>
                            <div className="text-slate-600">• 13. CapCut Pro</div>
                            <div className="text-slate-600">• 14. Alight Motion</div>
                            <div className="text-slate-600">...</div>
                            <div className="text-slate-900 font-bold mt-2">*Lainnya:*</div>
                            <div className="text-slate-600">• 25. Grammarly</div>
                            <div className="text-slate-600">• 26. Scribd</div>
                          </div>
                        </div>

                        {/* Fitur Carousel Varian Produk (@itsliaaa/baileys) */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-sky-600" />
                              Pesan Carousel Varian Produk (<code className="text-sky-700 font-mono text-[11px]">@itsliaaa/baileys</code>)
                            </span>
                            <span className="text-[10px] uppercase font-mono font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              Active Engine
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Ketika pelanggan memilih produk dari menu dropdown Single-Select (atau mengetik nama produk), bot secara otomatis merespon dengan pesan interaktif berjenis <strong>Carousel Cards</strong> yang menampilkan seluruh varian produk bersangkutan:
                          </p>

                          {/* Mockup Card Carousel Sesuai Desain & Format Permintaan Pengguna */}
                          <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                            <div className="bg-slate-900 text-white p-3 flex items-center justify-between text-xs">
                              <span className="font-semibold flex items-center gap-1.5 text-sky-400">
                                🗂️ Carousel Card • Varian 1
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">1/6 Kartu</span>
                            </div>

                            {/* Card Media Header */}
                            <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center p-3 text-center border-b border-slate-200">
                              <div className="space-y-1">
                                <div className="inline-block px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                                  WANZT STORE • STREAMING
                                </div>
                                <div className="text-white font-bold text-sm tracking-tight">YouTube Premium Family</div>
                                <div className="text-[10px] text-slate-300">Garansi Penuh • Proses Instan</div>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3 text-xs text-slate-800 leading-relaxed font-sans bg-emerald-50/20">
                              <div className="font-bold text-slate-900 text-sm">*YouTube | Streaming*</div>
                              <p className="text-slate-600">
                                Nikmati hiburan favoritmu dengan pilihan paket YouTube yang tersedia di Wanzt Store.
                              </p>

                              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs font-mono text-[11px]">
                                <div className="font-bold text-slate-900">📦 *Detail Produk*</div>
                                <div className="text-slate-700">▪️ Varian: <span className="font-bold text-slate-900">YouTube Famplan 1 Bulan</span></div>
                                <div className="text-slate-700">💰 Harga: <span className="font-bold text-emerald-700">Rp3.500</span></div>
                                <div className="text-slate-700">📊 Stok: <span className="font-bold text-sky-700">14 tersedia</span></div>
                              </div>

                              <p className="text-slate-500 text-[11px]">
                                Paket tersedia selama stok masih ada. Pastikan kamu memilih varian yang sesuai sebelum melanjutkan pesanan.
                              </p>

                              <div className="text-[11px] font-medium text-slate-700">
                                Silakan pilih tindakan di bawah ini untuk melanjutkan.
                              </div>

                              {/* Action Buttons */}
                              <div className="space-y-1.5 pt-1">
                                <div className="w-full py-2 px-3 rounded-lg bg-sky-600 text-white font-semibold text-center text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                                  <span>📋</span> Order
                                </div>
                                <div className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-center text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50">
                                  <span>📞</span> Contact Admin (083861276608)
                                </div>
                              </div>

                              <div className="text-[10px] text-slate-400 text-center font-mono pt-1 border-t border-slate-100">
                                Mengetuk "Contact Admin" otomatis mengirim kontak vCard resmi Admin Wanzt Store
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedTab === 'Produk' || selectedTab === 'tab01' ? (
                  <div className="space-y-5">
                    {/* Header Tab Produk */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-sky-600" />
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Katalog Aplikasi & Akun Premium
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Daftar akun premium aktif, varian paket, ketersediaan stok, dan tarif harga Xaviera Store.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            fetchXavieraProducts();
                            showToast('Menyinkronkan data katalog produk...');
                          }}
                          disabled={loadingProducts}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
                          <span>Sinkronkan Produk</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Kategori & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Search Bar Input */}
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Cari aplikasi atau varian (contoh: Netflix, Spotify)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                        />
                        {productSearch && (
                          <button
                            type="button"
                            onClick={() => setProductSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Filter Kategori Tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        {['Semua', 'Streaming', 'Music', 'Design', 'Editing', 'AI Tool'].map((cat) => {
                          const isActive = selectedProductCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedProductCategory(cat)}
                              className={`px-2.5 py-1.5 text-xs rounded-md transition cursor-pointer whitespace-nowrap font-medium ${
                                isActive
                                  ? 'bg-sky-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tabel Produk Premium Sesuai DESIGN (2).md (Clean Slate Border, Monospace Values, High Contrast) */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-5 w-40">Nama</th>
                              <th className="py-3 px-4">Varian</th>
                              <th className="py-3 px-4 text-center w-24">Stok</th>
                              <th className="py-3 px-4 text-right w-32">Harga Asli</th>
                              <th className="py-3 px-5 text-right w-44">Harga Jual (+10%)</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            {(() => {
                              const filtered = productsList.filter((prod) => {
                                const matchesSearch =
                                  prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                  prod.variant.toLowerCase().includes(productSearch.toLowerCase());
                                const matchesCategory =
                                  selectedProductCategory === 'Semua' || prod.category === selectedProductCategory;
                                return matchesSearch && matchesCategory;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500 space-y-1">
                                      <Package className="w-8 h-8 mx-auto text-slate-400" />
                                      <div className="font-medium text-slate-700">Tidak ada produk ditemukan</div>
                                      <div className="text-[11px] text-slate-400">
                                        Coba ubah kata kunci pencarian atau ganti filter kategori.
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((prod, index) => {
                                const prevProd = index > 0 ? filtered[index - 1] : null;
                                const isNewGroup = !prevProd || prevProd.name !== prod.name;
                                const isOutOfStock = Number(prod.stock) <= 0;

                                // Perhitungan Harga Jual: Harga Asli + 10%
                                const originalPrice = Number(prod.price) || 0;
                                const margin = Math.round(originalPrice * 0.1);
                                const sellingPrice = originalPrice + margin;

                                return (
                                  <tr
                                    key={prod.id}
                                    className={`transition-colors hover:bg-sky-50/30 ${
                                      isNewGroup
                                        ? index === 0
                                          ? 'bg-slate-50/50'
                                          : 'border-t-2 border-slate-200 bg-slate-50/50'
                                        : 'border-t border-slate-100 bg-white'
                                    }`}
                                  >
                                    {/* 1. Kolom Nama: Nama tebal beraksen jika baris pertama, tanda hubung '-' halus jika varian lanjutan */}
                                    <td className="py-3 px-5 align-middle whitespace-nowrap">
                                      {isNewGroup ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-white border border-slate-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs font-bold text-[11px]">
                                            <Package className="w-3.5 h-3.5" />
                                          </div>
                                          <span className="font-bold text-slate-900 text-sm tracking-tight">
                                            {prod.name}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center pl-7 text-slate-400 select-none">
                                          <span className="inline-block w-4 h-px bg-slate-300 mr-2"></span>
                                          <span className="font-mono text-slate-400 font-bold">-</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* 2. Kolom Varian */}
                                    <td className="py-3 px-4 align-middle">
                                      <div className="font-medium text-slate-800 text-xs">
                                        {prod.variant}
                                      </div>
                                    </td>

                                    {/* 3. Kolom Stok: Badge bersih & terpusat */}
                                    <td className="py-3 px-4 text-center align-middle">
                                      {isOutOfStock ? (
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                          0
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center justify-center gap-1 font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded text-xs border border-slate-200/60 min-w-[36px]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          <span>{prod.stock}</span>
                                        </span>
                                      )}
                                    </td>

                                    {/* 4. Kolom Harga Asli */}
                                    <td className="py-3 px-4 text-right align-middle">
                                      <span className="font-mono text-xs text-slate-600">
                                        Rp{originalPrice.toLocaleString('id-ID')}
                                      </span>
                                    </td>

                                    {/* 5. Kolom Harga Jual (+10%) & Margin di dalam kurung */}
                                    <td className="py-3 px-5 text-right align-middle whitespace-nowrap">
                                      <div className="inline-flex items-baseline gap-1.5 font-mono">
                                        <span className="font-bold text-sm text-slate-900 tracking-tight">
                                          Rp{sellingPrice.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                          ({margin.toLocaleString('id-ID')})
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Tabel: Ringkasan Total Produk & Info Sinkronisasi */}
                      <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>
                          Menampilkan{' '}
                          <strong className="text-slate-800 font-mono">
                            {
                              productsList.filter((prod) => {
                                const matchesSearch =
                                  prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                  prod.variant.toLowerCase().includes(productSearch.toLowerCase());
                                const matchesCategory =
                                  selectedProductCategory === 'Semua' || prod.category === selectedProductCategory;
                                return matchesSearch && matchesCategory;
                              }).length
                            }
                          </strong>{' '}
                          varian dari <span className="font-mono font-semibold text-slate-700">{productsList.length}</span> total item
                        </span>

                        <span className="text-slate-400 font-mono">
                          Format harga: IDR • Data langsung dari Xaviera Store
                        </span>
                      </div>
                    </div>
                  </div>
                ) : selectedTab === 'Connection' || selectedTab === 'tab06' ? (
                  <div className="space-y-6">
                    {/* Header Tab Connection - Xaviera API */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            Konfigurasi Xaviera Store API
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Atur integrasi Developer API Xaviera untuk katalog produk, SMM, dan transaksi bot otomatis.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSavingConfig ? (
                          <span className="text-[11px] font-mono text-sky-600 bg-sky-50 px-2.5 py-1 rounded border border-sky-200 flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Menyimpan...
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3 h-3" /> Tersimpan Otomatis
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kolom 1: Input API Key */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-sky-600" />
                          API Key Xaviera
                        </span>
                        <span className="text-[11px] font-normal text-slate-400">
                          Bearer Token Autentikasi
                        </span>
                      </label>
                      <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
                        <div className="bg-slate-50 px-3 py-2.5 flex items-center text-slate-400 border-r border-slate-200">
                          <KeyRound className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={xavieraApiKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setXavieraApiKey(val);
                            syncConfigToServer(
                              menuOutputText,
                              menuButtons,
                              listOutputText,
                              includeMedia,
                              selectedPicture,
                              val,
                              xavieraBaseUrl
                            );
                          }}
                          placeholder="Masukkan API Key (contoh: xvs_xxxxxxxxxxxxxxxxxxxxxxxx)"
                          className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-3 text-slate-400 hover:text-slate-600 transition flex items-center justify-center cursor-pointer"
                          title={showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                        >
                          {showApiKey ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                        <span>💡</span>
                        <span>
                          Dapatkan API Key melalui dashboard akun Xaviera Anda di menu <strong>Profil &gt; Developer API &gt; Generate API Key</strong>.
                        </span>
                      </p>
                    </div>

                    {/* Kolom 2: Input Base URL API (Default sesuai dokumentasi) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-sky-600" />
                          Base URL API
                        </label>
                        {xavieraBaseUrl !== 'https://xavierastore.com/api/v1' && (
                          <button
                            type="button"
                            onClick={() => {
                              const defaultUrl = 'https://xavierastore.com/api/v1';
                              setXavieraBaseUrl(defaultUrl);
                              syncConfigToServer(
                                menuOutputText,
                                menuButtons,
                                listOutputText,
                                includeMedia,
                                selectedPicture,
                                xavieraApiKey,
                                defaultUrl
                              );
                              showToast('Base URL dikembalikan ke default dokumentasi!');
                            }}
                            className="text-[11px] text-sky-600 hover:text-sky-700 font-medium hover:underline cursor-pointer"
                          >
                            Reset ke Default
                          </button>
                        )}
                      </div>
                      <div className="relative flex rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white overflow-hidden shadow-2xs">
                        <div className="bg-slate-100 px-3 py-2.5 flex items-center text-slate-600 border-r border-slate-200 text-xs font-mono select-none">
                          URL
                        </div>
                        <input
                          type="text"
                          value={xavieraBaseUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setXavieraBaseUrl(val);
                            syncConfigToServer(
                              menuOutputText,
                              menuButtons,
                              listOutputText,
                              includeMedia,
                              selectedPicture,
                              xavieraApiKey,
                              val
                            );
                          }}
                          placeholder="https://xavierastore.com/api/v1"
                          className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Default resmi sesuai dokumentasi Xaviera Store: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">https://xavierastore.com/api/v1</code>
                      </p>
                    </div>

                    {/* Informasi Endpoint & Dokumentasi */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <FileText className="w-4 h-4 text-sky-600" />
                        Ringkasan Integrasi Endpoint Xaviera Store:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-800 block">👑 Premium Account</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Akses daftar katalog produk premium, pemesanan instan, serta pengecekan status pesanan.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-800 block">🚀 Layanan SMM</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Layanan followers, like, view, dan interaksi medsos otomatis dengan status pesanan real-time.
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-800 block">🎮 Top Up Game</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Daftar game populer, pilihan item/diamond, transaksi voucher, dan cek status top-up.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/80">
                        <span>Format Autentikasi: <code className="font-mono text-slate-700">Authorization: Bearer [API_KEY]</code></span>
                        <span className="text-sky-600 font-medium">Data format: JSON RESTful</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 mx-auto flex items-center justify-center font-mono font-bold text-xs">
                      {selectedTab}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Tab Dummy: {selectedTab}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Slot tab ini telah disiapkan untuk penambahan modul atau fitur berikutnya.
                    </p>
                    <div className="pt-2">
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        Placeholder Ready
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Popup: Add Button */}
      {isAddButtonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                {editingButtonId ? (
                  <Pencil className="w-4 h-4 text-sky-600" />
                ) : (
                  <Plus className="w-4 h-4 text-sky-600" />
                )}
                <h3 className="font-semibold text-sm text-slate-900">
                  {editingButtonId ? 'Edit Tombol WhatsApp' : 'Tambah Tombol WhatsApp'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddButtonModalOpen(false);
                  setEditingButtonId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveButton} className="p-5 space-y-4">
              {/* Field 1: Tipe Tombol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipe Tombol
                </label>
                <div className="relative">
                  <select
                    value={modalBtnType}
                    onChange={(e) => setModalBtnType(e.target.value as WhatsAppButtonType)}
                    className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
                  >
                    <option value="quick_reply">quick_reply (Balas Cepat / Pilihan)</option>
                    <option value="cta_url">cta_url (Buka Tautan Website)</option>
                    <option value="cta_copy">cta_copy (Salin Teks / Rekening)</option>
                    <option value="cta_call">cta_call (Panggil Nomor Telepon)</option>
                    <option value="cta_reminder">cta_reminder (Buat Pengingat WA)</option>
                    <option value="cta_cancel_reminder">cta_cancel_reminder (Batalkan Pengingat WA)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih salah satu dari 6 tipe tombol interaktif yang didukung ourin-baileys.
                </p>
              </div>

              {/* Field 2: Nama Tombol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Tombol (Muncul di WhatsApp)
                </label>
                <input
                  type="text"
                  value={modalBtnName}
                  onChange={(e) => setModalBtnName(e.target.value)}
                  placeholder="Contoh: Buka Website, Katalog Produk, Hubungi Admin"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                />
              </div>

              {/* Field 3: Output Dinamis Berdasarkan Tipe */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                {modalBtnType === 'quick_reply' && (
                  <div className="space-y-3">
                    {/* Dropdown Pemicu Command / Unknown */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>Aksi Pemicu Command (Dropdown)</span>
                        <span className="text-[11px] font-normal text-slate-400">Tentukan respon otomatis</span>
                      </label>
                      <div className="relative">
                        <select
                          value={quickReplyAction}
                          onChange={(e) => {
                            const val = e.target.value as 'list' | 'unknown';
                            setQuickReplyAction(val);
                            if (val === 'list' && !quickReplyOutput) {
                              setQuickReplyOutput('.list');
                            }
                          }}
                          className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
                        >
                          <option value="list">Command: List (Memicu pesan Command List)</option>
                          <option value="unknown">Unknown (Tidak memicu command apapun)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {quickReplyAction === 'list'
                          ? '⚡ Memilih "List" akan langsung memicu pesan Command List ketika tombol ditekan.'
                          : '⚪ Memilih "Unknown" tidak akan memicu command apapun (hanya teks balasan biasa).'}
                      </p>
                    </div>

                    {/* Output Pesan Balasan */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Output Pesan Balasan
                      </label>
                      <input
                        type="text"
                        value={quickReplyOutput}
                        onChange={(e) => setQuickReplyOutput(e.target.value)}
                        placeholder={quickReplyAction === 'list' ? '.list' : 'Contoh: .katalog atau Saya ingin memesan'}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Teks atau command payload yang dikirim saat tombol ditekan oleh pengguna.
                      </p>
                    </div>
                  </div>
                )}

                {modalBtnType === 'cta_url' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Output Tautan URL (Wajib diawali https://)
                    </label>
                    <input
                      type="url"
                      value={urlOutput}
                      onChange={(e) => setUrlOutput(e.target.value)}
                      placeholder="https://wanztstore.web.id"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      URL website yang akan terbuka di browser saat tombol ditekan (harus diawali https://).
                    </p>
                  </div>
                )}

                {modalBtnType === 'cta_copy' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Output Teks yang Disalin
                    </label>
                    <input
                      type="text"
                      value={copyOutput}
                      onChange={(e) => setCopyOutput(e.target.value)}
                      placeholder="Contoh: 085712439395 atau KODE-PROMO-123"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Teks atau angka yang langsung disalin ke clipboard pengguna di HP.
                    </p>
                  </div>
                )}

                {modalBtnType === 'cta_call' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        1. Nama Target (Misal: Owner atau Admin)
                      </label>
                      <input
                        type="text"
                        value={callTarget}
                        onChange={(e) => setCallTarget(e.target.value)}
                        placeholder="Contoh: Admin Toko atau Owner"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        2. Nomor Telepon Tujuan
                      </label>
                      <input
                        type="tel"
                        value={callPhone}
                        onChange={(e) => setCallPhone(e.target.value)}
                        placeholder="Contoh: 6285712439395"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Nomor tujuan panggilan suara (sertakan kode negara, contoh: 628...).
                      </p>
                    </div>
                  </div>
                )}

                {modalBtnType === 'cta_reminder' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Output Judul / ID Pengingat
                    </label>
                    <input
                      type="text"
                      value={reminderOutput}
                      onChange={(e) => setReminderOutput(e.target.value)}
                      placeholder="Contoh: reminder_perpanjang_1 atau Pengingat Perpanjangan Akun"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ID atau judul pengingat yang akan dibuatkan notifikasi di WhatsApp pengguna.
                    </p>
                  </div>
                )}

                {modalBtnType === 'cta_cancel_reminder' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Output ID Pengingat yang Dibatalkan
                    </label>
                    <input
                      type="text"
                      value={cancelReminderOutput}
                      onChange={(e) => setCancelReminderOutput(e.target.value)}
                      placeholder="Contoh: reminder_perpanjang_1"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ID pengingat yang sebelumnya telah dibuat dan ingin dibatalkan.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddButtonModalOpen(false);
                    setEditingButtonId(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {editingButtonId ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Perbarui Tombol
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Tombol
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; wanztstore.web.id • Minimalist Admin Dashboard</span>
          <span className="text-slate-400">Filosofi: Clean Utility &amp; Anti-AI Slop</span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
