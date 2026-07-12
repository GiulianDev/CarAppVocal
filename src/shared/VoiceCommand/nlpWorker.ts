// src/shared/VoiceCommand/nlpWorker.ts
import { pipeline, env, type PipelineType } from '@xenova/transformers';

// Disabilita la ricerca di file locali su Node.js (fondamentale per il browser/Capacitor)
env.allowLocalModels = false;

class PipelineSingleton {
    // FIX TS: Diciamo esplicitamente a TypeScript che questa non è una stringa qualsiasi
    static task: PipelineType = 'zero-shot-classification';
    
    // Utilizziamo un modello multilingua ottimizzato per la comprensione del testo
    static model = 'Xenova/mdeberta-v3-base-tasksource-nli';
    static instance: any = null;

    static async getInstance(progress_callback: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Ascoltatore dei messaggi provenienti da React
self.addEventListener('message', async (event) => {
    const { text, type } = event.data;

    if (type === 'process') {
        try {
            self.postMessage({ status: 'loading', message: 'Inizializzazione IA in corso...' });

            const classifier = await PipelineSingleton.getInstance((x: any) => {
                self.postMessage({ status: 'progress', data: x });
            });

            self.postMessage({ status: 'processing', message: 'Analisi della frase...' });

            const candidateLabels = [
                'aggiungere un veicolo', 
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