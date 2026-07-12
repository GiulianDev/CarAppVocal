import { pipeline, env, type PipelineType } from '@xenova/transformers';

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models/';

class PipelineSingleton {
    static task: PipelineType = 'zero-shot-classification';
    static model = 'nli-deberta-v3-small';
    static instance: any = null;

    static async getInstance(progress_callback: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { 
                progress_callback,
                local_files_only: true 
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { text, type } = event.data;

    if (type === 'preload') {
        try {
            await PipelineSingleton.getInstance((x: any) => {
                self.postMessage({ status: 'progress', data: x });
            });
            self.postMessage({ status: 'ready', message: 'Modello caricato' });
        } catch (error: any) {
            self.postMessage({ status: 'error', error: error.message });
        }
        return;
    }

    if (type === 'process') {
        try {
            self.postMessage({ status: 'loading', message: 'Inizializzazione IA in corso...' });
            const classifier = await PipelineSingleton.getInstance((x: any) => {
                self.postMessage({ status: 'progress', data: x });
            });
            self.postMessage({ status: 'processing', message: 'Analisi della frase...' });

            // Etichette ottimizzate per una migliore distinzione degli intenti
            const candidateLabels = [
                'salvare o confermare',
                'aggiungere un veicolo',
                'modificare la targa',
                'modificare il modello',
                'modificare la marca o costruttore',
                'annullare o azzerare',
                'andare al garage',
                'aggiungere evento di manutenzione',
                'visualizzare dettaglio evento'
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