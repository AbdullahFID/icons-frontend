import { useRef, useEffect } from "react";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ScanInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// text input that works with barcode scanners (they act as keyboard input)
// auto-focuses so the scanner can type into it immediately
export default function ScanInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Scan or type here...",
  disabled = false,
  autoFocus = true,
}: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // keep focus on the input so scanner always types into it
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && value.trim()) {
      onSubmit();
    }
  }

  return (
    <div className="relative">
      <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("h-11 pl-11 pr-4 rounded-xl")}
      />
    </div>
  );
}
