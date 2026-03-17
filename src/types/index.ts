// types that match the backend response shapes

export interface User {
  id: number;
  name: string;
  net_id: string;
  student_number: string;
}

export interface Hardware {
  id: number;
  name: string;
  serial_number: string;
  asset_tag: string;
  available: boolean;
}

export interface Loan {
  id: number;
  loan_id: string;
  net_id: string;
  asset_tag: string;
  rented_at: string;
  returned_at: string | null;
}

export interface LoanDetail extends Loan {
  user: User;
  hardware: Hardware;
}
