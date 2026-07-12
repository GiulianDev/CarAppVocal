// src/shared/VoiceCommand/nlpWorker.ts
import { pipeline, env, type PipelineType } from '@xenova/transformers';

// 1. ABILITIAMO I MODELLI LOCALI: Nel browser/Capacitor non userà Node.js, 
// ma farà un fetch() verso l'indirizzo definito in localModelPath.
env.allowLocalModels = true;

// 2. DISABILITIAMO I MODELLI REMOTI: Blocchiamo totalmente Hugging Face (app offline).
env.allowRemoteModels = false;

// 3. IMPOSTIAMO IL PERCORSO: La cartella public/models/ di Vite.
env.localModelPath = '/models/';

class PipelineSingleton {
    static task: PipelineType = 'zero-shot-classification';
    static model = 'nli-deberta-v3-small';
    static instance: any = null;

    static async getInstance(progress_callback: Function) {
        if (this.instance === null) {
            // Avendo sbloccato allowLocalModels, ora possiamo (e dobbiamo) 
            // forzare la pipeline a usare solo i file locali.
            this.instance = await pipeline(this.task, this.model, { 
                progress_callback,
                local_files_only: true 
            });
        }
        return this.instance;
    }
}
// Ascoltatore dei messaggi provenienti da React
self.addEventListener('message', async (event) => {
    const { text, type } = event.data;

    if (type === 'preload') {
        try {
            // Avviamo il download/caricamento in memoria
            await PipelineSingleton.getInstance((x: any) => {
                self.postMessage({ status: 'progress', data: x });
            });
            self.postMessage({ status: 'ready', message: 'Modello caricato' });
        } catch (error: any) {
            self.postMessage({ status: 'error', error: error.message });
        }
        return; // Interrompiamo l'esecuzione qui
    }

    if (type === 'process') {
        try {
            self.postMessage({ status: 'loading', message: 'Inizializzazione IA in corso...' });

            const classifier = await PipelineSingleton.getInstance((x: any) => {
                self.postMessage({ status: 'progress', data: x });
            });

            self.postMessage({ status: 'processing', message: 'Analisi della frase...' });

            const candidateLabels = [
                'aggiungere un veicolo', 
                'modificare targa',
                'modificare modello',
                'modificare costruttore',
                'andare al garage', 
                'aggiungere evento di manutenzione', 
                'visualizzare dettaglio evento',
                'confermare',
                'annullare'
            ];

            const result = await classifier(text, candidateLabels, { multi_label: false });

            self.postMessage({ 
                status: 'complete', 
                intent: result.labels[0], 
                score: result.scores[0], 
                utterance: text
            });

        } catch (error: any) {
            self.postMessage({ status: 'error', error: error.message });
        }
    }
});