import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function StatusMessage({ title, message }: { title: string; message: string }) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

