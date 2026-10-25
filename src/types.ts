export type Category =
  | 'meeting'
  | 'dating'
  | 'engagement'
  | 'wedding'
  | 'life-together'
  | 'family-friends';

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'meeting', label: 'Meeting' },
  { key: 'dating', label: 'Dating' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'life-together', label: 'Life together' },
  { key: 'family-friends', label: 'Family & friends' },
];

export interface EvidencePhoto {
  id: string;
  /** file:// URI of the copy stored inside the app's own storage */
  uri: string;
  width: number;
  height: number;
  /** ISO date (YYYY-MM-DD) taken from EXIF when available, else entered by the couple */
  date: string | null;
  dateSource: 'exif' | 'couple' | 'none';
  /** What the couple said was happening, in their own words */
  note: string;
  /** Final one-line caption shown on the exhibit page. Always couple-confirmed. */
  caption: string;
  category: Category | null;
  /** Manually confirmed for now; replaced by an on-device face check in the next step */
  bothSpousesVisible: boolean;
  captioned: boolean;
  /** Where the caption text came from. 'ai' means saved as suggested, 'ai-edited' means changed by the couple. */
  captionSource?: 'couple' | 'ai' | 'ai-edited';
  addedAt: string;
}
