import { localFetch } from './ApiClient';
import { SystemModelStatus } from '../types';

export class ModelService {
  /**
   * Fetches status of all AI models and device memory
   */
  static async getStatus(): Promise<SystemModelStatus> {
    try {
      const res = await localFetch('/api/models/status');
      if (res.success) {
        return {
          whisper: res.models?.whisper || { ready: false, model_name: 'small' },
          indictrans2: res.models?.indictrans2 || { ready: false, backend: 'int8' },
          dhvaani: res.models?.dhvaani || { ready: false, device: 'cpu' },
          memory: res.memory || {
            process_rss_mb: 0,
            system_available_mb: 0,
            system_percent_used: 0,
          },
          installed: res.installed || {
            whisper: true,
            indictrans2_int8: true,
            indictrans2_320m: true,
            dhvaani: true,
            all_installed: true,
          },
          ready_for_inference: res.ready_for_inference ?? true,
        };
      }
    } catch (e) {
      console.warn('Could not fetch model status:', e);
    }

    return {
      whisper: { ready: false, model_name: 'small' },
      indictrans2: { ready: false, backend: 'int8' },
      dhvaani: { ready: false, device: 'cpu' },
      memory: { process_rss_mb: 0, system_available_mb: 0, system_percent_used: 0 },
      installed: {
        whisper: true,
        indictrans2_int8: true,
        indictrans2_320m: true,
        dhvaani: true,
        all_installed: true,
      },
      ready_for_inference: false,
    };
  }

  /**
   * Unloads all models from device memory to free RAM
   */
  static async unloadModels(): Promise<boolean> {
    try {
      const res = await localFetch('/api/models/unload', { method: 'POST' });
      return res.success;
    } catch {
      return false;
    }
  }
}
