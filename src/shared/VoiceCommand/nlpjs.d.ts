// src/types/nlpjs.d.ts

declare module '@nlpjs/core' {
  export function containerBootstrap(settings?: any): Promise<any>;
}

declare module '@nlpjs/nlp' {
  export class Nlp {
    constructor(settings?: any);
    settings: any;
    addLanguage(lang: string): void;
    addNerRegexRule(lang: string, entity: string, regex: RegExp): void;
    addNerAfterCondition(lang: string, entity: string, condition: string): void;
    addDocument(lang: string, utterance: string, intent: string): void;
    train(): Promise<void>;
    process(lang: string, utterance: string): Promise<any>;
  }
}

declare module '@nlpjs/lang-it' {
  export class LangIt {}
}