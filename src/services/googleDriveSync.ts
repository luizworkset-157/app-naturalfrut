/**
 * Serviço de Sincronização Automática com o Google Drive
 * Mantém todos os dados do IEEI salvos em nuvem de forma contínua e segura.
 */

import { dataStorage } from './dataStorage';
import { getAccessToken, getCurrentGoogleUser, subscribeToAuth } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export type SyncStatus = 'disconnected' | 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  status: SyncStatus;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  lastSyncTime: string | null;
  lastError: string | null;
  autoSyncEnabled: boolean;
  folderName: string;
  folderId: string | null;
  latestFileId: string | null;
}

const FOLDER_NAME = 'IEEI Gestão - Backups';
const LATEST_BACKUP_NAME = 'ieei_backup_latest.json';
const AUTOSYNC_STORAGE_KEY = 'ieei_drive_autosync_active';
const LAST_SYNC_STORAGE_KEY = 'ieei_drive_last_sync_time';

class GoogleDriveSyncService {
  private status: SyncStatus = 'disconnected';
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private autoSyncEnabled: boolean = true;
  private folderId: string | null = null;
  private latestFileId: string | null = null;
  private debounceTimer: any = null;
  private listeners: Set<() => void> = new Set();
  private isSyncing = false;

  constructor() {
    // Restore persistent user preference for auto-sync
    const savedAutoSync = localStorage.getItem(AUTOSYNC_STORAGE_KEY);
    if (savedAutoSync !== null) {
      this.autoSyncEnabled = savedAutoSync === 'true';
    }
    this.lastSyncTime = localStorage.getItem(LAST_SYNC_STORAGE_KEY);

    // Subscribe to Google Auth changes
    subscribeToAuth((user, token) => {
      if (user && token) {
        if (this.status === 'disconnected') {
          this.status = 'idle';
          // Trigger initial sync check upon connection
          this.scheduleAutoSync(500);
        }
      } else {
        this.status = 'disconnected';
        this.folderId = null;
        this.latestFileId = null;
      }
      this.notify();
    });

    // Subscribe to dataStorage mutations to trigger automatic synchronization
    dataStorage.subscribe(() => {
      if (this.autoSyncEnabled && this.isConnected()) {
        this.scheduleAutoSync(2500); // 2.5s debounce to batch consecutive edits
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in DriveSync listener', err);
      }
    });
  }

  public isConnected(): boolean {
    return Boolean(getCurrentGoogleUser());
  }

  public getSyncState(): SyncState {
    const user = getCurrentGoogleUser();
    return {
      status: this.status,
      userEmail: user?.email || null,
      userName: user?.displayName || null,
      userPhoto: user?.photoURL || null,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
      autoSyncEnabled: this.autoSyncEnabled,
      folderName: FOLDER_NAME,
      folderId: this.folderId,
      latestFileId: this.latestFileId
    };
  }

  public setAutoSync(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    localStorage.setItem(AUTOSYNC_STORAGE_KEY, String(enabled));
    if (enabled && this.isConnected()) {
      this.scheduleAutoSync(300);
    }
    this.notify();
  }

