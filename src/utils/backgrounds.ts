export interface TempleBackground {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string;
  caption: string;
}

export const TEMPLE_BACKGROUNDS: TempleBackground[] = [
  {
    id: 'temple-chariot',
    title: 'Sacred Temple Chariot (Ratham)',
    subtitle: 'Illuminated Night Procession with Golden Steeds',
    image: '/assets/aistudio/WhatsApp-Image-2025-10-18-at-17.22.17_1889d25a.jpeg',
    tag: 'Ratham Procession',
    caption: 'Sacred illuminated wooden chariot carrying the presiding deity during Thaipooyam festival night.',
  },
  {
    id: 'temple-facade',
    title: 'Golden Kodimaram & Sanctum',
    subtitle: 'Sacred Temple Dwajasthambham & Bell',
    image: '/assets/aistudio/ET20-scaled_09d5031a.webp',
    tag: 'Temple Sanctum',
    caption: 'Majestic view of the golden flag mast (Kodimaram) and the sacred traditional Kerala temple shrine.',
  },
  {
    id: 'nalambalam',
    title: 'Nalambalam Heritage Architecture',
    subtitle: 'Traditional Pitched Tiled Roofs & Stone Courtyard',
    image: '/assets/aistudio/ET16-copy-1-scaled_1174c974.webp',
    tag: 'Temple Heritage',
    caption: 'Historic Kerala temple Nalambalam stone architecture and gopuram courtyard.',
  },
  {
    id: 'kalady-bridge',
    title: 'Historic Kalady Bridge at Night',
    subtitle: 'Adi Sankaracharya Bridge & Elephant Procession',
    image: '/assets/aistudio/Gemini_Generated_Image_te35te35te35te35_b921a4ad.png',
    tag: 'Kalady Bridge',
    caption: 'Cinematic approach across the historic concrete bridge over the Periyar River toward Sri Adi Sankara tower.',
  },
];

const STORAGE_KEY = 'kavadi_sangam_selected_bg';

export const getStoredBackgroundId = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TEMPLE_BACKGROUNDS.some((bg) => bg.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return TEMPLE_BACKGROUNDS[0].id;
};

export const setStoredBackgroundId = (id: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent('kavadi-bg-changed', { detail: id }));
  } catch {
    // Ignore storage errors
  }
};
