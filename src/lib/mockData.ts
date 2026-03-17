// mock data for developer mode so we can preview the ui without a backend
import type { User, Hardware, Loan, LoanDetail } from "../types";

export const mockUsers: User[] = [
  { id: 1, name: "Alice Johnson", net_id: "aj123", student_number: "20210001" },
  { id: 2, name: "Bob Smith", net_id: "bs456", student_number: "20210002" },
  { id: 3, name: "Charlie Davis", net_id: "cd789", student_number: "20210003" },
  { id: 4, name: "Diana Lee", net_id: "dl012", student_number: "20210004" },
  { id: 5, name: "Ethan Brown", net_id: "eb345", student_number: "20210005" },
];

export const mockHardware: Hardware[] = [
  { id: 1, name: "Oscilloscope", serial_number: "SN-20260101-A1B2C3D4", asset_tag: "AT-A1B2C3", available: true },
  { id: 2, name: "Multimeter", serial_number: "SN-20260101-E5F6G7H8", asset_tag: "AT-E5F6G7", available: false },
  { id: 3, name: "Soldering Iron", serial_number: "SN-20260102-I9J0K1L2", asset_tag: "AT-I9J0K1", available: true },
  { id: 4, name: "Power Supply", serial_number: "SN-20260102-M3N4O5P6", asset_tag: "AT-M3N4O5", available: true },
  { id: 5, name: "Function Generator", serial_number: "SN-20260103-Q7R8S9T0", asset_tag: "AT-Q7R8S9", available: false },
  { id: 6, name: "Logic Analyzer", serial_number: "SN-20260103-U1V2W3X4", asset_tag: "AT-U1V2W3", available: true },
  { id: 7, name: "Arduino Kit", serial_number: "SN-20260104-Y5Z6A7B8", asset_tag: "AT-Y5Z6A7", available: true },
  { id: 8, name: "Breadboard Set", serial_number: "SN-20260104-C9D0E1F2", asset_tag: "AT-C9D0E1", available: false },
];

export const mockLoans: Loan[] = [
  {
    id: 1,
    loan_id: "LN-bs456-AT-E5F6G7-1710500000",
    net_id: "bs456",
    asset_tag: "AT-E5F6G7",
    rented_at: "2026-03-15T10:00:00Z",
    returned_at: null,
  },
  {
    id: 2,
    loan_id: "LN-cd789-AT-Q7R8S9-1710400000",
    net_id: "cd789",
    asset_tag: "AT-Q7R8S9",
    rented_at: "2026-03-14T14:30:00Z",
    returned_at: null,
  },
  {
    id: 3,
    loan_id: "LN-dl012-AT-C9D0E1-1710300000",
    net_id: "dl012",
    asset_tag: "AT-C9D0E1",
    rented_at: "2026-03-13T09:15:00Z",
    returned_at: null,
  },
  {
    id: 4,
    loan_id: "LN-aj123-AT-A1B2C3-1710100000",
    net_id: "aj123",
    asset_tag: "AT-A1B2C3",
    rented_at: "2026-03-10T11:00:00Z",
    returned_at: "2026-03-12T16:45:00Z",
  },
  {
    id: 5,
    loan_id: "LN-eb345-AT-M3N4O5-1710000000",
    net_id: "eb345",
    asset_tag: "AT-M3N4O5",
    rented_at: "2026-03-09T08:30:00Z",
    returned_at: "2026-03-11T10:00:00Z",
  },
];

export const mockLoanDetail: LoanDetail = {
  ...mockLoans[0],
  user: mockUsers[1],
  hardware: mockHardware[1],
};
