# CarAppVocal


la descrizione dei voice intent è in VoiceCommand/nlpService.ts

Abbiamo un app react + vite + capacitor.
L'app permette di gestire veicoli all'interno di un garage.
La pagina di aggiunta di un veicolo permette di aggiungere un veicolo. il form comprende 3 campi: targa modello e marca/costruttore. Esiste una lista da cui confrontare se il modello è esistente, altrimenti l'utente può comunue inserire liberamente il testo che vuole.
poi c'è la pagina con il garage, dove l'utente può eliminare l'auto aggiunta, e può decidere quale deve essere l'auto predefinita. infine c'è la pagina di aggiunta degli eventi. in cui l'utente inserisce dei generici eventi di manutenzione. 
Vogliamo implementare le funzionalità tramite comandi vocali.
L'utente può dire frasi tipo "aggiungi un panda" e l'app, guardando dalla lista, capisce che la marca/costruttore è "fiat"
L'utente però può anche aggiungere marche e modelli non in elenco, dicendo "aggiungi una krts swang" e il modello se non le trova in elenco magari chiede se è corretto quello che ha capito.
Inoltre se il modello capisce male l'utente deve poter dire "no è scritto male, si scrive con la i" o cose del genere. come conviene implementare queste funzionalita vocali? io vorrei un qualcosa tipo bot con cui l'utente può interagire.
per gli eventi ad esempio dice "oggi ho fatto il cambio dell'olio, ricordamelo tra 1 anno. ho speso 100 euro". come possiamo implementare queste funzionalità vocali? voglio qualcosa di abbastanza intelligente per poter interagire con l'utente in modo naturale, ma senza essere troppo pesante per poter girare su smartphone. dimmi cha soluzioni proponi e poi vediamo quale attuare.

deve essere tutto in locale. fai una ricerca approfondita in internet. dimmi come farebbe uno sviluppatore senior.

al momento ho implementato la registrazione così con npl. dimmi come farebbe uno sviluppatore senior

aspetta a modificare i file. prima devo accettare le modifiche. poi modifichiamo un file per volta. 

l'ide è che in base alla pagina dove ci troviamo l'app capisce già i possibili intenti. nella pagina di aggiunta di un veicolo può solo compilare il form e salvare o annullare o navigare verso altre pagine. se l'utente dice "aggiungi una panda" dobbiamo controllare che sia presente nel catalogo, e notiamo che corrisponde al costruttore fiat, quindi possiamo giua compilare il form. altrimente deve chiedere chiarimenti se ha capito bene il modello e qual'è il costruttore, o se quello che ha capito è il modello o il costruttore/marca. bisogna però gestire i casi in cui si trova nella pagina sbagliata, ad esempio se dice aggiungi una panda ma è nella pagina del garage allora deve prima essere rediretto nella pagina di aggiunta e poi il testo deve essere interpretato come funzionalità di aggiuntà di un veicolo.

Quali tecnologie useresti per implemetare i comandi vocali in modo che l'utente possa dialogare con l'app in modo naturale?



# COMANDI

- genera mappa
    uv run generate_map.py > ./PROJECT_MAP.md



- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npm run build
- npx cap sync
- npx cap open android

