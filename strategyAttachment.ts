import imageCompression from 'browser-image-compression';
import type { StrategyAttachmentInput } from './geminiService';

export const STRATEGY_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv';
export const MAX_STRATEGY_FILE_BYTES = Math.floor(2.5 * 1024 * 1024);
const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;

const allowedMimeTypes = new Set(STRATEGY_ATTACHMENT_ACCEPT.split(','));

export type PreparedStrategyAttachment = StrategyAttachmentInput & {
  size: number;
  previewUrl?: string;
};

export const validateStrategyAttachment = (file: Pick<File, 'name' | 'type' | 'size'>) => {
  if (!allowedMimeTypes.has(file.type)) {
    return 'JPG, PNG, WebP, PDF, TXT သို့မဟုတ် CSV file ကိုသာတင်နိုင်ပါတယ်။';
  }
  const limit = file.type.startsWith('image/') ? MAX_IMAGE_INPUT_BYTES : MAX_STRATEGY_FILE_BYTES;
  if (file.size > limit) {
    return file.type.startsWith('image/')
      ? 'Image file က 15MB ထက်ကြီးနေပါတယ်။ Smaller image နဲ့ပြန်စမ်းပါ။'
      : 'File က 2.5MB ထက်ကြီးနေပါတယ်။ Smaller file နဲ့ပြန်စမ်းပါ။';
  }
  return '';
};

const fileToBase64 = (file: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
  };
  reader.onerror = () => reject(new Error('File ကိုဖတ်လို့မရပါ။'));
  reader.readAsDataURL(file);
});

export const prepareStrategyAttachment = async (file: File): Promise<PreparedStrategyAttachment> => {
  const validationError = validateStrategyAttachment(file);
  if (validationError) throw new Error(validationError);

  let prepared: Blob = file;
  let mimeType = file.type;
  if (file.type.startsWith('image/')) {
    prepared = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.86,
    });
    mimeType = prepared.type || 'image/jpeg';
  }

  if (prepared.size > MAX_STRATEGY_FILE_BYTES) {
    throw new Error('ပြင်ဆင်ပြီး file က 2.5MB ထက်ကြီးနေသေးပါတယ်။ Smaller file နဲ့ပြန်စမ်းပါ။');
  }

  return {
    name: file.name.slice(0, 160),
    mimeType,
    data: await fileToBase64(prepared),
    size: prepared.size,
    previewUrl: mimeType.startsWith('image/') ? URL.createObjectURL(prepared) : undefined,
  };
};

export const releaseStrategyAttachment = (attachment?: PreparedStrategyAttachment | null) => {
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
};
