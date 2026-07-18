export type Entry = {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  amount: number;
  remarks: string;
};

export type Notebook = {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  entries: Entry[];
};

export type StorageData = {
  notebooks: Notebook[];
};
