


L'Architettura dell'App

Ascolto (STT): Usiamo @capacitor-community/speech-recognition. Sfrutta il motore di Android, pesa zero MB, funziona offline e ci dà la stringa di testo (es. "Inserisci la targa AB123CD per la mia nuova Golf").

Comprensione (NLP.js): Passiamo la stringa al nostro motore NLP.js inizializzato dentro React.

Risultato: NLP.js capisce l'intento ("Aggiungi Veicolo") ed estrae le entità ("AB123CD" come targa, "Golf" come modello), restituendoti un JSON pulito

La Soluzione: Il Pattern "Pub/Sub" (Pubblica e Sottoscrivi)
Per ottenere quell'effetto magico in cui i campi si popolano da soli come se l'utente stesse digitando, dobbiamo invertire il controllo.

Il VoiceFab è il "Microfono Pubblico" (Publisher): Non sa in che pagina si trova e non gli interessa. Il suo unico lavoro è accendersi, ascoltare la voce, passare la stringa a NLP.js e gridare il risultato a tutta l'app (es. "Ehi! Ho un intento add_vehicle con targa AB123CD!").

La Pagina è l'"Ascoltatore Attivo" (Subscriber): Quando apri AddVehicleView, questa pagina "alza la mano" e si mette in ascolto di questi eventi. Quando sente che il microfono ha catturato un intento che la riguarda, prende i dati ed esegue i suoi setPlate(targa) e setBrand(brand).


- sistemare il voice fab
- capire se ha senso tenere un VoiceContext
- al click sul fab so potrebbe vere la location dall'url

-> l'interprete nlp deve sapere la location per capire che comandi aspettarsi