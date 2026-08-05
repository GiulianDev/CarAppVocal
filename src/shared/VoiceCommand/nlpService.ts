import type { WorkerCommand, WorkerResponse, VoiceAnalysisResult } from './types';

class NLPService {
  private worker: Worker | null = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('./sml.worker.ts', import.meta.url),
          { type: 'module' }
        );

        const handleInitResponse = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'READY') {
            this.isReady = true;
            console.log('🚀 [NLPService] Modello SML precaricato con successo!');
            this.worker?.removeEventListener('message', handleInitResponse);
            resolve();
          } else if (event.data.type === 'ERROR') {
            console.error('❌ [NLPService] Errore avvio worker:', event.data.payload.error);
            this.worker?.removeEventListener('message', handleInitResponse);
            reject(new Error(event.data.payload.error));
          }
        };

        this.worker.addEventListener('message', handleInitResponse);
        const initCmd: WorkerCommand = { type: 'INIT' };
        this.worker.postMessage(initCmd);
      } catch (err) {
        reject(err);
      }
    });

    return this.initPromise;
  }

  public analyzeText(text: string): Promise<VoiceAnalysisResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error('Worker non inizializzato.'));

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ANALYSIS_COMPLETE') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
        } else if (event.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', handleMessage);
          reject(new Error(event.data.payload.error));
        }
      };

      this.worker.addEventListener('message', handleMessage);
      const cmd: WorkerCommand = { type: 'ANALYZE', payload: { text } };
      this.worker.postMessage(cmd);
    });
  }

  public getIsReady(): boolean {
    return this.isReady;
  }
}

export const nlpService = new NLPService();