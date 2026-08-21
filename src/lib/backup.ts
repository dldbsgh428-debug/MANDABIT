/**
 * 백업/복원. 데이터를 JSON 파일로 내보내고 다시 읽어온다.
 *
 * 기기 안에만 저장되는 앱이라 백업이 유일한 안전장치다.
 * 그래서 내보내기는 공유 시트로 넘겨 사용자가 원하는 곳(카톡, 드라이브 등)에
 * 직접 보관하게 한다.
 */

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppData } from '../types';
import { today } from './date';
import { parseBackup } from '../store/storage';

/** 백업 파일명: habitus-backup-2026-08-17.json */
function backupFileName(): string {
  return `habitus-backup-${today()}.json`;
}

export interface ExportResult {
  /** 공유 시트를 띄웠는지. 공유를 못 쓰는 기기에서는 파일 경로만 돌려준다. */
  shared: boolean;
  uri: string;
}

/** 현재 데이터를 JSON 파일로 저장하고 공유 시트를 띄운다. */
export async function exportBackup(data: AppData): Promise<ExportResult> {
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'HABITUS 백업 저장',
      UTI: 'public.json',
    });
    return { shared: true, uri: file.uri };
  }
  return { shared: false, uri: file.uri };
}

/**
 * 백업 파일을 골라 읽어온다.
 * 사용자가 선택을 취소하면 null을 돌려준다(에러가 아니다).
 */
export async function importBackup(): Promise<AppData | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    // 안드로이드 일부 파일앱이 JSON에 다른 MIME을 붙이는 경우가 있어 넉넉히 받는다.
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (picked.canceled || picked.assets.length === 0) return null;

  const asset = picked.assets[0];
  const text = await new File(asset.uri).text();
  return parseBackup(text);
}
