export enum Status {
  Pending = 'Pending',
  Done = 'Done',
  Delayed = 'Delayed/Excused',
}

export interface Receipt {
  id: number;
  imageSrc: string;
  extractedText: string;
  orderDate: string; // YYYY-MM-DD or N/A
  daysPassed: number;
  daysLeft: number;
  status: Status;
  note: string;
  fileName: string;
}