  private scheduleAutoSync(delayMs: number = 2000) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.syncNow(false).catch((err) => {
        console.error('Auto-sync background error:', err);
      });
    }, delayMs);
  }

  /**
   * Locate or create the dedicated backup folder in Google Drive
   */
  private async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    if (this.folderId) return this.folderId;

    // Search for existing non-trashed folder with matching name
    const query = encodeURIComponent(
      `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Falha ao consultar pastas no Google Drive: ${err}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      this.folderId = data.files[0].id;
      return this.folderId!;
    }

    // Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta automatizada para sincronização e cópias de segurança do IEEI Gestão'
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Falha ao criar pasta de backup no Google Drive: ${err}`);
    }

    const folder = await createRes.json();
    this.folderId = folder.id;
    return this.folderId!;
  }

  /**
   * Search for the latest backup file in the folder
   */
  private async findLatestBackupFile(accessToken: string, folderId: string): Promise<string | null> {
    const query = encodeURIComponent(
      `name = '${LATEST_BACKUP_NAME}' and '${folderId}' in parents and trashed = false`
    );
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      this.latestFileId = data.files[0].id;
      return this.latestFileId;
    }
    return null;
  }

  /**
   * Sincroniza os dados locais imediatamente para o Google Drive
   */
  public async syncNow(createTimestampSnapshot: boolean = false): Promise<{ success: boolean; fileId: string }> {
    if (this.isSyncing) {
      return { success: true, fileId: this.latestFileId || '' };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      this.status = 'disconnected';
      this.notify();
      throw new Error('Conecte sua conta do Google para sincronizar os dados.');
    }

    this.isSyncing = true;
    this.status = 'syncing';
    this.lastError = null;
    this.notify();

    try {
      const folderId = await this.getOrCreateBackupFolder(accessToken);
      const fileId = await this.findLatestBackupFile(accessToken, folderId);
      const backupJson = dataStorage.exportFullBackupJSON();

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      let targetUrl = '';
      let method = 'POST';

      if (fileId) {
        // Update existing latest file
        targetUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      } else {
        // Create new file
        targetUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        method = 'POST';
      }

      const fileMetadata: any = {
        name: LATEST_BACKUP_NAME,
        mimeType: 'application/json',
        description: `Backup unificado do IEEI Gestão sincronizado em ${new Date().toLocaleString('pt-BR')}`
      };

      if (!fileId) {
        fileMetadata.parents = [folderId];
      }

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        backupJson +
        closeDelimiter;

      const uploadRes = await fetch(targetUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Falha no envio para o Google Drive: ${errText}`);
      }

      const uploadedData = await uploadRes.json();
      this.latestFileId = uploadedData.id;

      // Se solicitado snapshot com carimbo de data/hora (ex: backup manual ou fechamento)
      if (createTimestampSnapshot) {
        const snapName = `ieei_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const snapMetadata = {
          name: snapName,
          mimeType: 'application/json',
          parents: [folderId],
          description: `Snapshot histórico IEEI gerado manualmente em ${new Date().toLocaleString('pt-BR')}`
        };

        const snapBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(snapMetadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          backupJson +
          closeDelimiter;

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: snapBody
        });
      }

      const nowIso = new Date().toISOString();
      this.lastSyncTime = nowIso;
      this.status = 'synced';
      this.lastError = null;
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, nowIso);

      dataStorage.logAudit(
        'update',
        'GoogleDriveSync',
        this.latestFileId || 'ieei_backup_latest',
        `Sincronização com Google Drive concluída com sucesso na pasta "${FOLDER_NAME}".`
      );

      this.notify();
      return { success: true, fileId: this.latestFileId || '' };
    } catch (err: any) {
      console.error('Google Drive sync failure:', err);
      this.status = 'error';
      this.lastError = err.message || 'Erro desconhecido ao sincronizar com Google Drive';
      this.notify();
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Lista todos os backups disponíveis na pasta do Google Drive
   */
  public async listDriveBackups(): Promise<DriveFileItem[]> {
    const accessToken = await getAccessToken();
    if (!accessToken) return [];

    try {
      const folderId = await this.getOrCreateBackupFolder(accessToken);
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,size,createdTime,modifiedTime,webViewLink)`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error('Falha ao listar backups do Google Drive');
      }

      const data = await res.json();
      return data.files || [];
    } catch (err) {
      console.error('Error listing drive backups:', err);
      return [];
    }
  }

  /**
   * Baixa e restaura um backup diretamente do Google Drive
   */
  public async restoreBackupFromDrive(fileId: string): Promise<void> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Usuário não conectado ao Google.');
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Falha ao baixar backup do Google Drive: ${err}`);
    }

    const jsonText = await res.text();
    dataStorage.importBackupJSON(jsonText);

    this.lastSyncTime = new Date().toISOString();
    this.status = 'synced';
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, this.lastSyncTime);
    this.notify();
  }
}

export const googleDriveSync = new GoogleDriveSyncService();
