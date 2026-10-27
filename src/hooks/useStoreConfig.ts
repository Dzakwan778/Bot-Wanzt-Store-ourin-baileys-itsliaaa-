import { useState, useEffect } from 'react';
import {
  StoreInfoConfig,
  WhatsAppButton,
} from '../types/dashboard.types';

export function useStoreConfig(
  xavieraApiKey: string,
  xavieraBaseUrl: string,
  showToast: (msg: string) => void
) {
  // Store Info State
  const [storeInfo, setStoreInfo] = useState<StoreInfoConfig>({
    storeName: '',
    ownerName: '',
    ownerNumber: '',
    adminName: '',
    adminNumber: '',
    webLink: '',
    telegramBot: '',
    waLink: '',
  });

  // Payment Gateway LunasQRIS States
  const [lunasQrisApiKey, setLunasQrisApiKey] = useState<string>('');
  const [lunasQrisSecretKey, setLunasQrisSecretKey] = useState<string>('');
  const [lunasQrisBaseUrl, setLunasQrisBaseUrl] = useState<string>('https://lunasqris.com');

  // Footer States per Command
  const [menuFooterText, setMenuFooterText] = useState<string>('{webLink} • Otomatis');
  const [listFooterText, setListFooterText] = useState<string>('{webLink} • Pilih Produk');
  const [carouselFooterText, setCarouselFooterText] = useState<string>('{storeName} Official');

  // Command State
  const [selectedCommand, setSelectedCommand] = useState<'Menu' | 'List' | 'Carousel'>('Menu');
  const [carouselOutputText, setCarouselOutputText] = useState<string>(
    `*Wanzt Store*\n\n*{produkName} | {category}*\n\nNikmati produk pilihanmu dengan harga terbaik di Wanzt Store.\n\n*Detail Produk:*\n- Varian: {varian}\n- Harga: {price}\n- Stok: {stock} tersedia\n\nProduk tersedia selama stok masih ada. Silakan pilih tindakan di bawah ini untuk melanjutkan.`
  );
  const [carouselPicture, setCarouselPicture] = useState<string>('snaptik-app-7690985506468908308-slide-2.jpg');
  const [menuOutputText, setMenuOutputText] = useState<string>(
    'Halo kak! Selamat datang di wanztstore.web.id ✨\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:'
  );
  const [menuButtons, setMenuButtons] = useState<WhatsAppButton[]>([]);
  const [listOutputText, setListOutputText] = useState<string>(
    'Silakan pilih kategori produk dari daftar list di bawah ini untuk melihat detail produk:'
  );

  // Media Menu from ./src/media/picture
  const [includeMedia, setIncludeMedia] = useState<boolean>(false);
  const [selectedPicture, setSelectedPicture] = useState<string>('');
  const [availablePictures, setAvailablePictures] = useState<string[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    fetch('/api/media/pictures')
      .then((res) => res.json())
      .then((data) => {
        if (data.pictures) {
          setAvailablePictures(data.pictures);
          if (data.pictures.length > 0 && !selectedPicture) {
            setSelectedPicture(data.pictures[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const loadInitialConfig = (config: any) => {
    if (!config) return;
    if (config.menuOutputText) setMenuOutputText(config.menuOutputText);
    if (config.menuButtons) setMenuButtons(config.menuButtons);
    if (config.listOutputText) setListOutputText(config.listOutputText);
    if (config.includeMedia !== undefined) setIncludeMedia(config.includeMedia);
    if (config.selectedPicture) setSelectedPicture(config.selectedPicture);
    if (config.carouselOutputText) setCarouselOutputText(config.carouselOutputText);
    if (config.carouselPicture) setCarouselPicture(config.carouselPicture);
    if (config.storeInfo) setStoreInfo(config.storeInfo);
    if (config.menuFooterText) setMenuFooterText(config.menuFooterText);
    if (config.listFooterText) setListFooterText(config.listFooterText);
    if (config.carouselFooterText) setCarouselFooterText(config.carouselFooterText);
    if (config.lunasQrisApiKey !== undefined) setLunasQrisApiKey(config.lunasQrisApiKey);
    if (config.lunasQrisSecretKey !== undefined) setLunasQrisSecretKey(config.lunasQrisSecretKey);
    if (config.lunasQrisBaseUrl !== undefined) setLunasQrisBaseUrl(config.lunasQrisBaseUrl);
  };

  const syncConfigToServer = async (
    firstArg?: any,
    newButtons?: WhatsAppButton[],
    newListText?: string,
    newIncludeMedia?: boolean,
    newSelectedPicture?: string,
    newApiKey?: string,
    newBaseUrl?: string,
    newCarouselText?: string,
    newCarouselPicture?: string,
    newStoreInfo?: StoreInfoConfig,
    newMenuFooter?: string,
    newListFooter?: string,
    newCarouselFooter?: string,
    newLunasQrisApiKey?: string,
    newLunasQrisSecretKey?: string,
    newLunasQrisBaseUrl?: string
  ) => {
    setIsSavingConfig(true);
    try {
      let payload: any = {
        storeInfo,
        menuOutputText,
        menuFooterText,
        menuButtons,
        listOutputText,
        listFooterText,
        includeMedia,
        selectedPicture,
        carouselOutputText,
        carouselFooterText,
        carouselPicture,
        xavieraApiKey: newApiKey !== undefined ? newApiKey : xavieraApiKey,
        xavieraBaseUrl: newBaseUrl !== undefined ? newBaseUrl : xavieraBaseUrl,
        lunasQrisApiKey: newLunasQrisApiKey !== undefined ? newLunasQrisApiKey : lunasQrisApiKey,
        lunasQrisSecretKey: newLunasQrisSecretKey !== undefined ? newLunasQrisSecretKey : lunasQrisSecretKey,
        lunasQrisBaseUrl: newLunasQrisBaseUrl !== undefined ? newLunasQrisBaseUrl : lunasQrisBaseUrl,
      };

      if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
        payload = { ...payload, ...firstArg };
      } else {
        if (firstArg !== undefined && typeof firstArg === 'string') payload.menuOutputText = firstArg;
        if (newButtons !== undefined) payload.menuButtons = newButtons;
        if (newListText !== undefined) payload.listOutputText = newListText;
        if (newIncludeMedia !== undefined) payload.includeMedia = newIncludeMedia;
        if (newSelectedPicture !== undefined) payload.selectedPicture = newSelectedPicture;
        if (newApiKey !== undefined) payload.xavieraApiKey = newApiKey;
        if (newBaseUrl !== undefined) payload.xavieraBaseUrl = newBaseUrl;
        if (newCarouselText !== undefined) payload.carouselOutputText = newCarouselText;
        if (newCarouselPicture !== undefined) payload.carouselPicture = newCarouselPicture;
        if (newStoreInfo !== undefined) payload.storeInfo = newStoreInfo;
        if (newMenuFooter !== undefined) payload.menuFooterText = newMenuFooter;
        if (newListFooter !== undefined) payload.listFooterText = newListFooter;
        if (newCarouselFooter !== undefined) payload.carouselFooterText = newCarouselFooter;
        if (newLunasQrisApiKey !== undefined) payload.lunasQrisApiKey = newLunasQrisApiKey;
        if (newLunasQrisSecretKey !== undefined) payload.lunasQrisSecretKey = newLunasQrisSecretKey;
        if (newLunasQrisBaseUrl !== undefined) payload.lunasQrisBaseUrl = newLunasQrisBaseUrl;
      }

      await fetch('/api/bot/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Gagal menyimpan config ke server', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return {
    storeInfo,
    setStoreInfo,
    lunasQrisApiKey,
    setLunasQrisApiKey,
    lunasQrisSecretKey,
    setLunasQrisSecretKey,
    lunasQrisBaseUrl,
    setLunasQrisBaseUrl,
    menuFooterText,
    setMenuFooterText,
    listFooterText,
    setListFooterText,
    carouselFooterText,
    setCarouselFooterText,
    selectedCommand,
    setSelectedCommand,
    carouselOutputText,
    setCarouselOutputText,
    carouselPicture,
    setCarouselPicture,
    menuOutputText,
    setMenuOutputText,
    menuButtons,
    setMenuButtons,
    listOutputText,
    setListOutputText,
    includeMedia,
    setIncludeMedia,
    selectedPicture,
    setSelectedPicture,
    availablePictures,
    setAvailablePictures,
    isSavingConfig,
    loadInitialConfig,
    syncConfigToServer,
  };
}
