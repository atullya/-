export type Entry = {
  id: string;
  /** YYYY-MM-DD in the calendar identified by dateCalendar. */
  date: string;
  dateCalendar: 'ad' | 'bs';
  amount: number;
  /** Odometer reading in kilometres at the time of this fill-up. */
  meterReading: number | null;
  remarks: string;
};

export type Notebook = {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  entries: Entry[];
};

export type ServiceRecord = {
  id: string;
  date: string;
  price: number;
  meterReading: number | null;
  remarks: string;
};

export type StorageData = {
  notebooks: Notebook[];
};
