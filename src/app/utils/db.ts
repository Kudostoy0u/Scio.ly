'use client';

import Dexie, { Table } from 'dexie';

export interface QuestionEntry {
  eventSlug: string;
  questions: any[];
  updatedAt: number;
}

export class ScioDatabase extends Dexie {
  questions!: Table<QuestionEntry, string>;

  constructor() {
    super('scio-offline');
    

    this.version(1).stores({
      questions: '&eventSlug, updatedAt'
    });
  }
}

export const db = new ScioDatabase();


